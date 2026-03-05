<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class MessageController
{
    private $db;
    private const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    private const DELETE_WINDOW = 60; // seconds - both sender & receiver can delete within this window

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function send()
    {
        $this->ensureAuth();
        // Handle multipart/form-data or JSON
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents("php://input"), true);
        }
        else {
            $data = $_POST;
        }

        // Debug logging
        error_log("Send Request Data: " . print_r($data, true));
        error_log("Files: " . print_r($_FILES, true));

        $sender_id = $_SESSION['user_id'];
        $recipient_id = $data['to_user_id'] ?? null;
        $subject = $data['subject'] ?? null;
        $body = $data['body'] ?? null;

        if (!$recipient_id || !$subject || !$body) {
            http_response_code(400);
            echo json_encode(['error' => 'Recipient, subject, and body are required']);
            return;
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("INSERT INTO messages (sender_id, current_owner_id, subject, body, current_status) VALUES (?, ?, ?, ?, 'sent')");
            $stmt->execute([$sender_id, $recipient_id, $subject, $body]);
            $msg_id = $this->db->lastInsertId();

            // Handle Attachments
            if (!empty($_FILES['attachment']['name'])) {
                // 5MB limit
                if ($_FILES['attachment']['size'] > self::MAX_FILE_SIZE) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode(['error' => 'File size exceeds 5MB limit']);
                    return;
                }

                if ($_FILES['attachment']['error'] !== UPLOAD_ERR_OK) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode(['error' => 'File upload error']);
                    return;
                }

                $fileData = file_get_contents($_FILES['attachment']['tmp_name']);
                $fileName = $_FILES['attachment']['name'];
                $mimeType = $_FILES['attachment']['type'] ?: 'application/octet-stream';
                $fileSize = $_FILES['attachment']['size'];

                $stmt = $this->db->prepare(
                    "INSERT INTO attachments (message_id, filename, mime_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)"
                );
                $stmt->execute([$msg_id, $fileName, $mimeType, $fileSize, $fileData]);
            }

            // Log it
            $logStmt = $this->db->prepare("INSERT INTO workflow_logs (message_id, previous_owner_id, new_owner_id, action_type) VALUES (?, ?, ?, 'SENT')");
            $logStmt->execute([$msg_id, $sender_id, $recipient_id]);

            $this->db->commit();
            echo json_encode(['status' => 'success', 'message_id' => $msg_id]);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function show($id)
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $user_id = $_SESSION['user_id'];

        // Fetch the specific message (only if user is current owner or sender)
        // Fetch the specific message
        // Allow access if:
        // 1. User is Sender
        // 2. User is Current Owner
        // 3. User was a Previous Owner (exists in workflow_logs)
        // 4. User is an Admin (optional, but good for support)

        $role = $_SESSION['role'] ?? '';

        $sql = "
            SELECT m.*, u.name as sender_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE m.message_id = ? 
            AND (
                ? = 'admin'
                OR m.sender_id = ? 
                OR m.current_owner_id = ?
                OR EXISTS (SELECT 1 FROM workflow_logs wl WHERE wl.message_id = m.message_id AND (wl.previous_owner_id = ? OR wl.new_owner_id = ?))
            )
        ";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([$id, $role, $user_id, $user_id, $user_id, $user_id]);
        $message = $stmt->fetch();

        if (!$message) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found or access denied']);
            return;
        }

        // Mark as read if user is the current owner
        if ($message['current_owner_id'] == $user_id && !$message['is_read']) {
            $readStmt = $this->db->prepare("UPDATE messages SET is_read = TRUE WHERE message_id = ?");
            $readStmt->execute([$id]);
            $message['is_read'] = 1;
        }

        // Fetch attachments (exclude file_data blob from listing)
        $attStmt = $this->db->prepare(
            "SELECT attachment_id, message_id, filename, file_path, mime_type, file_size, uploaded_at FROM attachments WHERE message_id = ?"
        );
        $attStmt->execute([$id]);
        $message['attachments'] = $attStmt->fetchAll();

        // Fetch workflow logs
        $logStmt = $this->db->prepare("
            SELECT wl.*, 
                   prev.name as previous_owner_name, 
                   nw.name as new_owner_name
            FROM workflow_logs wl 
            LEFT JOIN users prev ON wl.previous_owner_id = prev.user_id 
            LEFT JOIN users nw ON wl.new_owner_id = nw.user_id 
            WHERE wl.message_id = ? 
            ORDER BY wl.timestamp ASC
        ");
        $logStmt->execute([$id]);
        $message['workflow_logs'] = $logStmt->fetchAll();

        echo json_encode($message);
    }

    // Serve an attachment file from the database
    public function serveAttachment($id)
    {
        $this->ensureAuth();
        $user_id = $_SESSION['user_id'];
        $role = $_SESSION['role'] ?? '';

        // Fetch the attachment with its file data
        $stmt = $this->db->prepare("
            SELECT a.*, m.sender_id, m.current_owner_id
            FROM attachments a
            JOIN messages m ON a.message_id = m.message_id
            WHERE a.attachment_id = ?
        ");
        $stmt->execute([$id]);
        $att = $stmt->fetch();

        if (!$att) {
            http_response_code(404);
            echo json_encode(['error' => 'Attachment not found']);
            return;
        }

        // Check access: user must be sender, current owner, admin, or in workflow
        $hasAccess = false;
        if ($role === 'admin') {
            $hasAccess = true;
        }
        elseif ($att['sender_id'] == $user_id || $att['current_owner_id'] == $user_id) {
            $hasAccess = true;
        }
        else {
            // Check workflow logs
            $logStmt = $this->db->prepare(
                "SELECT 1 FROM workflow_logs WHERE message_id = ? AND (previous_owner_id = ? OR new_owner_id = ?) LIMIT 1"
            );
            $logStmt->execute([$att['message_id'], $user_id, $user_id]);
            $hasAccess = (bool)$logStmt->fetch();
        }

        if (!$hasAccess) {
            http_response_code(403);
            echo json_encode(['error' => 'Access denied']);
            return;
        }

        // If file_data exists in DB, serve from DB
        if (!empty($att['file_data'])) {
            $mime = $att['mime_type'] ?: 'application/octet-stream';
            header('Content-Type: ' . $mime);
            header('Content-Length: ' . ($att['file_size'] ?: strlen($att['file_data'])));
            header('Content-Disposition: inline; filename="' . addslashes($att['filename']) . '"');
            header('Cache-Control: private, max-age=3600');
            echo $att['file_data'];
            return;
        }

        // Fallback: try filesystem (for legacy uploads)
        if (!empty($att['file_path'])) {
            $filePath = __DIR__ . '/../../public/' . $att['file_path'];
            if (file_exists($filePath)) {
                $mime = $att['mime_type'] ?: mime_content_type($filePath) ?: 'application/octet-stream';
                header('Content-Type: ' . $mime);
                header('Content-Length: ' . filesize($filePath));
                header('Content-Disposition: inline; filename="' . addslashes($att['filename']) . '"');
                readfile($filePath);
                return;
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'File data not found']);
    }

    public function inbox()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $user_id = $_SESSION['user_id'];

        // Fetch messages where user is current owner
        $stmt = $this->db->prepare("
            SELECT m.*, u.name as sender_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE m.current_owner_id = ? 
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
    }

    public function sent()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $user_id = $_SESSION['user_id'];

        // Fetch messages sent by this user
        $stmt = $this->db->prepare("
            SELECT m.*, 
                   u.name as sender_name,
                   owner.name as current_owner_name
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            JOIN users owner ON m.current_owner_id = owner.user_id
            WHERE m.sender_id = ? 
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
    }

    public function returnMessage()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $message_id = $data['message_id'] ?? null;
        $comment = $data['comment'] ?? '';

        if (!$message_id) {
            http_response_code(400);
            echo json_encode(['error' => 'message_id is required']);
            return;
        }

        $stmt = $this->db->prepare("SELECT * FROM messages WHERE message_id = ?");
        $stmt->execute([$message_id]);
        $msg = $stmt->fetch();

        if (!$msg) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found']);
            return;
        }

        if ($msg['current_owner_id'] != $_SESSION['user_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Not authorized']);
            return;
        }

        try {
            $this->db->beginTransaction();
            // Return to sender
            $new_owner = $msg['sender_id'];

            $update = $this->db->prepare("UPDATE messages SET current_owner_id = ?, current_status = 'returned' WHERE message_id = ?");
            $update->execute([$new_owner, $message_id]);

            $log = $this->db->prepare("INSERT INTO workflow_logs (message_id, previous_owner_id, new_owner_id, action_type, comment) VALUES (?, ?, ?, 'RETURNED', ?)");
            $log->execute([$message_id, $_SESSION['user_id'], $new_owner, $comment]);

            $this->db->commit();
            echo json_encode(['status' => 'returned']);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function forward()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $message_id = $data['message_id'] ?? null;
        $new_owner_id = $data['new_owner_id'] ?? null;
        $comment = $data['comment'] ?? '';

        if (!$message_id || !$new_owner_id) {
            http_response_code(400);
            echo json_encode(['error' => 'message_id and new_owner_id are required']);
            return;
        }

        $this->changeOwner($message_id, $new_owner_id, 'FORWARDED', $comment);
    }

    public function complete()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $message_id = $data['message_id'] ?? null;

        if (!$message_id) {
            http_response_code(400);
            echo json_encode(['error' => 'message_id is required']);
            return;
        }

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare("UPDATE messages SET current_status = 'completed' WHERE message_id = ? AND current_owner_id = ?");
            $stmt->execute([$message_id, $_SESSION['user_id']]);

            if ($stmt->rowCount() === 0) {
                $this->db->rollBack();
                http_response_code(403);
                echo json_encode(['error' => 'Not authorized or message not found']);
                return;
            }

            $log = $this->db->prepare("INSERT INTO workflow_logs (message_id, previous_owner_id, new_owner_id, action_type) VALUES (?, ?, ?, 'COMPLETED')");
            $log->execute([$message_id, $_SESSION['user_id'], $_SESSION['user_id']]);

            $this->db->commit();
            echo json_encode(['status' => 'completed']);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function returned()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $user_id = $_SESSION['user_id'];

        // Messages returned to me (I am the owner, status is 'returned')
        $stmt = $this->db->prepare("
            SELECT m.*, u.name as sender_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE m.current_owner_id = ? AND m.current_status = 'returned'
            ORDER BY m.updated_at DESC
        ");
        $stmt->execute([$user_id]);
        echo json_encode($stmt->fetchAll());
    }

    public function archives()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $user_id = $_SESSION['user_id'];

        // Messages involved in (sender or owner) that are completed
        $stmt = $this->db->prepare("
             SELECT m.*, u.name as sender_name 
            FROM messages m 
            JOIN users u ON m.sender_id = u.user_id 
            WHERE (m.sender_id = ? OR m.current_owner_id = ?) 
            AND m.current_status = 'completed'
            ORDER BY m.updated_at DESC
        ");
        $stmt->execute([$user_id, $user_id]);
        echo json_encode($stmt->fetchAll());
    }

    public function resubmit()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');

        // Support both JSON and FormData
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            $data = json_decode(file_get_contents("php://input"), true);
        }
        else {
            $data = $_POST;
        }

        $message_id = $data['message_id'] ?? null;
        $body = $data['body'] ?? '';

        if (!$message_id || !$body) {
            http_response_code(400);
            echo json_encode(['error' => 'message_id and body are required']);
            return;
        }

        // Verify ownership and status
        $stmt = $this->db->prepare("SELECT * FROM messages WHERE message_id = ?");
        $stmt->execute([$message_id]);
        $msg = $stmt->fetch();

        if (!$msg) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found']);
            return;
        }

        if ($msg['current_owner_id'] != $_SESSION['user_id'] || $msg['current_status'] != 'returned') {
            http_response_code(403);
            echo json_encode(['error' => 'Message is not in returned status or you are not the owner']);
            return;
        }

        // Find who returned it (last 'RETURNED' log)
        $logStmt = $this->db->prepare("
            SELECT previous_owner_id FROM workflow_logs 
            WHERE message_id = ? AND action_type = 'RETURNED' 
            ORDER BY timestamp DESC LIMIT 1
        ");
        $logStmt->execute([$message_id]);
        $lastReturn = $logStmt->fetch();

        if (!$lastReturn) {
            http_response_code(500);
            echo json_encode(['error' => 'Cannot find return history']);
            return;
        }

        $reviewer_id = $lastReturn['previous_owner_id'];

        try {
            $this->db->beginTransaction();

            $update = $this->db->prepare("
                UPDATE messages 
                SET body = ?, current_owner_id = ?, current_status = 'resent', is_read = FALSE
                WHERE message_id = ?
            ");
            $update->execute([$body, $reviewer_id, $message_id]);

            // Handle new attachments on resubmit
            if (!empty($_FILES['attachment']['name'])) {
                if ($_FILES['attachment']['size'] > self::MAX_FILE_SIZE) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode(['error' => 'File size exceeds 5MB limit']);
                    return;
                }

                if ($_FILES['attachment']['error'] !== UPLOAD_ERR_OK) {
                    $this->db->rollBack();
                    http_response_code(400);
                    echo json_encode(['error' => 'File upload error']);
                    return;
                }

                $fileData = file_get_contents($_FILES['attachment']['tmp_name']);
                $fileName = $_FILES['attachment']['name'];
                $mimeType = $_FILES['attachment']['type'] ?: 'application/octet-stream';
                $fileSize = $_FILES['attachment']['size'];

                $attStmt = $this->db->prepare(
                    "INSERT INTO attachments (message_id, filename, mime_type, file_size, file_data) VALUES (?, ?, ?, ?, ?)"
                );
                $attStmt->execute([$message_id, $fileName, $mimeType, $fileSize, $fileData]);
            }

            $log = $this->db->prepare("INSERT INTO workflow_logs (message_id, previous_owner_id, new_owner_id, action_type) VALUES (?, ?, ?, 'RESUBMITTED')");
            $log->execute([$message_id, $_SESSION['user_id'], $reviewer_id]);

            $this->db->commit();
            echo json_encode(['status' => 'resent']);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private function changeOwner($message_id, $new_owner_id, $action, $comment = '')
    {
        $stmt = $this->db->prepare("SELECT * FROM messages WHERE message_id = ?");
        $stmt->execute([$message_id]);
        $msg = $stmt->fetch();

        if (!$msg) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found']);
            return;
        }

        if ($msg['current_owner_id'] != $_SESSION['user_id']) {
            http_response_code(403);
            echo json_encode(['error' => 'Not authorized']);
            return;
        }

        try {
            $this->db->beginTransaction();

            $update = $this->db->prepare("UPDATE messages SET current_owner_id = ?, current_status = 'forwarded' WHERE message_id = ?");
            $update->execute([$new_owner_id, $message_id]);

            $log = $this->db->prepare("INSERT INTO workflow_logs (message_id, previous_owner_id, new_owner_id, action_type, comment) VALUES (?, ?, ?, ?, ?)");
            $log->execute([$message_id, $_SESSION['user_id'], $new_owner_id, $action, $comment]);

            $this->db->commit();
            echo json_encode(['status' => 'success']);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    // System logs for admin
    public function systemLogs()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');

        if (($_SESSION['role'] ?? '') !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            return;
        }

        $stmt = $this->db->prepare("
            SELECT wl.*, 
                   m.subject as message_subject,
                   m.current_status as message_status,
                   sender.name as sender_name,
                   prev.name as previous_owner_name, 
                   nw.name as new_owner_name
            FROM workflow_logs wl 
            JOIN messages m ON wl.message_id = m.message_id
            JOIN users sender ON m.sender_id = sender.user_id
            LEFT JOIN users prev ON wl.previous_owner_id = prev.user_id 
            LEFT JOIN users nw ON wl.new_owner_id = nw.user_id 
            ORDER BY wl.timestamp DESC
            LIMIT 200
        ");
        $stmt->execute();
        echo json_encode($stmt->fetchAll());
    }

    // Delete a message with time-based access control
    public function deleteMessage()
    {
        $this->ensureAuth();
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);
        $message_id = $data['message_id'] ?? null;

        if (!$message_id) {
            http_response_code(400);
            echo json_encode(['error' => 'message_id is required']);
            return;
        }

        $user_id = $_SESSION['user_id'];

        $stmt = $this->db->prepare("SELECT * FROM messages WHERE message_id = ?");
        $stmt->execute([$message_id]);
        $msg = $stmt->fetch();

        if (!$msg) {
            http_response_code(404);
            echo json_encode(['error' => 'Message not found']);
            return;
        }

        // Calculate seconds since message was sent
        $createdAt = strtotime($msg['created_at']);
        $elapsed = time() - $createdAt;
        $isSender = ($msg['sender_id'] == $user_id);
        $isReceiver = ($msg['current_owner_id'] == $user_id);

        // Within DELETE_WINDOW: both sender and receiver can delete
        // After DELETE_WINDOW: only sender can delete
        if ($elapsed <= self::DELETE_WINDOW) {
            if (!$isSender && !$isReceiver) {
                http_response_code(403);
                echo json_encode(['error' => 'Only the sender or receiver can delete this message']);
                return;
            }
        }
        else {
            if (!$isSender) {
                http_response_code(403);
                echo json_encode(['error' => 'Only the sender can delete messages after 1 minute']);
                return;
            }
        }

        try {
            $this->db->beginTransaction();

            // Delete workflow logs first (foreign key)
            $this->db->prepare("DELETE FROM workflow_logs WHERE message_id = ?")->execute([$message_id]);
            // Attachments cascade via ON DELETE CASCADE, but let's be explicit
            $this->db->prepare("DELETE FROM attachments WHERE message_id = ?")->execute([$message_id]);
            // Delete the message
            $this->db->prepare("DELETE FROM messages WHERE message_id = ?")->execute([$message_id]);

            $this->db->commit();
            echo json_encode(['status' => 'deleted']);
        }
        catch (\Exception $e) {
            $this->db->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private function ensureAuth()
    {
        if (!isset($_SESSION['user_id'])) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }
}