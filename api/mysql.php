<?php
/**
 * MySQL Database Connection for STI Archives
 * Optimized for X10Hosting deployment
 * 
 * This file provides MySQL database connectivity with automatic table creation
 * and JSON file storage as fallback
 */

// MySQL Configuration - These will be set from environment or X10Hosting cPanel
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
if (!defined('MYSQL_CHARSET')) {
    define('MYSQL_CHARSET', 'utf8mb4');
}

// Global MySQL connection variable
$mysql_conn = null;
$mysql_connected = false;
$mysql_using_fallback = false;

/**
 * Get MySQL connection
 */
function getMySQLConnection() {
    global $mysql_conn, $mysql_connected;
    
    if ($mysql_connected && $mysql_conn) {
        return $mysql_conn;
    }
    
    // Try to establish connection
    try {
        $dsn = "mysql:host=" . MYSQL_HOST . ";dbname=" . MYSQL_DATABASE . ";charset=" . MYSQL_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => false,
        ];
        
        $mysql_conn = new PDO($dsn, MYSQL_USERNAME, MYSQL_PASSWORD, $options);
        $mysql_connected = true;
        return $mysql_conn;
    } catch (PDOException $e) {
        error_log("MySQL Connection Error: " . $e->getMessage());
        $mysql_connected = false;
        return null;
    }
}

/**
 * Check if MySQL is connected
 */
function isMySQLConnected() {
    global $mysql_connected;
    return $mysql_connected;
}

/**
 * Get MySQL connection status
 */
function getMySQLStatus() {
    global $mysql_connected, $mysql_using_fallback;
    
    $status = [
        'connected' => $mysql_connected,
        'using_fallback' => $mysql_using_fallback,
        'host' => MYSQL_HOST,
        'database' => MYSQL_DATABASE
    ];
    
    if ($mysql_connected) {
        try {
            $conn = getMySQLConnection();
            $stmt = $conn->query("SELECT VERSION() as version");
            $result = $stmt->fetch();
            $status['mysql_version'] = $result['version'];
        } catch (Exception $e) {
            $status['error'] = $e->getMessage();
        }
    }
    
    return $status;
}

/**
 * Initialize MySQL database - create tables automatically
 */
function initMySQL() {
    global $mysql_connected, $mysql_using_fallback;
    
    // Try to connect
    $conn = getMySQLConnection();
    
    if (!$conn) {
        $mysql_using_fallback = true;
        return [
            'success' => false,
            'using_fallback' => true,
            'message' => 'MySQL connection failed, using JSON fallback'
        ];
    }
    
    try {
        // Create users table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` VARCHAR(50) UNIQUE NOT NULL,
                `email` VARCHAR(255) UNIQUE NOT NULL,
                `password` VARCHAR(255) NOT NULL,
                `fullname` VARCHAR(255) NOT NULL,
                `role` VARCHAR(50) DEFAULT 'user',
                `section` VARCHAR(100) DEFAULT '',
                `grade` VARCHAR(50) DEFAULT '',
                `strand` VARCHAR(100) DEFAULT '',
                `permissions` TEXT DEFAULT '',
                `access_level` VARCHAR(50) DEFAULT '',
                `isActive` TINYINT(1) DEFAULT 0,
                `banned` TINYINT(1) DEFAULT 0,
                `rejected` TINYINT(1) DEFAULT 0,
                `verified` TINYINT(1) DEFAULT 0,
                `type` VARCHAR(50) DEFAULT 'user',
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_email` (`email`),
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_role` (`role`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create activity_logs table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `activity_logs` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `activity_id` VARCHAR(50) UNIQUE NOT NULL,
                `user_id` VARCHAR(50) NOT NULL,
                `action` VARCHAR(100) NOT NULL,
                `details` TEXT DEFAULT '',
                `admin_role` VARCHAR(50) DEFAULT NULL,
                `target_user_id` VARCHAR(50) DEFAULT NULL,
                `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_action` (`action`),
                INDEX `idx_timestamp` (`timestamp`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create files table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `files` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `file_id` VARCHAR(50) UNIQUE NOT NULL,
                `filename` VARCHAR(255) NOT NULL,
                `original_name` VARCHAR(255) NOT NULL,
                `file_type` VARCHAR(50) DEFAULT 'pdf',
                `file_path` TEXT NOT NULL,
                `file_size` BIGINT DEFAULT 0,
                `category` VARCHAR(100) DEFAULT '',
                `title` VARCHAR(255) DEFAULT '',
                `description` TEXT DEFAULT '',
                `uploaded_by` VARCHAR(50) DEFAULT '',
                `is_public` TINYINT(1) DEFAULT 1,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_file_id` (`file_id`),
                INDEX `idx_category` (`category`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create user_uploads table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `user_uploads` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `upload_id` VARCHAR(50) UNIQUE NOT NULL,
                `user_id` VARCHAR(50) NOT NULL,
                `filename` VARCHAR(255) NOT NULL,
                `original_name` VARCHAR(255) NOT NULL,
                `file_type` VARCHAR(50) DEFAULT '',
                `file_path` TEXT NOT NULL,
                `file_size` BIGINT DEFAULT 0,
                `title` VARCHAR(255) DEFAULT '',
                `description` TEXT DEFAULT '',
                `status` VARCHAR(50) DEFAULT 'pending',
                `uploaded_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `reviewed_at` DATETIME DEFAULT NULL,
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create settings table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `settings` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `setting_key` VARCHAR(100) UNIQUE NOT NULL,
                `setting_value` TEXT DEFAULT '',
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create saved_articles table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `saved_articles` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `article_id` VARCHAR(100) NOT NULL,
                `title` VARCHAR(255) NOT NULL,
                `content` TEXT DEFAULT '',
                `url` TEXT DEFAULT '',
                `thumbnail` VARCHAR(500) DEFAULT '',
                `date_saved` DATE DEFAULT NULL,
                `user_id` VARCHAR(50) NOT NULL,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_article_id` (`article_id`),
                UNIQUE KEY `unique_user_article` (`user_id`, `article_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create search_history table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `search_history` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` VARCHAR(50) NOT NULL,
                `search_query` VARCHAR(255) NOT NULL,
                `timestamp` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_timestamp` (`timestamp`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create user_preferences table
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `user_preferences` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` VARCHAR(50) UNIQUE NOT NULL,
                `dark_mode` TINYINT(1) DEFAULT 0,
                `language` VARCHAR(20) DEFAULT 'en',
                `notifications` TINYINT(1) DEFAULT 1,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_user_id` (`user_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        // Create documents table for user-saved documents
        $conn->exec("
            CREATE TABLE IF NOT EXISTS `documents` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `doc_id` VARCHAR(50) UNIQUE NOT NULL,
                `user_id` VARCHAR(50) NOT NULL,
                `title` VARCHAR(255) NOT NULL,
                `content` TEXT DEFAULT '',
                `content_html` TEXT DEFAULT '',
                `paper_size` VARCHAR(20) DEFAULT 'letter',
                `is_sti_template` TINYINT(1) DEFAULT 0,
                `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX `idx_doc_id` (`doc_id`),
                INDEX `idx_user_id` (`user_id`),
                INDEX `idx_updated` (`updated_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ");
        
        $mysql_connected = true;
        $mysql_using_fallback = false;
        
        return [
            'success' => true,
            'using_fallback' => false,
            'message' => 'MySQL connected and tables created successfully'
        ];
        
    } catch (PDOException $e) {
        error_log("MySQL Table Creation Error: " . $e->getMessage());
        $mysql_using_fallback = true;
        
        return [
            'success' => false,
            'using_fallback' => true,
            'message' => 'MySQL table creation failed: ' . $e->getMessage()
        ];
    }
}

// ==================== USER DATABASE OPERATIONS ====================

/**
 * Get all users from MySQL
 */
function getMySQLUsers() {
    $conn = getMySQLConnection();
    if (!$conn) {
        return [];
    }
    
    try {
        $stmt = $conn->query("SELECT * FROM users ORDER BY created_at DESC");
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Error fetching users: " . $e->getMessage());
        return [];
    }
}

/**
 * Find user by email in MySQL
 */
function findMySQLUserByEmail($email) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return null;
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
        $stmt->execute([$email]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        error_log("Error finding user by email: " . $e->getMessage());
        return null;
    }
}

/**
 * Find user by user_id in MySQL
 */
function findMySQLUserById($userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return null;
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        error_log("Error finding user by ID: " . $e->getMessage());
        return null;
    }
}

/**
 * Add new user to MySQL
 */
function addMySQLUser($user) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO users (user_id, email, password, fullname, role, section, grade, strand, permissions, access_level, isActive, banned, rejected, verified, type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $user['user_id'],
            $user['email'],
            $user['password'],
            $user['fullname'],
            $user['role'] ?? 'user',
            $user['section'] ?? '',
            $user['grade'] ?? '',
            $user['strand'] ?? '',
            $user['permissions'] ?? '',
            $user['access_level'] ?? '',
            $user['isActive'] ?? 0,
            $user['banned'] ?? 0,
            $user['rejected'] ?? 0,
            $user['verified'] ?? 0,
            $user['type'] ?? 'user',
            $user['created_at'] ?? date('Y-m-d H:i:s'),
            $user['updated_at'] ?? date('Y-m-d H:i:s')
        ]);
        
        return ['success' => true, 'id' => $conn->lastInsertId()];
    } catch (PDOException $e) {
        error_log("Error adding user: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Update user in MySQL
 */
function updateMySQLUser($userId, $updates) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $fields = [];
        $values = [];
        
        foreach ($updates as $key => $value) {
            $fields[] = "`$key` = ?";
            $values[] = $value;
        }
        
        $values[] = $userId;
        
        $sql = "UPDATE users SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE user_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->execute($values);
        
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error updating user: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Delete user from MySQL
 */
function deleteMySQLUser($userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM users WHERE user_id = ?");
        $stmt->execute([$userId]);
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error deleting user: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// ==================== ACTIVITY LOG OPERATIONS ====================

/**
 * Log activity to MySQL
 */
function logMySQLActivity($userId, $action, $details = '', $adminRole = null, $targetUserId = null) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return null;
    }
    
    try {
        $activityId = 'activity_' . uniqid();
        
        $stmt = $conn->prepare("
            INSERT INTO activity_logs (activity_id, user_id, action, details, admin_role, target_user_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $activityId,
            $userId,
            $action,
            $details,
            $adminRole,
            $targetUserId
        ]);
        
        return [
            'id' => $activityId,
            'userId' => $userId,
            'action' => $action,
            'details' => $details,
            'adminRole' => $adminRole,
            'targetUserId' => $targetUserId,
            'timestamp' => date('c')
        ];
    } catch (PDOException $e) {
        error_log("Error logging activity: " . $e->getMessage());
        return null;
    }
}

/**
 * Get activity logs from MySQL
 */
function getMySQLActivityLogs($filters = []) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['activities' => [], 'total' => 0];
    }
    
    try {
        $where = [];
        $params = [];
        
        if (isset($filters['action']) && $filters['action']) {
            $where[] = "action = ?";
            $params[] = $filters['action'];
        }
        
        if (isset($filters['adminRole']) && $filters['adminRole']) {
            $where[] = "admin_role = ?";
            $params[] = $filters['adminRole'];
        }
        
        if (isset($filters['adminId']) && $filters['adminId']) {
            $where[] = "user_id = ?";
            $params[] = $filters['adminId'];
        }
        
        if (isset($filters['targetUserId']) && $filters['targetUserId']) {
            $where[] = "target_user_id = ?";
            $params[] = $filters['targetUserId'];
        }
        
        $sql = "SELECT * FROM activity_logs";
        if (!empty($where)) {
            $sql .= " WHERE " . implode(' AND ', $where);
        }
        $sql .= " ORDER BY timestamp DESC";
        
        $limit = $filters['limit'] ?? 50;
        $sql .= " LIMIT " . intval($limit);
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $activities = $stmt->fetchAll();
        
        // Convert to match JSON format
        $converted = [];
        foreach ($activities as $activity) {
            $converted[] = [
                'id' => $activity['activity_id'],
                'userId' => $activity['user_id'],
                'action' => $activity['action'],
                'details' => $activity['details'],
                'adminRole' => $activity['admin_role'],
                'targetUserId' => $activity['target_user_id'],
                'timestamp' => $activity['timestamp']
            ];
        }
        
        return [
            'activities' => $converted,
            'total' => count($converted)
        ];
    } catch (PDOException $e) {
        error_log("Error getting activity logs: " . $e->getMessage());
        return ['activities' => [], 'total' => 0];
    }
}

/**
 * Get activity log count from MySQL
 */
function getMySQLActivityLogCount() {
    $conn = getMySQLConnection();
    if (!$conn) {
        return 0;
    }
    
    try {
        $stmt = $conn->query("SELECT COUNT(*) as count FROM activity_logs");
        $result = $stmt->fetch();
        return intval($result['count']);
    } catch (PDOException $e) {
        error_log("Error getting activity count: " . $e->getMessage());
        return 0;
    }
}

// ==================== UNIFIED DATABASE FUNCTIONS ====================
// These functions try MySQL first, then fall back to JSON

/**
 * Check database connection status
 */
function checkDatabaseConnection() {
    $status = [
        'mysql' => getMySQLStatus(),
        'json_fallback' => true
    ];
    
    // Also check if JSON files exist
    $backendDir = dirname(__DIR__);
    $dataDir = $backendDir . DIRECTORY_SEPARATOR . 'data';
    $status['json_files'] = [
        'data_dir_exists' => is_dir($dataDir),
        'users_file_exists' => file_exists($dataDir . DIRECTORY_SEPARATOR . 'users.json')
    ];
    
    return $status;
}

/**
 * Get all users - tries MySQL first, then JSON fallback
 */
function getAllUsers() {
    if (isMySQLConnected()) {
        $users = getMySQLUsers();
        if (!empty($users)) {
            return $users;
        }
    }
    
    // Fallback to JSON
    return readJsonFile(USERS_FILE);
}

/**
 * Find user by email - tries MySQL first, then JSON fallback
 */
function findUserByEmailDB($email) {
    if (isMySQLConnected()) {
        $user = findMySQLUserByEmail($email);
        if ($user) {
            return $user;
        }
    }
    
    // Fallback to JSON
    return findUserByEmail($email);
}

/**
 * Find user by fullname - tries MySQL first, then JSON fallback
 */
function findUserByFullnameDB($fullname) {
    // For MySQL, we'd need to add this function
    // For now, just use JSON fallback
    return findUserByFullname($fullname);
}

/**
 * Find user by ID - tries MySQL first, then JSON fallback
 */
function findUserByIdDB($userId) {
    if (isMySQLConnected()) {
        $user = findMySQLUserById($userId);
        if ($user) {
            return $user;
        }
    }
    
    // Fallback to JSON
    $users = readJsonFile(USERS_FILE);
    foreach ($users as $user) {
        if (($user['user_id'] ?? $user['id'] ?? '') === $userId) {
            return $user;
        }
    }
    return null;
}

/**
 * Add new user - tries MySQL first, then JSON fallback
 */
function addUserDB($user) {
    if (isMySQLConnected()) {
        $result = addMySQLUser($user);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON
    $users = readJsonFile(USERS_FILE);
    $users[] = $user;
    writeJsonFile(USERS_FILE, $users);
    return ['success' => true, 'source' => 'json'];
}

/**
 * Update user - tries MySQL first, then JSON fallback
 */
function updateUserDB($userId, $updates) {
    if (isMySQLConnected()) {
        $result = updateMySQLUser($userId, $updates);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON
    $users = readJsonFile(USERS_FILE);
    foreach ($users as &$user) {
        if (($user['user_id'] ?? $user['id'] ?? '') === $userId) {
            $user = array_merge($user, $updates);
            $user['updated_at'] = date('c');
            break;
        }
    }
    writeJsonFile(USERS_FILE, $users);
    return ['success' => true, 'source' => 'json'];
}

/**
 * Delete user - tries MySQL first, then JSON fallback
 */
function deleteUserDB($userId) {
    if (isMySQLConnected()) {
        $result = deleteMySQLUser($userId);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON
    $users = readJsonFile(USERS_FILE);
    $users = array_values(array_filter($users, function($user) use ($userId) {
        return ($user['user_id'] ?? $user['id'] ?? '') !== $userId;
    }));
    writeJsonFile(USERS_FILE, $users);
    return ['success' => true, 'source' => 'json'];
}

/**
 * Save all users - tries MySQL first, then JSON fallback
 */
function saveUsersDB($users) {
    if (isMySQLConnected()) {
        // For full save, we need to sync - delete all and re-insert
        try {
            $conn = getMySQLConnection();
            $conn->exec("DELETE FROM users");
            
            foreach ($users as $user) {
                addMySQLUser($user);
            }
            return ['success' => true, 'source' => 'mysql'];
        } catch (Exception $e) {
            error_log("MySQL bulk save error: " . $e->getMessage());
        }
    }
    
    // Fallback to JSON
    writeJsonFile(USERS_FILE, $users);
    return ['success' => true, 'source' => 'json'];
}

/**
 * Log activity - tries MySQL first, then JSON fallback
 */
function logActivityDB($userId, $action, $details = '', $adminRole = null, $targetUserId = null) {
    if (isMySQLConnected()) {
        $activity = logMySQLActivity($userId, $action, $details, $adminRole, $targetUserId);
        if ($activity) {
            return $activity;
        }
    }
    
    // Fallback to JSON
    return logActivity($userId, $action, $details, $adminRole, $targetUserId);
}

/**
 * Get activity logs - tries MySQL first, then JSON fallback
 */
function getActivityLogsDB($filters = []) {
    if (isMySQLConnected()) {
        $result = getMySQLActivityLogs($filters);
        if (!empty($result['activities'])) {
            return $result;
        }
    }
    
    // Fallback to JSON
    return getActivityLogs($filters);
}

/**
 * Get activity log count - tries MySQL first, then JSON fallback
 */
function getActivityLogCountDB() {
    if (isMySQLConnected()) {
        $count = getMySQLActivityLogCount();
        if ($count > 0) {
            return $count;
        }
    }
    
    // Fallback to JSON
    return getActivityLogCount();
}

// ==================== SAVED ARTICLES OPERATIONS ====================

/**
 * Save an article to MySQL
 */
function saveMySQLArticle($article) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        // Check if already saved
        $stmt = $conn->prepare("SELECT id FROM saved_articles WHERE user_id = ? AND article_id = ?");
        $stmt->execute([$article['user_id'], $article['article_id']]);
        if ($stmt->fetch()) {
            return ['success' => false, 'error' => 'Article already saved'];
        }
        
        $stmt = $conn->prepare("
            INSERT INTO saved_articles (article_id, title, content, url, thumbnail, date_saved, user_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $article['article_id'],
            $article['title'],
            $article['content'] ?? '',
            $article['url'] ?? '',
            $article['thumbnail'] ?? '',
            $article['date_saved'] ?? date('Y-m-d'),
            $article['user_id']
        ]);
        
        return ['success' => true, 'id' => $conn->lastInsertId()];
    } catch (PDOException $e) {
        error_log("Error saving article: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Get all saved articles for a user from MySQL
 */
function getMySQLSavedArticles($userId, $limit = 50) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return [];
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM saved_articles WHERE user_id = ? ORDER BY created_at DESC LIMIT ?");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Error getting saved articles: " . $e->getMessage());
        return [];
    }
}

/**
 * Delete a saved article from MySQL
 */
function deleteMySQLSavedArticle($id, $userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM saved_articles WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error deleting saved article: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Check if article is saved by user
 */
function checkMySQLArticleSaved($articleId, $userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return false;
    }
    
    try {
        $stmt = $conn->prepare("SELECT id FROM saved_articles WHERE article_id = ? AND user_id = ?");
        $stmt->execute([$articleId, $userId]);
        return (bool)$stmt->fetch();
    } catch (PDOException $e) {
        error_log("Error checking saved article: " . $e->getMessage());
        return false;
    }
}

// ==================== SEARCH HISTORY OPERATIONS ====================

/**
 * Save search query to MySQL
 */
function saveMySQLSearchHistory($userId, $searchQuery) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO search_history (user_id, search_query, timestamp)
            VALUES (?, ?, NOW())
        ");
        
        $stmt->execute([$userId, $searchQuery]);
        
        return ['success' => true, 'id' => $conn->lastInsertId()];
    } catch (PDOException $e) {
        error_log("Error saving search history: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Get search history for a user from MySQL
 */
function getMySQLSearchHistory($userId, $limit = 20) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return [];
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM search_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?");
        $stmt->execute([$userId, $limit]);
        return $stmt->fetchAll();
    } catch (PDOException $e) {
        error_log("Error getting search history: " . $e->getMessage());
        return [];
    }
}

/**
 * Delete individual search from MySQL
 */
function deleteMySQLSearchHistory($id, $userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM search_history WHERE id = ? AND user_id = ?");
        $stmt->execute([$id, $userId]);
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error deleting search history: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Clear all search history for a user from MySQL
 */
function clearMySQLSearchHistory($userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM search_history WHERE user_id = ?");
        $stmt->execute([$userId]);
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error clearing search history: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// ==================== USER PREFERENCES OPERATIONS ====================

/**
 * Get user preferences from MySQL
 */
function getMySQLUserPreferences($userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return null;
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM user_preferences WHERE user_id = ?");
        $stmt->execute([$userId]);
        return $stmt->fetch() ?: null;
    } catch (PDOException $e) {
        error_log("Error getting user preferences: " . $e->getMessage());
        return null;
    }
}

/**
 * Update user preferences in MySQL
 */
function updateMySQLUserPreferences($userId, $preferences) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        // Check if preferences exist
        $stmt = $conn->prepare("SELECT id FROM user_preferences WHERE user_id = ?");
        $stmt->execute([$userId]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            // Update existing
            $fields = [];
            $values = [];
            
            foreach ($preferences as $key => $value) {
                $fields[] = "`$key` = ?";
                $values[] = $value;
            }
            
            $values[] = $userId;
            
            $sql = "UPDATE user_preferences SET " . implode(', ', $fields) . ", updated_at = NOW() WHERE user_id = ?";
            $stmt = $conn->prepare($sql);
            $stmt->execute($values);
        } else {
            // Insert new
            $stmt = $conn->prepare("
                INSERT INTO user_preferences (user_id, dark_mode, language, notifications, updated_at)
                VALUES (?, ?, ?, ?, NOW())
            ");
            
            $stmt->execute([
                $userId,
                $preferences['dark_mode'] ?? 0,
                $preferences['language'] ?? 'en',
                $preferences['notifications'] ?? 1
            ]);
        }
        
        return ['success' => true];
    } catch (PDOException $e) {
        error_log("Error updating user preferences: " . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// ==================== UNIFIED FUNCTIONS WITH JSON FALLBACK ====================

/**
 * Save article - tries MySQL first, then JSON fallback
 */
function saveArticleDB($article) {
    if (isMySQLConnected()) {
        $result = saveMySQLArticle($article);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return saveArticleFallback($article);
}

/**
 * Get saved articles - tries MySQL first, then JSON fallback
 */
function getSavedArticlesDB($userId, $limit = 50) {
    if (isMySQLConnected()) {
        $articles = getMySQLSavedArticles($userId, $limit);
        if (!empty($articles)) {
            return $articles;
        }
    }
    
    // Fallback to JSON file
    return getSavedArticlesFallback($userId, $limit);
}

/**
 * Delete saved article - tries MySQL first, then JSON fallback
 */
function deleteSavedArticleDB($id, $userId) {
    if (isMySQLConnected()) {
        $result = deleteMySQLSavedArticle($id, $userId);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return deleteSavedArticleFallback($id, $userId);
}

/**
 * Check if article is saved - tries MySQL first, then JSON fallback
 */
function checkArticleSavedDB($articleId, $userId) {
    if (isMySQLConnected()) {
        return checkMySQLArticleSaved($articleId, $userId);
    }
    
    // Fallback to JSON file
    return checkArticleSavedFallback($articleId, $userId);
}

/**
 * Save search history - tries MySQL first, then JSON fallback
 */
function saveSearchHistoryDB($userId, $searchQuery) {
    if (isMySQLConnected()) {
        $result = saveMySQLSearchHistory($userId, $searchQuery);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return saveSearchHistoryFallback($userId, $searchQuery);
}

/**
 * Get search history - tries MySQL first, then JSON fallback
 */
function getSearchHistoryDB($userId, $limit = 20) {
    if (isMySQLConnected()) {
        $history = getMySQLSearchHistory($userId, $limit);
        if (!empty($history)) {
            return $history;
        }
    }
    
    // Fallback to JSON file
    return getSearchHistoryFallback($userId, $limit);
}

/**
 * Delete search history item - tries MySQL first, then JSON fallback
 */
function deleteSearchHistoryDB($id, $userId) {
    if (isMySQLConnected()) {
        $result = deleteMySQLSearchHistory($id, $userId);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return deleteSearchHistoryFallback($id, $userId);
}

/**
 * Clear all search history - tries MySQL first, then JSON fallback
 */
function clearSearchHistoryDB($userId) {
    if (isMySQLConnected()) {
        $result = clearMySQLSearchHistory($userId);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return clearSearchHistoryFallback($userId);
}

/**
 * Get user preferences - tries MySQL first, then JSON fallback
 */
function getUserPreferencesDB($userId) {
    if (isMySQLConnected()) {
        $prefs = getMySQLUserPreferences($userId);
        if ($prefs) {
            return $prefs;
        }
    }
    
    // Fallback to JSON file
    return getUserPreferencesFallback($userId);
}

/**
 * Update user preferences - tries MySQL first, then JSON fallback
 */
function updateUserPreferencesDB($userId, $preferences) {
    if (isMySQLConnected()) {
        $result = updateMySQLUserPreferences($userId, $preferences);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return updateUserPreferencesFallback($userId, $preferences);
}

// ==================== JSON FALLBACK FUNCTIONS ====================

/**
 * Fallback: Save article to JSON file
 */
function saveArticleFallback($article) {
    $file = dirname(__DIR__) . '/data/saved_articles.json';
    $articles = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    
    if (!is_array($articles)) {
        $articles = [];
    }
    
    // Check if already saved
    foreach ($articles as $a) {
        if ($a['user_id'] === $article['user_id'] && $a['article_id'] === $article['article_id']) {
            return ['success' => false, 'error' => 'Article already saved'];
        }
    }
    
    $article['id'] = count($articles) + 1;
    $article['created_at'] = date('c');
    $articles[] = $article;
    
    file_put_contents($file, json_encode($articles, JSON_PRETTY_PRINT));
    return ['success' => true, 'id' => $article['id'], 'source' => 'json'];
}

/**
 * Fallback: Get saved articles from JSON file
 */
function getSavedArticlesFallback($userId, $limit = 50) {
    $file = dirname(__DIR__) . '/data/saved_articles.json';
    if (!file_exists($file)) {
        return [];
    }
    
    $articles = json_decode(file_get_contents($file), true);
    if (!is_array($articles)) {
        return [];
    }
    
    $userArticles = array_filter($articles, function($a) use ($userId) {
        return $a['user_id'] === $userId;
    });
    
    usort($userArticles, function($a, $b) {
        return strtotime($b['created_at'] ?? 0) - strtotime($a['created_at'] ?? 0);
    });
    
    return array_slice($userArticles, 0, $limit);
}

/**
 * Fallback: Delete saved article from JSON file
 */
function deleteSavedArticleFallback($id, $userId) {
    $file = dirname(__DIR__) . '/data/saved_articles.json';
    if (!file_exists($file)) {
        return ['success' => false, 'error' => 'No saved articles'];
    }
    
    $articles = json_decode(file_get_contents($file), true);
    if (!is_array($articles)) {
        return ['success' => false, 'error' => 'Invalid data'];
    }
    
    $articles = array_values(array_filter($articles, function($a) use ($id, $userId) {
        return !($a['id'] == $id && $a['user_id'] === $userId);
    }));
    
    file_put_contents($file, json_encode($articles, JSON_PRETTY_PRINT));
    return ['success' => true];
}

/**
 * Fallback: Check if article is saved from JSON file
 */
function checkArticleSavedFallback($articleId, $userId) {
    $file = dirname(__DIR__) . '/data/saved_articles.json';
    if (!file_exists($file)) {
        return false;
    }
    
    $articles = json_decode(file_get_contents($file), true);
    if (!is_array($articles)) {
        return false;
    }
    
    foreach ($articles as $a) {
        if ($a['article_id'] === $articleId && $a['user_id'] === $userId) {
            return true;
        }
    }
    
    return false;
}

/**
 * Fallback: Save search history to JSON file
 */
function saveSearchHistoryFallback($userId, $searchQuery) {
    $file = dirname(__DIR__) . '/data/search_history.json';
    $history = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    
    if (!is_array($history)) {
        $history = [];
    }
    
    $entry = [
        'id' => count($history) + 1,
        'user_id' => $userId,
        'search_query' => $searchQuery,
        'timestamp' => date('c')
    ];
    
    $history[] = $entry;
    file_put_contents($file, json_encode($history, JSON_PRETTY_PRINT));
    return ['success' => true, 'id' => $entry['id'], 'source' => 'json'];
}

/**
 * Fallback: Get search history from JSON file
 */
function getSearchHistoryFallback($userId, $limit = 20) {
    $file = dirname(__DIR__) . '/data/search_history.json';
    if (!file_exists($file)) {
        return [];
    }
    
    $history = json_decode(file_get_contents($file), true);
    if (!is_array($history)) {
        return [];
    }
    
    $userHistory = array_filter($history, function($h) use ($userId) {
        return $h['user_id'] === $userId;
    });
    
    usort($userHistory, function($a, $b) {
        return strtotime($b['timestamp'] ?? 0) - strtotime($a['timestamp'] ?? 0);
    });
    
    return array_slice($userHistory, 0, $limit);
}

/**
 * Fallback: Delete search history item from JSON file
 */
function deleteSearchHistoryFallback($id, $userId) {
    $file = dirname(__DIR__) . '/data/search_history.json';
    if (!file_exists($file)) {
        return ['success' => false, 'error' => 'No search history'];
    }
    
    $history = json_decode(file_get_contents($file), true);
    if (!is_array($history)) {
        return ['success' => false, 'error' => 'Invalid data'];
    }
    
    $history = array_values(array_filter($history, function($h) use ($id, $userId) {
        return !($h['id'] == $id && $h['user_id'] === $userId);
    }));
    
    file_put_contents($file, json_encode($history, JSON_PRETTY_PRINT));
    return ['success' => true];
}

/**
 * Fallback: Clear all search history from JSON file
 */
function clearSearchHistoryFallback($userId) {
    $file = dirname(__DIR__) . '/data/search_history.json';
    if (!file_exists($file)) {
        return ['success' => true];
    }
    
    $history = json_decode(file_get_contents($file), true);
    if (!is_array($history)) {
        return ['success' => true];
    }
    
    $history = array_values(array_filter($history, function($h) use ($userId) {
        return $h['user_id'] !== $userId;
    }));
    
    file_put_contents($file, json_encode($history, JSON_PRETTY_PRINT));
    return ['success' => true];
}

/**
 * Fallback: Get user preferences from JSON file
 */
function getUserPreferencesFallback($userId) {
    $file = dirname(__DIR__) . '/data/user_preferences.json';
    if (!file_exists($file)) {
        return [
            'user_id' => $userId,
            'dark_mode' => 0,
            'language' => 'en',
            'notifications' => 1
        ];
    }
    
    $prefs = json_decode(file_get_contents($file), true);
    if (!is_array($prefs)) {
        return [
            'user_id' => $userId,
            'dark_mode' => 0,
            'language' => 'en',
            'notifications' => 1
        ];
    }
    
    foreach ($prefs as $p) {
        if ($p['user_id'] === $userId) {
            return $p;
        }
    }
    
    return [
        'user_id' => $userId,
        'dark_mode' => 0,
        'language' => 'en',
        'notifications' => 1
    ];
}

/**
 * Fallback: Update user preferences in JSON file
 */
function updateUserPreferencesFallback($userId, $preferences) {
    $file = dirname(__DIR__) . '/data/user_preferences.json';
    $prefs = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    
    if (!is_array($prefs)) {
        $prefs = [];
    }
    
    $found = false;
    foreach ($prefs as &$p) {
        if ($p['user_id'] === $userId) {
            $p = array_merge($p, $preferences);
            $p['updated_at'] = date('c');
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $prefs[] = array_merge([
            'user_id' => $userId,
            'id' => count($prefs) + 1,
            'updated_at' => date('c')
        ], $preferences);
    }
    
    file_put_contents($file, json_encode($prefs, JSON_PRETTY_PRINT));
    return ['success' => true];
}

// ==================== DOCUMENTS OPERATIONS ====================

/**
 * Save document to MySQL
 */
function saveMySQLDocument($document) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        // Check if document already exists
        $stmt = $conn->prepare("SELECT id FROM documents WHERE doc_id = ?");
        $stmt->execute([$document['doc_id']]);
        $exists = $stmt->fetch();
        
        if ($exists) {
            // Update existing document
            $stmt = $conn->prepare("
                UPDATE documents SET 
                    title = ?, content = ?, content_html = ?, 
                    paper_size = ?, is_sti_template = ?, updated_at = NOW()
                WHERE doc_id = ?
            ");
            $stmt->execute([
                $document['title'],
                $document['content'] ?? '',
                $document['content_html'] ?? '',
                $document['paper_size'] ?? 'letter',
                $document['is_sti_template'] ?? 0,
                $document['doc_id']
            ]);
            return ['success' => true, 'doc_id' => $document['doc_id'], 'source' => 'mysql'];
        } else {
            // Insert new document
            $stmt = $conn->prepare("
                INSERT INTO documents (doc_id, user_id, title, content, content_html, paper_size, is_sti_template, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
            ");
            $stmt->execute([
                $document['doc_id'],
                $document['user_id'],
                $document['title'],
                $document['content'] ?? '',
                $document['content_html'] ?? '',
                $document['paper_size'] ?? 'letter',
                $document['is_sti_template'] ?? 0
            ]);
            return ['success' => true, 'doc_id' => $document['doc_id'], 'source' => 'mysql'];
        }
    } catch (PDOException $e) {
        error_log('Error saving document: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Get all documents for a user from MySQL
 */
function getMySQLDocuments($userId, $limit = 50) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return [];
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?");
        $stmt->bindValue(1, $userId, PDO::PARAM_STR);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $documents = $stmt->fetchAll();
        
        // Convert to frontend format
        $converted = [];
        foreach ($documents as $doc) {
            $converted[] = [
                'id' => $doc['doc_id'],
                'doc_id' => $doc['doc_id'],
                'user_id' => $doc['user_id'],
                'title' => $doc['title'],
                'content' => $doc['content'],
                'content_html' => $doc['content_html'],
                'paper_size' => $doc['paper_size'],
                'is_sti_template' => $doc['is_sti_template'],
                'lastModified' => $doc['updated_at'],
                'date' => $doc['created_at'],
                'created_at' => $doc['created_at'],
                'updated_at' => $doc['updated_at']
            ];
        }
        return $converted;
    } catch (PDOException $e) {
        error_log('Error getting documents: ' . $e->getMessage());
        return [];
    }
}

/**
 * Get a single document by ID from MySQL
 */
function getMySQLDocumentById($docId, $userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return null;
    }
    
    try {
        $stmt = $conn->prepare("SELECT * FROM documents WHERE doc_id = ? AND user_id = ?");
        $stmt->execute([$docId, $userId]);
        $doc = $stmt->fetch();
        
        if ($doc) {
            return [
                'id' => $doc['doc_id'],
                'doc_id' => $doc['doc_id'],
                'user_id' => $doc['user_id'],
                'title' => $doc['title'],
                'content' => $doc['content'],
                'content_html' => $doc['content_html'],
                'paper_size' => $doc['paper_size'],
                'is_sti_template' => $doc['is_sti_template'],
                'lastModified' => $doc['updated_at'],
                'date' => $doc['created_at'],
                'created_at' => $doc['created_at'],
                'updated_at' => $doc['updated_at']
            ];
        }
        return null;
    } catch (PDOException $e) {
        error_log('Error getting document: ' . $e->getMessage());
        return null;
    }
}

/**
 * Delete document from MySQL
 */
function deleteMySQLDocument($docId, $userId) {
    $conn = getMySQLConnection();
    if (!$conn) {
        return ['success' => false, 'error' => 'MySQL not connected'];
    }
    
    try {
        $stmt = $conn->prepare("DELETE FROM documents WHERE doc_id = ? AND user_id = ?");
        $stmt->execute([$docId, $userId]);
        return ['success' => true];
    } catch (PDOException $e) {
        error_log('Error deleting document: ' . $e->getMessage());
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

// ==================== UNIFIED DOCUMENT FUNCTIONS ====================

/**
 * Save document - tries MySQL first, then JSON fallback
 */
function saveDocumentDB($document) {
    if (isMySQLConnected()) {
        $result = saveMySQLDocument($document);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return saveDocumentFallback($document);
}

/**
 * Get all documents for a user - tries MySQL first, then JSON fallback
 */
function getDocumentsDB($userId, $limit = 50) {
    if (isMySQLConnected()) {
        $documents = getMySQLDocuments($userId, $limit);
        if (!empty($documents)) {
            return $documents;
        }
    }
    
    // Fallback to JSON file
    return getDocumentsFallback($userId, $limit);
}

/**
 * Get a single document by ID - tries MySQL first, then JSON fallback
 */
function getDocumentByIdDB($docId, $userId) {
    if (isMySQLConnected()) {
        $doc = getMySQLDocumentById($docId, $userId);
        if ($doc) {
            return $doc;
        }
    }
    
    // Fallback to JSON file
    return getDocumentByIdFallback($docId, $userId);
}

/**
 * Delete document - tries MySQL first, then JSON fallback
 */
function deleteDocumentDB($docId, $userId) {
    if (isMySQLConnected()) {
        $result = deleteMySQLDocument($docId, $userId);
        if ($result['success']) {
            return $result;
        }
    }
    
    // Fallback to JSON file
    return deleteDocumentFallback($docId, $userId);
}

// ==================== DOCUMENTS JSON FALLBACK ====================

/**
 * Fallback: Save document to JSON file
 */
function saveDocumentFallback($document) {
    $file = dirname(__DIR__) . '/data/documents.json';
    $documents = file_exists($file) ? json_decode(file_get_contents($file), true) : [];
    
    if (!is_array($documents)) {
        $documents = [];
    }
    
    $found = false;
    foreach ($documents as &$doc) {
        if ($doc['doc_id'] === $document['doc_id']) {
            $doc = array_merge($doc, $document);
            $doc['updated_at'] = date('c');
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $document['created_at'] = date('c');
        $document['updated_at'] = date('c');
        $documents[] = $document;
    }
    
    file_put_contents($file, json_encode($documents, JSON_PRETTY_PRINT));
    return ['success' => true, 'doc_id' => $document['doc_id'], 'source' => 'json'];
}

/**
 * Fallback: Get documents from JSON file
 */
function getDocumentsFallback($userId, $limit = 50) {
    $file = dirname(__DIR__) . '/data/documents.json';
    if (!file_exists($file)) {
        return [];
    }
    
    $documents = json_decode(file_get_contents($file), true);
    if (!is_array($documents)) {
        return [];
    }
    
    $userDocs = array_filter($documents, function($d) use ($userId) {
        return $d['user_id'] === $userId;
    });
    
    usort($userDocs, function($a, $b) {
        return strtotime($b['updated_at'] ?? $b['lastModified'] ?? 0) - strtotime($a['updated_at'] ?? $a['lastModified'] ?? 0);
    });
    
    return array_slice($userDocs, 0, $limit);
}

/**
 * Fallback: Get document by ID from JSON file
 */
function getDocumentByIdFallback($docId, $userId) {
    $file = dirname(__DIR__) . '/data/documents.json';
    if (!file_exists($file)) {
        return null;
    }
    
    $documents = json_decode(file_get_contents($file), true);
    if (!is_array($documents)) {
        return null;
    }
    
    foreach ($documents as $doc) {
        if ($doc['doc_id'] === $docId && $doc['user_id'] === $userId) {
            return $doc;
        }
    }
    
    return null;
}

/**
 * Fallback: Delete document from JSON file
 */
function deleteDocumentFallback($docId, $userId) {
    $file = dirname(__DIR__) . '/data/documents.json';
    if (!file_exists($file)) {
        return ['success' => false, 'error' => 'Document not found'];
    }
    
    $documents = json_decode(file_get_contents($file), true);
    if (!is_array($documents)) {
        return ['success' => false, 'error' => 'Invalid data'];
    }
    
    $documents = array_values(array_filter($documents, function($d) use ($docId, $userId) {
        return !($d['doc_id'] === $docId && $d['user_id'] === $userId);
    }));
    
    file_put_contents($file, json_encode($documents, JSON_PRETTY_PRINT));
    return ['success' => true];
}
