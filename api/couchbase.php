<?php
/**
 * Couchbase Integration Module for PHP
 * Provides database operations using Couchbase Capella REST API
 * 
 * This module provides Couchbase connection and data operations using REST API
 */

// Couchbase configuration from environment
if (!defined('COUCHBASE_CONNECTION_STRING')) {
    define('COUCHBASE_CONNECTION_STRING', getenv('COUCHBASE_CONNECTION_STRING') ?: 'couchbases://cb.tainu6g-ogys-6sp.cloud.couchbase.com');
}
if (!defined('COUCHBASE_USERNAME')) {
    define('COUCHBASE_USERNAME', getenv('COUCHBASE_USERNAME') ?: 'STIstaff');
}
if (!defined('COUCHBASE_PASSWORD')) {
    define('COUCHBASE_PASSWORD', getenv('COUCHBASE_PASSWORD') ?: 'STIcollege@calamba1');
}
if (!defined('COUCHBASE_BUCKET')) {
    define('COUCHBASE_BUCKET', getenv('COUCHBASE_BUCKET') ?: 'stiarchives');
}

// Global Couchbase connection status
$couchbaseConnected = false;
$couchbaseError = null;

// Extract host from connection string for REST API
function getCouchbaseHost() {
    $connStr = COUCHBASE_CONNECTION_STRING;
    // Remove couchbase(s):// prefix
    $host = preg_replace('/^couchbases?:\/\//', '', $connStr);
    return 'https://' . $host;
}

/**
 * Make REST API request to Couchbase using stream context
 * Falls back to command-line curl if stream context fails
 */
function couchbaseRequest($endpoint, $method = 'GET', $body = null) {
    $host = getCouchbaseHost();
    $url = $host . $endpoint;
    
    // Build curl command
    $auth = base64_encode(COUCHBASE_USERNAME . ':' . COUCHBASE_PASSWORD);
    
    $curlCmd = sprintf(
        'curl -s -k -X %s -H "Content-Type: application/json" -H "Authorization: Basic %s"',
        $method,
        $auth
    );
    
    if ($body !== null) {
        $bodyJson = json_encode($body);
        $curlCmd .= sprintf(' -d "%s"', addslashes($bodyJson));
    }
    
    $curlCmd .= sprintf(' "%s"', $url);
    
    // Execute curl command
    $response = shell_exec($curlCmd);
    
    // Try stream context as fallback if curl fails
    if ($response === null || $response === false) {
        // Create SSL context with certificate verification disabled for development
        $context = [
            'http' => [
                'method' => $method,
                'header' => [
                    'Content-Type: application/json',
                    'Authorization: Basic ' . base64_encode(COUCHBASE_USERNAME . ':' . COUCHBASE_PASSWORD)
                ],
                'ignore_errors' => true,
                'follow_location' => 0,
                'timeout' => 30
            ],
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ];
        
        if ($body !== null) {
            $context['http']['content'] = json_encode($body);
        }
        
        $context = stream_context_create($context);
        $response = @file_get_contents($url, false, $context);
    }
    
    // Get HTTP response code
    $httpCode = 200;
    if ($response === false || $response === null) {
        $httpCode = 500;
    }
    
    return [
        'success' => $httpCode >= 200 && $httpCode < 300,
        'http_code' => $httpCode,
        'response' => json_decode($response, true),
        'raw_response' => $response,
        'error' => $response === false || $response === null ? 'Failed to connect to Couchbase' : null
    ];
}

/**
 * Initialize Couchbase connection
 */
function initCouchbase() {
    global $couchbaseConnected, $couchbaseError;
    
    try {
        // Test connection by getting cluster info
        $result = couchbaseRequest('/pools/default');
        
        if ($result['success']) {
            $couchbaseConnected = true;
            return [
                'success' => true,
                'message' => 'Connected to Couchbase Cloud Capella successfully',
                'using_fallback' => false
            ];
        } else {
            $couchbaseError = $result['error'] ?: 'Failed to connect to Couchbase';
            return [
                'success' => false,
                'error' => $couchbaseError,
                'using_fallback' => true
            ];
        }
    } catch (Exception $e) {
        $couchbaseError = $e->getMessage();
        return [
            'success' => false,
            'error' => $e->getMessage(),
            'using_fallback' => true
        ];
    }
}

// ==================== USER DOCUMENT FUNCTIONS ====================

// Document type constants
define('COUCHBASE_DOC_USERS', 'users');

/**
 * Get all users from Couchbase
 */
function getCouchbaseUsers() {
    $endpoint = '/pools/default/buckets/' . COUCHBASE_BUCKET . '/docs/' . COUCHBASE_DOC_USERS;
    $result = couchbaseRequest($endpoint, 'GET');
    
    if ($result['success'] && isset($result['response']['documents'])) {
        // Find the users document
        foreach ($result['response']['documents'] as $doc) {
            if ($doc['id'] === COUCHBASE_DOC_USERS) {
                $content = json_decode($doc['content'], true);
                return $content['users'] ?? [];
            }
        }
    }
    
    // If no users document exists, return empty array
    return [];
}

/**
 * Save users to Couchbase
 */
function saveCouchbaseUsers($users) {
    $endpoint = '/pools/default/buckets/' . COUCHBASE_BUCKET . '/docs/' . COUCHBASE_DOC_USERS;
    
    // First check if document exists
    $getResult = couchbaseRequest($endpoint, 'GET');
    
    $document = [
        'users' => $users,
        'userIds' => array_column($users, 'user_id'),
        'updated_at' => date('c')
    ];
    
    if ($getResult['success'] && isset($getResult['response']['documents'])) {
        // Document exists, use CAS for update
        $cas = null;
        foreach ($getResult['response']['documents'] as $doc) {
            if ($doc['id'] === COUCHBASE_DOC_USERS) {
                $cas = $doc['cas'];
                break;
            }
        }
        
        if ($cas) {
            // Update with CAS
            $result = couchbaseRequest($endpoint . '?cas=' . $cas, 'PUT', $document);
        } else {
            // Create new document
            $result = couchbaseRequest($endpoint, 'PUT', $document);
        }
    } else {
        // Create new document
        $result = couchbaseRequest($endpoint, 'PUT', $document);
    }
    
    return $result;
}

/**
 * Add a single user to Couchbase
 */
function addCouchbaseUser($newUser) {
    $users = getCouchbaseUsers();
    $users[] = $newUser;
    return saveCouchbaseUsers($users);
}

/**
 * Update a user in Couchbase
 */
function updateCouchbaseUser($userId, $updatedUser) {
    $users = getCouchbaseUsers();
    
    foreach ($users as &$user) {
        if (($user['user_id'] ?? $user['id'] ?? '') === $userId) {
            $user = array_merge($user, $updatedUser);
            $user['updated_at'] = date('c');
            return saveCouchbaseUsers($users);
        }
    }
    
    return ['success' => false, 'error' => 'User not found'];
}

/**
 * Delete a user from Couchbase
 */
function deleteCouchbaseUser($userId) {
    $users = getCouchbaseUsers();
    
    $originalCount = count($users);
    $users = array_values(array_filter($users, function($user) use ($userId) {
        return ($user['user_id'] ?? $user['id'] ?? '') !== $userId;
    }));
    
    if (count($users) < $originalCount) {
        return saveCouchbaseUsers($users);
    }
    
    return ['success' => false, 'error' => 'User not found'];
}

/**
 * Find user by email in Couchbase
 */
function findCouchbaseUserByEmail($email) {
    $users = getCouchbaseUsers();
    
    foreach ($users as $user) {
        if (isset($user['email']) && strtolower($user['email']) === strtolower($email)) {
            return $user;
        }
    }
    
    return null;
}

/**
 * Find user by fullname in Couchbase
 */
function findCouchbaseUserByFullname($fullname) {
    $users = getCouchbaseUsers();
    
    foreach ($users as $user) {
        if (isset($user['fullname']) && strtolower($user['fullname']) === strtolower($fullname)) {
            return $user;
        }
    }
    
    return null;
}

/**
 * Check if Couchbase is connected
 */
function isCouchbaseConnected() {
    global $couchbaseConnected;
    return $couchbaseConnected;
}

/**
 * Get Couchbase connection status
 */
function getCouchbaseStatus() {
    global $couchbaseConnected, $couchbaseError;
    
    if ($couchbaseConnected) {
        return [
            'status' => 'connected',
            'bucket' => COUCHBASE_BUCKET,
            'connection_string' => COUCHBASE_CONNECTION_STRING
        ];
    } else {
        return [
            'status' => 'disconnected',
            'message' => $couchbaseError ?: 'Not connected'
        ];
    }
}

/**
 * Initialize database (wrapper for compatibility)
 */
function initDatabase() {
    $result = initCouchbase();
    
    if ($result['using_fallback']) {
        // Initialize JSON file fallback
        $dataDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }
        
        $usersFile = $dataDir . DIRECTORY_SEPARATOR . 'users.json';
        if (!file_exists($usersFile)) {
            file_put_contents($usersFile, json_encode(['users' => [], 'userIds' => []], JSON_PRETTY_PRINT));
        }
        
        echo "✓ JSON file database initialized (Couchbase fallback)\n";
    } else {
        echo "✓ Couchbase Cloud Capella database connected\n";
    }
    
    return true;
}

/**
 * Check database connection health
 */
function checkDatabaseConnection() {
    $status = getCouchbaseStatus();
    
    if ($status['status'] === 'connected') {
        return [
            'status' => 'healthy',
            'message' => 'Couchbase Cloud Capella is connected',
            'database' => $status
        ];
    } else {
        return [
            'status' => 'healthy',
            'message' => 'Using JSON file fallback',
            'database' => [
                'status' => 'fallback',
                'type' => 'json'
            ]
        ];
    }
}
