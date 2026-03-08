<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Core\Router;

session_start();

// Handle CORS
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$router = new Router();

// Auth Routes
$router->add('POST', '/api/login', 'AuthController@login');
$router->add('POST', '/api/logout', 'AuthController@logout');
$router->add('GET', '/api/me', 'AuthController@me');
$router->add('GET', '/api/users', 'AuthController@listUsers');

// Message Routes
$router->add('POST', '/api/messages', 'MessageController@send');
$router->add('GET', '/api/messages/inbox', 'MessageController@inbox');
$router->add('GET', '/api/messages/sent', 'MessageController@sent');
$router->add('GET', '/api/messages/returned', 'MessageController@returned');
$router->add('GET', '/api/messages/archives', 'MessageController@archives');
$router->add('GET', '/api/messages/(\d+)', 'MessageController@show');
$router->add('POST', '/api/messages/return', 'MessageController@returnMessage');
$router->add('POST', '/api/messages/forward', 'MessageController@forward');
$router->add('POST', '/api/messages/complete', 'MessageController@complete');
$router->add('POST', '/api/messages/resubmit', 'MessageController@resubmit');
$router->add('POST', '/api/messages/delete', 'MessageController@deleteMessage');

// Attachment Routes
$router->add('GET', '/api/attachments/(\d+)', 'MessageController@serveAttachment');

// Admin Routes
$router->add('GET', '/api/system-logs', 'MessageController@systemLogs');
$router->add('GET', '/api/admin/users', 'AdminController@listUsers');
$router->add('POST', '/api/admin/users', 'AdminController@createUser');
$router->add('PUT', '/api/admin/users/(\d+)', 'AdminController@updateUser');
$router->add('DELETE', '/api/admin/users/(\d+)', 'AdminController@deleteUser');

// Dispatch
$router->dispatch($_SERVER['REQUEST_METHOD'], $_SERVER['REQUEST_URI']);