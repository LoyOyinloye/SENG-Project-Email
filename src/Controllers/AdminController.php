<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class AdminController extends MessageController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    private function ensureAdmin()
    {
        $this->ensureAuth(); // inherited from MessageController if we extend it, or just duplicate session check
        if (!isset($_SESSION['role']) || $_SESSION['role'] !== 'admin') {
            http_response_code(403);
            echo json_encode(['error' => 'Admin access required']);
            exit;
        }
    }

    public function ensureAuth()
    {
        if (!isset($_SESSION['user_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
    }

    public function listUsers()
    {
        $this->ensureAdmin();
        header('Content-Type: application/json');

        $stmt = $this->db->query("SELECT user_id, name, email, role, department_id, is_active FROM users ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }

    public function createUser()
    {
        $this->ensureAdmin();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents("php://input"), true);

        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';
        $role = $data['role'] ?? 'staff';
        $department_id = isset($data['department_id']) && $data['department_id'] !== '' ? $data['department_id'] : null;

        if (!$name || !$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Name, email, and password are required']);
            return;
        }

        // Check if email exists
        $stmt = $this->db->prepare("SELECT user_id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
            return;
        }

        $password_hash = password_hash($password, PASSWORD_DEFAULT);

        try {
            $stmt = $this->db->prepare("INSERT INTO users (name, email, password_hash, role, department_id) VALUES (?, ?, ?, ?, ?)");
            $stmt->execute([$name, $email, $password_hash, $role, $department_id]);
            $user_id = $this->db->lastInsertId();

            echo json_encode(['status' => 'success', 'user_id' => $user_id]);
        }
        catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    public function updateUser($id)
    {
        $this->ensureAdmin();
        header('Content-Type: application/json');

        $data = json_decode(file_get_contents("php://input"), true);

        $name = $data['name'] ?? null;
        $email = $data['email'] ?? null;
        $role = $data['role'] ?? null;
        $is_active = $data['is_active'] ?? null;
        $department_id = isset($data['department_id']) && $data['department_id'] !== '' ? $data['department_id'] : null;
        $password = $data['password'] ?? null;

        $updates = [];
        $params = [];

        if ($name !== null) {
            $updates[] = "name = ?";
            $params[] = $name;
        }
        if ($email !== null) {
            $updates[] = "email = ?";
            $params[] = $email;
        }
        if ($role !== null) {
            $updates[] = "role = ?";
            $params[] = $role;
        }
        if ($is_active !== null) {
            $updates[] = "is_active = ?";
            $params[] = $is_active ? 1 : 0;
        }
        // For department_id
        if (array_key_exists('department_id', $data)) {
            $updates[] = "department_id = ?";
            $params[] = $department_id;
        }
        if ($password) {
            $updates[] = "password_hash = ?";
            $params[] = password_hash($password, PASSWORD_DEFAULT);
        }

        if (empty($updates)) {
            echo json_encode(['status' => 'success', 'message' => 'No changes provided']);
            return;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE user_id = ?";

        try {
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            echo json_encode(['status' => 'success']);
        }
        catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }

    public function deleteUser($id)
    {
        $this->ensureAdmin();
        header('Content-Type: application/json');

        // Admin cannot delete themselves via this simple route ideally, but let's just do soft delete
        if ($id == $_SESSION['user_id']) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete your own account']);
            return;
        }

        try {
            $stmt = $this->db->prepare("UPDATE users SET is_active = FALSE WHERE user_id = ?");
            $stmt->execute([$id]);
            echo json_encode(['status' => 'success']);
        }
        catch (\Exception $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        }
    }
}