<?php
namespace App\Controllers;

use App\Config\Database;
use PDO;

class AuthController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::getInstance()->getConnection();
    }

    public function login()
    {
        header('Content-Type: application/json');
        $data = json_decode(file_get_contents("php://input"), true);

        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (!$email || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Email and password required']);
            return;
        }

        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['user_id'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['name'] = $user['name'];
            $_SESSION['email'] = $user['email'];

            echo json_encode(['message' => 'Login successful', 'user' => [
                    'id' => $user['user_id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role']
                ]]);
        }
        else {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid credentials']);
        }
    }

    public function logout()
    {
        header('Content-Type: application/json');
        session_destroy();
        echo json_encode(['message' => 'Logged out']);
    }

    public function me()
    {
        header('Content-Type: application/json');
        if (isset($_SESSION['user_id'])) {
            echo json_encode(['user' => [
                    'id' => $_SESSION['user_id'],
                    'name' => $_SESSION['name'],
                    'email' => $_SESSION['email'] ?? '',
                    'role' => $_SESSION['role']
                ]]);
        }
        else {
            http_response_code(401);
            echo json_encode(['error' => 'Not authenticated']);
        }
    }

    public function listUsers()
    {
        header('Content-Type: application/json');
        $stmt = $this->db->query("SELECT user_id, name, email, role, department_id FROM users ORDER BY name ASC");
        echo json_encode($stmt->fetchAll());
    }
}