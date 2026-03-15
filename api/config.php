<?php
/**
 * PHP Backend Configuration for STI Archives
 * Updated with MySQL database and Google Drive storage
 */

// Load MySQL connection and email service
require_once __DIR__ . '/mysql.php';
require_once __DIR__ . '/email_service.php';

// Load Google Drive if credentials exist (gdrive.php handles this gracefully)
if (file_exists(__DIR__ . '/gdrive.php')) {
    require_once __DIR__ . '/gdrive.php';
}

// Define GDrive constants if not already defined (in case gdrive.php didn't load)
if (!defined('GDrive_FOLDER_ID')) {
    define('GDrive_FOLDER_ID', '');
}
if (!defined('GDrive_CREDENTIALS')) {
    define('GDrive_CREDENTIALS', __DIR__ . '/gdrive-credentials.json');
}

// Load environment variables from .env file
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value);
            if (!getenv($key)) {
                putenv("$key=$value");
            }
        }
    }
}

// ==================== CONFIGURATION ====================

// Google Drive Configuration
if (!defined('GDrive_ENABLED')) {
    define('GDrive_ENABLED', file_exists(__DIR__ . '/gdrive-credentials.json'));
}
if (!defined('GDrive_FOLDER_ID')) {
    define('GDrive_FOLDER_ID', '1Oyif5qvEcjHOQKnokGV3IFHFQsfv8d08');
}
if (!defined('GDrive_CREDENTIALS')) {
    define('GDrive_CREDENTIALS', __DIR__ . '/gdrive-credentials.json');
}

// MySQL Configuration
if (!defined('MYSQL_HOST')) {
    define('MYSQL_HOST', getenv('MYSQL_HOST') ?: 'localhost');
}
if (!defined('MYSQL_DATABASE')) {
    define('MYSQL_DATABASE', getenv('MYSQL_DATABASE') ?: 'stiarchives_db');
}
if (!defined('MYSQL_USERNAME')) {
    define('MYSQL_USERNAME', getenv('MYSQL_USERNAME') ?: 'stiarchives_user');
}
if (!defined('MYSQL_PASSWORD')) {
    define('MYSQL_PASSWORD', getenv('MYSQL_PASSWORD') ?: 'STIcollege@2024');
}

// JWT Configuration
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'your-super-secret-jwt-key-change-this-in-production');
define('JWT_EXPIRY', '24h');

// Email Configuration
define('EMAIL_USER', getenv('EMAIL_USER') ?: 'stiarchivesorg@gmail.com');
define('EMAIL_PASS', getenv('EMAIL_PASS') ?: 'your-app-password');
define('SITE_URL', getenv('SITE_URL') ?: 'https://stiarchives.x10.mx');

// Database paths (for local storage fallback)
// Files are in same folder as config.php
define('ARTICLES_FILE', __DIR__ . DIRECTORY_SEPARATOR . 'articles.json');
$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';
define('DATA_DIR', $dataDir);
define('USERS_FILE', $dataDir . DIRECTORY_SEPARATOR . 'users.json');
define('ACTIVITY_FILE', $dataDir . DIRECTORY_SEPARATOR . 'activity_logs.json');
define('FILES_FILE', $dataDir . DIRECTORY_SEPARATOR . 'files.json');
define('USER_UPLOADS_FILE', $dataDir . DIRECTORY_SEPARATOR . 'user_uploads.json');

// Local uploads (fallback if GDrive not available)
$uploadsDir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
define('UPLOADS_DIR', $uploadsDir);
define('STUDIES_DIR', dirname(__DIR__) . DIRECTORY_SEPARATOR . 'Studies');

// ==================== INITIALIZATION ====================

// Initialize MySQL connection on startup
$mysqlResult = initMySQL();
if ($mysqlResult['using_fallback']) {
    // Ensure data directory exists
    if (!is_dir(DATA_DIR)) {
        mkdir(DATA_DIR, 0755, true);
    }
    
    // Initialize users file if not exists
    if (!file_exists(USERS_FILE)) {
        file_put_contents(USERS_FILE, json_encode(['users' => [], 'userIds' => []], JSON_PRETTY_PRINT));
    }
    
    // Initialize activity logs file if not exists
    if (!file_exists(ACTIVITY_FILE)) {
        file_put_contents(ACTIVITY_FILE, json_encode(['activities' => []], JSON_PRETTY_PRINT));
    }
    
    // Initialize files storage file if not exists
    if (!file_exists(FILES_FILE)) {
        file_put_contents(FILES_FILE, json_encode(['files' => []], JSON_PRETTY_PRINT));
    }
    
    // Initialize user uploads file if not exists
    if (!file_exists(USER_UPLOADS_FILE)) {
        file_put_contents(USER_UPLOADS_FILE, json_encode(['uploads' => []], JSON_PRETTY_PRINT));
    }
}

// Note: Admin user is not auto-created here.
// Use the registration endpoint to create admin users or add manually to users.json

// ==================== CORS HEADERS ====================

// Handle CORS for cross-origin requests
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Set content type to JSON
header('Content-Type: application/json; charset=utf-8');

// ==================== HELPER FUNCTIONS ====================

/**
 * Read JSON file with fallback handling
 */
function readJsonFile($file) {
    if (!file_exists($file)) {
        return [];
    }
    $content = file_get_contents($file);
    $data = json_decode($content, true) ?? [];
    
    // If it's a plain array, return it directly
    if (is_array($data) && isset($data[0]) && is_array($data[0])) {
        return $data;
    }
    
    // Handle nested structure (e.g., users.json has {"users": [...]})
    if (isset($data['users'])) {
        return $data['users'];
    }
    if (isset($data['articles'])) {
        return $data['articles'];
    }
    if (isset($data['activities'])) {
        return $data['activities'];
    }
    if (isset($data['files'])) {
        return $data['files'];
    }
    if (isset($data['uploads'])) {
        return $data['uploads'];
    }
    return $data;
}

/**
 * Write JSON file with proper structure
 */
function writeJsonFile($file, $data) {
    // Preserve structure for known files
    $filename = basename($file);
    
    if ($filename === 'users.json' && isset($data[0])) {
        // Array of users - wrap in structure
        $data = ['users' => $data, 'userIds' => array_column($data, 'user_id')];
    } elseif ($filename === 'activity_logs.json' && isset($data[0])) {
        $data = ['activities' => $data];
    } elseif ($filename === 'files.json') {
        if (!isset($data['files'])) {
            $data = ['files' => $data];
        }
    } elseif ($filename === 'user_uploads.json') {
        if (!isset($data['uploads'])) {
            $data = ['uploads' => $data];
        }
    }
    
    return file_put_contents($file, json_encode($data, JSON_PRETTY_PRINT));
}

/**
 * Initialize admin user if not exists
 */
function initializeAdminUser() {
    $users = readJsonFile(USERS_FILE);
    
    $adminExists = false;
    foreach ($users as $user) {
        if ($user['email'] === 'admin@clmb.sti.archives') {
            $adminExists = true;
            break;
        }
    }
    
    if (!$adminExists) {
        // Create admin user
        $adminUser = [
            'user_id' => 'admin-001',
            'email' => 'admin@clmb.sti.archives',
            'password' => password_hash('Admin@12345', PASSWORD_DEFAULT),
            'fullname' => 'STI Admin',
            'email' => 'admin@sti.edu.ph',
            'role' => 'admin',
            'isActive' => true,
            'type' => 'admin',
            'created_at' => date('c'),
            'updated_at' => date('c')
        ];
        
        $users[] = $adminUser;
        writeJsonFile(USERS_FILE, $users);
        
        echo "✓ Admin user created: admin@clmb.sti.archives\n";
    }
}

/**
 * Generate JWT token
 */
function generateJwt($userId, $role, $email = '') {
    $payload = [
        'userId' => $userId,
        'role' => $role,
        'email' => $email,
        'iat' => time(),
        'exp' => time() + (24 * 60 * 60) // 24 hours
    ];
    
    $encodedPayload = base64_encode(json_encode($payload));
    $signature = hash_hmac('sha256', $encodedPayload, JWT_SECRET);
    
    return $encodedPayload . '.' . $signature;
}

/**
 * Verify JWT token
 */
function verifyJwt($token) {
    $parts = explode('.', $token);
    
    if (count($parts) !== 2) {
        return null;
    }
    
    $payload = json_decode(base64_decode($parts[0]), true);
    
    if (!$payload || !isset($payload['exp']) || $payload['exp'] < time()) {
        return null;
    }
    
    $signature = hash_hmac('sha256', $parts[0], JWT_SECRET);
    
    if ($signature !== $parts[1]) {
        return null;
    }
    
    return $payload;
}

/**
 * Get Authorization header
 */
function getAuthHeader() {
    $headers = getallheaders();
    
    foreach ($headers as $key => $value) {
        if (strtolower($key) === 'authorization') {
            return $value;
        }
    }
    
    // Also check PHP_AUTH Apache
    if (isset($_SERVER['PHP_AUTH_USER'])) {
        return 'Bearer ' . $_SERVER['PHP_AUTH_USER'];
    }
    
    return null;
}

/**
 * Get current user from token
 */
function getCurrentUser() {
    $authHeader = getAuthHeader();
    
    if (!$authHeader) {
        return null;
    }
    
    // Handle "Bearer <token>" format
    if (str_starts_with($authHeader, 'Bearer ')) {
        $token = substr($authHeader, 7);
    } else {
        $token = $authHeader;
    }
    
    return verifyJwt($token);
}

/**
 * Require authentication
 */
function requireAuth() {
    $user = getCurrentUser();
    
    if (!$user) {
        errorResponse('Unauthorized - Invalid or missing token', 401);
    }
    
    return $user;
}

/**
 * Require admin role
 */
function requireAdmin() {
    $user = requireAuth();
    
    if ($user['role'] !== 'admin' && $user['role'] !== 'coadmin') {
        errorResponse('Forbidden - Admin access required', 403);
    }
    
    return $user;
}

/**
 * JSON response helper
 */
function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

/**
 * Success response helper
 */
function successResponse($data = null, $message = 'Success') {
    $response = [
        'status' => 'success',
        'message' => $message
    ];
    
    if ($data !== null) {
        $response = array_merge($response, $data);
    }
    
    jsonResponse($response);
}

/**
 * Error response helper
 */
function errorResponse($message, $statusCode = 400) {
    jsonResponse([
        'status' => 'error',
        'error' => $message
    ], $statusCode);
}

/**
 * Log activity
 */
function logActivity($userId, $action, $details = '', $adminRole = null, $targetUserId = null) {
    $activity = [
        'id' => uniqid('activity_'),
        'userId' => $userId,
        'action' => $action,
        'details' => $details,
        'adminRole' => $adminRole,
        'targetUserId' => $targetUserId,
        'timestamp' => date('c')
    ];
    
    $data = file_exists(ACTIVITY_FILE) ? json_decode(file_exists(ACTIVITY_FILE) ? file_get_contents(ACTIVITY_FILE) : '{"activities":[]}', true) : ['activities' => []];
    
    if (!isset($data['activities'])) {
        $data['activities'] = [];
    }
    
    $data['activities'][] = $activity;
    
    // Keep only last 1000 activities
    if (count($data['activities']) > 1000) {
        $data['activities'] = array_slice($data['activities'], -1000);
    }
    
    file_put_contents(ACTIVITY_FILE, json_encode($data, JSON_PRETTY_PRINT));
    
    return $activity;
}

/**
 * Get activity logs
 */
function getActivityLogs($filters = []) {
    $data = file_exists(ACTIVITY_FILE) ? json_decode(file_get_contents(ACTIVITY_FILE), true) : ['activities' => []];
    $activities = $data['activities'] ?? [];
    
    // Apply filters
    if (isset($filters['action']) && $filters['action']) {
        $activities = array_filter($activities, function($a) use ($filters) {
            return $a['action'] === $filters['action'];
        });
    }
    
    if (isset($filters['adminRole']) && $filters['adminRole']) {
        $activities = array_filter($activities, function($a) use ($filters) {
            return $a['adminRole'] === $filters['adminRole'];
        });
    }
    
    if (isset($filters['adminId']) && $filters['adminId']) {
        $activities = array_filter($activities, function($a) use ($filters) {
            return $a['userId'] === $filters['adminId'];
        });
    }
    
    if (isset($filters['targetUserId']) && $filters['targetUserId']) {
        $activities = array_filter($activities, function($a) use ($filters) {
            return $a['targetUserId'] === $filters['targetUserId'];
        });
    }
    
    // Sort by timestamp descending
    usort($activities, function($a, $b) {
        return strtotime($b['timestamp']) - strtotime($a['timestamp']);
    });
    
    $limit = $filters['limit'] ?? 50;
    $activities = array_slice($activities, 0, $limit);
    
    return [
        'activities' => array_values($activities),
        'total' => count($activities)
    ];
}

/**
 * Get activity log count
 */
function getActivityLogCount() {
    $data = file_exists(ACTIVITY_FILE) ? json_decode(file_get_contents(ACTIVITY_FILE), true) : ['activities' => []];
    return count($data['activities'] ?? []);
}

/**
 * Generate unique file ID (4 digits)
 */
function generateUniqueFileId() {
    $usedIds = [];
    
    // Get existing IDs from files
    $filesData = file_exists(FILES_FILE) ? json_decode(file_get_contents(FILES_FILE), true) : ['files' => []];
    $usedIds = array_keys($filesData['files'] ?? []);
    
    // Also check uploads directory
    if (is_dir(UPLOADS_DIR)) {
        $files = scandir(UPLOADS_DIR);
        foreach ($files as $file) {
            if (preg_match('/^(\d+)_/', $file, $matches)) {
                $usedIds[] = $matches[1];
            }
        }
    }
    
    // Generate unique 4-digit ID
    $maxAttempts = 10000;
    $attempts = 0;
    
    do {
        $newId = strval(rand(1000, 9999));
        $attempts++;
    } while (in_array($newId, $usedIds) && $attempts < $maxAttempts);
    
    if ($attempts >= $maxAttempts) {
        throw new Exception('Could not generate unique ID');
    }
    
    return $newId;
}

/**
 * Find PDF in Studies folder
 */
function findPDF($dir, $id) {
    if (!is_dir($dir)) {
        return null;
    }
    
    $files = scandir($dir);
    
    foreach ($files as $file) {
        if ($file === '.' || $file === '..') continue;
        
        $path = $dir . '/' . $file;
        
        if (is_dir($path)) {
            $result = findPDF($path, $id);
            if ($result) return $result;
        } elseif (str_starts_with($file, $id) && str_ends_with($file, '.pdf')) {
            return $path;
        }
    }
    
    return null;
}
