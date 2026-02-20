<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class MessageController
{
    private $db;

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
                $uploadDir = __DIR__ . '/../../public/uploads/';
                if (!is_dir($uploadDir))
                    mkdir($uploadDir, 0777, true);

                $fileName = time() . '_' . basename($_FILES['attachment']['name']);
                $targetPath = $uploadDir . $fileName;

                if (move_uploaded_file($_FILES['attachment']['tmp_name'], $targetPath)) {
                    $stmt = $this->db->prepare("INSERT INTO attachments (message_id, filename, file_path, mime_type) VALUES (?, ?, ?, ?)");
                    $stmt->execute([$msg_id, $_FILES['attachment']['name'], 'uploads/' . $fileName, $_FILES['attachment']['type']]);
                }
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

        // Also fetch attachments
        $attStmt = $this->db->prepare("SELECT * FROM attachments WHERE message_id = ?");
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
        $data = json_decode(file_get_contents("php://input"), true);
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