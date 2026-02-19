<?php
namespace App\Core;

class Router {
    private $routes = [];

    public function add($method, $path, $handler) {
        $this->routes[] = [
            'method' => $method,
            'path' => $path,
            'handler' => $handler
        ];
    }

    public function dispatch($method, $uri) {
        $uri = parse_url($uri, PHP_URL_PATH);
        
        foreach ($this->routes as $route) {
            if ($route['method'] === $method && preg_match("#^{$route['path']}$#", $uri, $matches)) {
                array_shift($matches); // Remove full match
                list($controllerName, $action) = explode('@', $route['handler']);
                
                $controllerClass = "App\\Controllers\\$controllerName";
                if (class_exists($controllerClass)) {
                    $controller = new $controllerClass();
                    return call_user_func_array([$controller, $action], $matches);
                } else {
                    http_response_code(500);
                    echo "Controller not found: $controllerClass";
                    return;
                }
            }
        }

        http_response_code(404);
        echo json_encode(['error' => 'Not Found']);
    }
}
