<?php
// Simple endpoint to serve users.json
header('Content-Type: application/json');
$usersFile = __DIR__ . '/data/users.json';
if (file_exists($usersFile)) {
    echo file_get_contents($usersFile);
} else {
    echo json_encode(['users' => [], 'error' => 'File not found']);
}
