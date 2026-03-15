<?php
/**
 * PHP Backend - Main Entry Point for STI Archives
 * Replaces Node.js server.js with PHP implementation
 * Uses MySQL database with JSON file fallback
 */

// CORS headers for mobile app support
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

// Google Drive support
if (file_exists(__DIR__ . '/gdrive.php')) {
    require_once __DIR__ . '/gdrive.php';
}

/**
 * Upload file - tries GDrive first, falls back to local
 */
function uploadFile($fileData, $filename, $uploadDir = null) {
    // Try Google Drive first if enabled
    if (isGDriveEnabled()) {
        $tempFile = sys_get_temp_dir() . '/' . $filename;
        $written = file_put_contents($tempFile, base64_decode($fileData));
        if ($written !== false) {
            $result = uploadToGDrive($tempFile, $filename);
            unlink($tempFile);
            if ($result['success']) {
                return ['success' => true, 'path' => $result['link'], 'type' => 'gdrive'];
            }
        }
    }
    
    // Fallback to local storage
    if ($uploadDir === null) {
        $uploadDir = UPLOADS_DIR;
    }
    
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }
    
    $fileId = time() . '_' . rand(1000, 9999);
    $newFilename = $fileId . '_' . $filename;
    $targetPath = $uploadDir . '/' . $newFilename;
    
    file_put_contents($targetPath, base64_decode($fileData));
    
    return ['success' => true, 'path' => '/uploads/' . $newFilename, 'type' => 'local'];
}

// Get the request method and URI
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove leading/trailing slashes
$uri = trim($uri, '/');

// Parse path segments
$segments = array_filter(explode('/', $uri));
$segments = array_values($segments);

// Route the request based on URI
switch (true) {
    // Health check
    case $uri === 'health':
    case $uri === 'api/health':
        healthCheck();
        break;
    
    // Debug endpoint - check database status
    case $uri === 'api/debug-db':
    case $uri === 'debug-db':
        debugDatabase();
        break;
    
    // Database status endpoints
    case $uri === 'api/mysql-status':
    case $uri === 'mysql-status':
        $status = getMySQLStatus();
        echo json_encode($status);
        break;
    
    // Couchbase status (legacy)
    case $uri === 'api/couchbase-status':
    case $uri === 'couchbase-status':
        $status = getCouchbaseStatus();
        echo json_encode($status);
        break;
    
    // Auth routes
    case $uri === 'api/auth/login':
    case $uri === 'api/auth/register':
    case $uri === 'signup_user':
        if ($method === 'POST') {
            handleAuth($method, $uri);
        }
        break;
    
    // Get users (public for admin page)
    case $uri === 'get_users':
    case $uri === 'api/users':
        if ($method === 'GET') {
            getUsers();
        }
        break;
    
    // User login (alternative endpoint)
    case $uri === 'api/auth/login':
        if ($method === 'POST') {
            login();
        }
        break;
    
    // Auth routes with parameters
    case strpos($uri, 'api/auth/approve-user/') === 0:
        $email = urldecode(str_replace('api/auth/approve-user/', '', $uri));
        approveUser($email);
        break;
    
    case strpos($uri, 'api/auth/reject-user/') === 0:
        $email = urldecode(str_replace('api/auth/reject-user/', '', $uri));
        rejectUser();
        break;
    
    case strpos($uri, 'api/auth/ban-user/') === 0:
        $email = urldecode(str_replace('api/auth/ban-user/', '', $uri));
        banUser();
        break;
    
    // Test email endpoint
    case $uri === 'api/test-email':
        testEmailEndpoint();
        break;
    
    // Activity routes
    case $uri === 'api/activity/log':
        if ($method === 'POST') {
            logActivityEndpoint();
        }
        break;
    
    case $uri === 'api/activity/logs':
        getActivityLogsEndpoint();
        break;
    
    case $uri === 'api/activity/count':
        getActivityCountEndpoint();
        break;
    
    // Article routes
    case $uri === 'api/articles':
    case $uri === 'get_articles':
        if ($method === 'GET') {
            getArticles();
        } elseif ($method === 'POST') {
            saveArticle();
        }
        break;
    
    case strpos($uri, 'api/articles/') === 0 && $method === 'GET':
        $id = str_replace('api/articles/', '', $uri);
        getArticle($id);
        break;
    
    case strpos($uri, 'api/articles/') === 0 && $method === 'PUT':
        $id = str_replace('api/articles/', '', $uri);
        updateArticle($id);
        break;
    
    case strpos($uri, 'api/articles/') === 0 && $method === 'DELETE':
        $id = str_replace('api/articles/', '', $uri);
        deleteArticle($id);
        break;
    
    case $uri === 'api/upload-article-pdf' && $method === 'POST':
        uploadArticlePDF();
        break;
    
    // Settings
    case $uri === 'api/settings':
        getSettings();
        break;
    
    // PDF endpoints
    case strpos($uri, 'api/pdf/') === 0:
        $id = str_replace('api/pdf/', '', $uri);
        servePDF($id);
        break;
    
    case $uri === 'api/studies-pdf':
        serveStudiesPDF();
        break;
    
    // File upload endpoints
    case $uri === 'api/pdf/upload':
        if ($method === 'POST') {
            uploadPDF();
        }
        break;
    
    case $uri === 'api/user/upload':
        if ($method === 'POST') {
            userUpload();
        }
        break;
    
    case strpos($uri, 'api/user/uploads/') === 0:
        $userId = str_replace('api/user/uploads/', '', $uri);
        getUserUploads($userId);
        break;
    
    case $uri === 'api/admin/user-uploads':
        getAllUserUploads();
        break;
    
    case strpos($uri, 'api/admin/user-upload/') === 0 && $method === 'PUT':
        $id = str_replace('api/admin/user-upload/', '', $uri);
        updateUserUpload($id);
        break;
    
    case strpos($uri, 'api/admin/user-upload/') === 0 && $method === 'DELETE':
        $id = str_replace('api/admin/user-upload/', '', $uri);
        deleteUserUpload($id);
        break;
    
    // Email sending endpoint
    case $uri === 'send_update_email':
        sendUpdateEmail();
        break;
    
    // User preferences
    case $uri === 'api/user/preferences':
        handlePreferences();
        break;
    
    // Editor content
    case $uri === 'api/editor/content':
        handleEditorContent();
        break;
    
    // Carousel endpoints
    case $uri === 'api/carousel':
        if ($method === 'GET') {
            getCarousel();
        } elseif ($method === 'POST') {
            addCarouselItem();
        }
        break;
    
    case strpos($uri, 'api/carousel/') === 0 && $method === 'PUT':
        $id = str_replace('api/carousel/', '', $uri);
        updateCarouselItem($id);
        break;
    
    case strpos($uri, 'api/carousel/') === 0 && $method === 'DELETE':
        $id = str_replace('api/carousel/', '', $uri);
        deleteCarouselItem($id);
        break;
    
    case $uri === 'api/carousel/upload-image' && $method === 'POST':
        uploadCarouselImage();
        break;
    
    // User verification check endpoint
    case strpos($uri, 'check_user_verification/') === 0 && $method === 'GET':
        $userId = str_replace('check_user_verification/', '', $uri);
        checkUserVerification($userId);
        break;
    
    // Remove user endpoint
    case $uri === 'remove_user' && $method === 'POST':
        removeUser();
        break;
    
    // Update user endpoint
    case $uri === 'update_user' && $method === 'POST':
        updateUser();
        break;
    
    // ========== SAVED ARTICLES ENDPOINTS ==========
    case $uri === 'api/saved-articles':
        if ($method === 'POST') {
            saveSavedArticle();
        } elseif ($method === 'GET') {
            getSavedArticles();
        }
        break;
    
    case strpos($uri, 'api/saved-articles/check') === 0:
        if ($method === 'GET') {
            checkArticleSaved();
        }
        break;
    
    case strpos($uri, 'api/saved-articles/') === 0 && $method === 'DELETE':
        $id = str_replace('api/saved-articles/', '', $uri);
        deleteSavedArticle($id);
        break;
    
    // ========== SEARCH HISTORY ENDPOINTS ==========
    case $uri === 'api/search-history':
        if ($method === 'POST') {
            saveSearchHistory();
        } elseif ($method === 'GET') {
            getSearchHistory();
        } elseif ($method === 'DELETE') {
            clearAllSearchHistory();
        }
        break;
    
    case strpos($uri, 'api/search-history/') === 0 && $method === 'DELETE':
        $id = str_replace('api/search-history/', '', $uri);
        deleteSearchHistory($id);
        break;
    
    // ========== USER PREFERENCES ENDPOINTS ==========
    case $uri === 'api/preferences':
        if ($method === 'GET') {
            getUserPreferences();
        } elseif ($method === 'PUT') {
            updateUserPreferences();
        }
        break;
    
    // ========== DOCUMENTS ENDPOINTS ==========
    case $uri === 'api/documents':
        if ($method === 'GET') {
            getDocuments();
        } elseif ($method === 'POST') {
            saveDocument();
        }
        break;
    
    case strpos($uri, 'api/documents/') === 0 && $method === 'GET':
        $docId = str_replace('api/documents/', '', $uri);
        getDocument($docId);
        break;
    
    case strpos($uri, 'api/documents/') === 0 && $method === 'PUT':
        $docId = str_replace('api/documents/', '', $uri);
        updateDocument($docId);
        break;
    
    case strpos($uri, 'api/documents/') === 0 && $method === 'DELETE':
        $docId = str_replace('api/documents/', '', $uri);
        deleteDocument($docId);
        break;
    
    default:
        errorResponse('Endpoint not found: ' . $uri, 404);
}

// ==================== HEALTH CHECK ====================

function healthCheck() {
    $dbStatus = checkDatabaseConnection();
    
    jsonResponse([
        'status' => 'ok',
        'timestamp' => date('c'),
        'database' => $dbStatus,
        'environment' => NODE_ENV
    ]);
}

function debugDatabase() {
    // Debug endpoint to check database paths and user data
    $usersFile = USERS_FILE;
    $usersExist = file_exists($usersFile);
    $usersContent = $usersExist ? file_get_contents($usersFile) : null;
    $usersData = $usersContent ? json_decode($usersContent, true) : null;
    $userCount = 0;
    $users = [];
    
    if ($usersData && isset($usersData['users'])) {
        $users = $usersData['users'];
        $userCount = count($users);
    } elseif (is_array($usersData)) {
        $users = $usersData;
        $userCount = count($users);
    }
    
    // Check for admin2 user
    $admin2Found = false;
    $admin2Data = null;
    foreach ($users as $user) {
        if (isset($user['email']) && strtolower($user['email']) === 'admin2@gmail.com') {
            $admin2Found = true;
            $admin2Data = $user;
            break;
        }
    }
    
    $dbStatus = checkDatabaseConnection();
    
    jsonResponse([
        'status' => 'debug',
        'timestamp' => date('c'),
        'paths' => [
            'users_file' => $usersFile,
            'users_file_exists' => $usersExist,
            'data_dir' => DATA_DIR
        ],
        'users' => [
            'count' => $userCount,
            'admin2_found' => $admin2Found,
            'admin2_data' => $admin2Data ? [
                'user_id' => $admin2Data['user_id'] ?? null,
                'email' => $admin2Data['email'] ?? null,
                'fullname' => $admin2Data['fullname'] ?? null,
                'role' => $admin2Data['role'] ?? null,
                'isActive' => $admin2Data['isActive'] ?? null,
                'has_password' => !empty($admin2Data['password'])
            ] : null
        ],
        'database' => $dbStatus
    ]);
}

// ==================== AUTHENTICATION ====================

function handleAuth($method, $uri) {
    if (strpos($uri, 'login') !== false) {
        login();
    } elseif (strpos($uri, 'register') !== false || $uri === 'signup_user') {
        register();
    } else {
        errorResponse('Auth endpoint not found', 404);
    }
}

function login() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Support both email and fullname for login
    $email = $input['email'] ?? '';
    $fullname = $input['fullname'] ?? '';
    $password = $input['password'] ?? '';
    
    if ((!$email && !$fullname) || !$password) {
        errorResponse('Email or fullname and password are required');
    }
    
    // Try to find user by email first, then by fullname
    $user = null;
    if ($email) {
        $user = findUserByEmail($email);
    }
    if (!$user && $fullname) {
        $user = findUserByFullname($fullname);
    }
    
    if (!$user) {
        errorResponse('Invalid credentials');
    }
    
    // Verify password
    if (!password_verify($password, $user['password'])) {
        errorResponse('Invalid credentials');
    }
    
    // Check if user is active
    if (isset($user['isActive']) && !$user['isActive']) {
        errorResponse('Your account is still pending admin approval. We\'ll email you once it\'s ready!', 403);
    }
    
    // Check if rejected
    if (isset($user['rejected']) && $user['rejected']) {
        errorResponse('Your account request has been declined. Please contact the administrator for more information.', 403);
    }
    
    // Generate token
    $token = generateJwt(
        $user['user_id'] ?? $user['id'] ?? uniqid(),
        $user['role'] ?? 'user',
        $user['email'] ?? ''
    );
    
    // Log activity
    $userId = $user['user_id'] ?? $user['id'] ?? '';
    logActivityDB($userId, 'login', 'User logged in');
    
    // Return user without password
    unset($user['password']);
    
    successResponse([
        'token' => $token,
        'user' => $user
    ], 'Login successful');
}

// Find user by fullname - helper function
function findUserByFullname($fullname) {
    // Try MySQL first if connected
    if (isMySQLConnected()) {
        $user = findUserByFullnameDB($fullname);
        if ($user) {
            return $user;
        }
    }
    
    // Fallback to JSON file
    $users = readJsonFile(USERS_FILE);
    foreach ($users as $user) {
        if (isset($user['fullname']) && strtolower($user['fullname']) === strtolower($fullname)) {
            return $user;
        }
    }
    return null;
}

// Find user by email - helper function
function findUserByEmail($email) {
    // Try MySQL first if connected
    if (isMySQLConnected()) {
        $user = findUserByEmailDB($email);
        if ($user) {
            return $user;
        }
    }
    
    // Fallback to JSON file
    $users = readJsonFile(USERS_FILE);
    foreach ($users as $user) {
        if (isset($user['email']) && strtolower($user['email']) === strtolower($email)) {
            return $user;
        }
    }
    return null;
}

function register() {
    // Support both JSON and FormData (multipart/form-data)
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    $name = '';
    $email = '';
    $password = '';
    $role = 'user';
    $section = '';
    $grade = '';
    
    if (strpos($contentType, 'application/json') !== false) {
        // JSON request
        $input = json_decode(file_get_contents('php://input'), true);
        $fullname = $input['fullname'] ?? $input['name'] ?? '';
        $email = $input['email'] ?? '';
        $password = $input['password'] ?? '';
        $role = $input['role'] ?? 'user';
        $section = $input['section'] ?? '';
        $grade = $input['grade'] ?? '';
    } else {
        // FormData request (multipart/form-data)
        $fullname = $_POST['fullname'] ?? $_POST['name'] ?? '';
        $email = $_POST['email'] ?? '';
        $password = $_POST['password'] ?? '';
        $role = $_POST['role'] ?? 'user';
        $section = $_POST['section'] ?? '';
        $grade = $_POST['grade'] ?? '';
    }
    
    // Validate - use fullname which is what we actually get from input
    if (!$fullname) {
        errorResponse('Name is required');
    }
    if (!$email) {
        errorResponse('Email is required');
    }
    if (!$password) {
        errorResponse('Password is required');
    }
    
    // Validate role
    $allowedRoles = ['user', 'admin', 'coadmin', 'subadmin', 'senior_high', 'college', 'teacher', 'educator'];
    if (!in_array($role, $allowedRoles)) {
        $role = 'user';
    }
    
    // Check if user exists
    $existingUser = findUserByEmail($email);
    if ($existingUser) {
        errorResponse('User already exists', 409);
    }
    
    // Hash password
    $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
    
    // Generate unique user_id
    $user_id = time() . '_' . rand(1000, 9999);
    
    // Only admins, coadmins, and subadmins should be auto-approved
    $isActive = ($role === 'admin' || $role === 'coadmin' || $role === 'subadmin');
    
    // Create new user
    $newUser = [
        'user_id' => $user_id,
        'email' => $email,
        'password' => $hashedPassword,
        'fullname' => $fullname,
        'role' => $role,
        'section' => $section,
        'grade' => $grade,
        'isActive' => $isActive,
        'type' => 'user',
        'created_at' => date('c'),
        'updated_at' => date('c')
    ];
    
    // Save user to MySQL or JSON fallback
    if (isMySQLConnected()) {
        $result = addUserDB($newUser);
        if (!$result['success']) {
            // Fallback to JSON if MySQL fails
            $users = readJsonFile(USERS_FILE);
            $users[] = $newUser;
            writeJsonFile(USERS_FILE, $users);
        }
    } else {
        // Save to JSON file
        $users = readJsonFile(USERS_FILE);
        $users[] = $newUser;
        writeJsonFile(USERS_FILE, $users);
    }
    
    // Send appropriate email based on role
    if ($role !== 'admin' && $role !== 'coadmin' && $role !== 'subadmin') {
        // Regular user: send welcome email (pending approval)
        try {
            EmailService::sendWelcomeEmail($newUser);
        } catch (Exception $e) {
            error_log("Email error: " . $e->getMessage());
        }
        
        // Return pending status
        unset($newUser['password']);
        http_response_code(201);
        successResponse([
            'message' => 'Registration successful! Your account is pending admin approval.',
            'pending' => true,
            'user' => $newUser
        ]);
    } else {
        // Admin/coadmin: send verification notification
        try {
            EmailService::sendAccountVerificationNotification($newUser);
        } catch (Exception $e) {
            error_log("Email error: " . $e->getMessage());
        }
        
        // Generate token for admin/coadmin/subadmin (they can login immediately)
        $token = generateJwt($user_id, $role, $email);
        
        unset($newUser['password']);
        http_response_code(201);
        successResponse([
            'message' => 'User created successfully',
            'token' => $token,
            'user' => $newUser
        ]);
    }
}

function approveUser($email) {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Find user - try MySQL first if connected
    $userFound = false;
    $userIndex = -1;
    
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    foreach ($users as $index => &$user) {
        if ($user['email'] === $email) {
            if ($user['isActive'] ?? false) {
                errorResponse('User is already active');
            }
            
            $user['isActive'] = true;
            $user['rejected'] = false;
            $user['updated_at'] = date('c');
            $userFound = true;
            
            // Send approval email
            try {
                EmailService::sendAccountApprovalEmail($user, 'APPROVED');
            } catch (Exception $e) {
                error_log("Email error: " . $e->getMessage());
            }
            
            // Log activity
            logActivityDB($user['user_id'], 'approve_user', "Approved user: $email", 'admin', $user['user_id']);
            
            break;
        }
    }
    
    if (!$userFound) {
        errorResponse('User not found', 404);
    }
    
    // Save user - MySQL or JSON
    if (isMySQLConnected()) {
        saveUsersDB($users);
    } else {
        writeJsonFile(USERS_FILE, $users);
    }
    
    successResponse(null, 'User approved successfully');
}

function rejectUser() {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $reason = $input['reason'] ?? '';
    
    // Find user - try MySQL first if connected
    $userFound = false;
    
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    foreach ($users as &$user) {
        if ($user['email'] === $email) {
            if ($user['rejected'] ?? false) {
                errorResponse('User has already been rejected');
            }
            
            $user['isActive'] = false;
            $user['rejected'] = true;
            $user['updated_at'] = date('c');
            $userFound = true;
            
            // Send rejection email
            try {
                EmailService::sendAccountRejectionEmail($user, $reason);
            } catch (Exception $e) {
                error_log("Email error: " . $e->getMessage());
            }
            
            // Log activity
            logActivityDB($user['user_id'], 'reject_user', "Rejected user: $email, reason: $reason", 'admin', $user['user_id']);
            
            break;
        }
    }
    
    if (!$userFound) {
        errorResponse('User not found', 404);
    }
    
    // Save user - MySQL or JSON
    if (isMySQLConnected()) {
        saveUsersDB($users);
    } else {
        writeJsonFile(USERS_FILE, $users);
    }
    
    successResponse(null, 'User rejected successfully');
}

function banUser() {
    requireAdmin();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $email = $input['email'] ?? '';
    $reason = $input['reason'] ?? '';
    
    // Find user - try MySQL first if connected
    $userFound = false;
    
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    foreach ($users as &$user) {
        if ($user['email'] === $email) {
            if ($user['banned'] ?? false) {
                errorResponse('User has already been banned');
            }
            
            $user['isActive'] = false;
            $user['banned'] = true;
            $user['verified'] = false;
            $user['rejected'] = false;
            $user['updated_at'] = date('c');
            $userFound = true;
            
            // Send ban email
            try {
                EmailService::sendAccountBanEmail($user, $reason);
            } catch (Exception $e) {
                error_log("Email error: " . $e->getMessage());
            }
            
            // Log activity
            logActivityDB($user['user_id'], 'ban_user', "Banned user: $email, reason: $reason", 'admin', $user['user_id']);
            
            break;
        }
    }
    
    if (!$userFound) {
        errorResponse('User not found', 404);
    }
    
    // Save user - MySQL or JSON
    if (isMySQLConnected()) {
        saveUsersDB($users);
    } else {
        writeJsonFile(USERS_FILE, $users);
    }
    
    successResponse(null, 'User banned successfully');
}

// ==================== USER MANAGEMENT ====================

function getUsers() {
    // Public endpoint for admin page to get users list
    // Try MySQL first if connected
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        // Fallback to JSON file
        $users = readJsonFile(USERS_FILE);
    }
    
    // Remove passwords
    foreach ($users as &$user) {
        unset($user['password']);
    }
    
    // Sort by created_at descending
    usort($users, function($a, $b) {
        return strtotime($b['created_at'] ?? 0) - strtotime($a['created_at'] ?? 0);
    });
    
    jsonResponse($users);
}

function removeUser() {
    // Admin endpoint to remove a user (auth handled on frontend)
    
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['user_id'] ?? null;
    
    if (!$userId) {
        errorResponse('User ID is required', 400);
    }
    
    // Get users from MySQL or JSON
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    $originalCount = count($users);
    
    // Filter out the user to remove
    $users = array_values(array_filter($users, function($user) use ($userId) {
        $id = $user['user_id'] ?? $user['id'] ?? '';
        return strval($id) !== strval($userId);
    }));
    
    if (count($users) === $originalCount) {
        errorResponse('User not found', 404);
    }
    
    // Save the updated users array
    if (isMySQLConnected()) {
        if (!saveUsersDB($users)) {
            errorResponse('Failed to save to MySQL', 500);
        }
    } else {
        if (!writeJsonFile(USERS_FILE, $users)) {
            errorResponse('Failed to save users file', 500);
        }
    }
    
    successResponse(['message' => 'User removed successfully']);
}

function updateUser() {
    // Admin endpoint to update a user
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $oldUserId = $input['user_id'] ?? null;
    $newUserId = $input['student_id'] ?? $oldUserId;
    $name = $input['name'] ?? null;
    $email = $input['email'] ?? null;
    $role = $input['role'] ?? null;
    $section = $input['section'] ?? null;
    $strand = $input['strand'] ?? null;
    $permissions = $input['permissions'] ?? '';
    $accessLevel = $input['access_level'] ?? '';
    
    if (!$oldUserId) {
        errorResponse('User ID is required', 400);
    }
    
    // Get users from MySQL or JSON
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    $found = false;
    
    foreach ($users as &$user) {
        $id = $user['user_id'] ?? $user['id'] ?? '';
        if (strval($id) === strval($oldUserId)) {
            // Update user fields
            if ($name !== null) $user['name'] = $name;
            if ($email !== null) $user['email'] = $email;
            if ($role !== null) $user['role'] = $role;
            if ($section !== null) $user['section'] = $section;
            if ($strand !== null) $user['strand'] = $strand;
            if ($permissions !== '') $user['permissions'] = $permissions;
            if ($accessLevel !== '') $user['access_level'] = $accessLevel;
            if ($newUserId !== null && $newUserId !== $oldUserId) {
                $user['user_id'] = $newUserId;
            }
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        errorResponse('User not found', 404);
    }
    
    // Save the updated users array
    if (isMySQLConnected()) {
        if (!saveUsersDB($users)) {
            errorResponse('Failed to save to MySQL', 500);
        }
    } else {
        if (!writeJsonFile(USERS_FILE, $users)) {
            errorResponse('Failed to save users file', 500);
        }
    }
    
    successResponse(['message' => 'User updated successfully']);
}

// Check user verification status - used by pending.html to poll for account approval
function checkUserVerification($userId) {
    // Get users from MySQL or JSON
    if (isMySQLConnected()) {
        $users = getAllUsers();
    } else {
        $users = readJsonFile(USERS_FILE);
    }
    
    // Search for user by user_id
    $foundUser = null;
    foreach ($users as $user) {
        if (isset($user['user_id']) && strval($user['user_id']) === strval($userId)) {
            $foundUser = $user;
            break;
        }
    }
    
    if (!$foundUser) {
        errorResponse('User not found', 404);
    }
    
    // Return verification status
    // In our system, verified = isActive (account approved by admin)
    $verified = isset($foundUser['isActive']) && $foundUser['isActive'] === true;
    $rejected = isset($foundUser['rejected']) && $foundUser['rejected'] === true;
    $banned = isset($foundUser['banned']) && $foundUser['banned'] === true;
    
    jsonResponse([
        'verified' => $verified,
        'rejected' => $rejected,
        'banned' => $banned,
        'user_id' => $foundUser['user_id'],
        'email' => $foundUser['email'] ?? '',
        'fullname' => $foundUser['fullname'] ?? $foundUser['name'] ?? ''
    ]);
}

function getActivityLogsEndpoint() {
    requireAuth();
    
    $filters = [
        'adminRole' => $_GET['adminRole'] ?? null,
        'action' => $_GET['action'] ?? null,
        'adminId' => $_GET['adminId'] ?? null,
        'targetUserId' => $_GET['targetUserId'] ?? null,
        'startDate' => $_GET['startDate'] ?? null,
        'endDate' => $_GET['endDate'] ?? null,
        'limit' => isset($_GET['limit']) ? (int)$_GET['limit'] : 50
    ];
    
    // Remove null values
    $filters = array_filter($filters, function($v) { return $v !== null; });
    
    $result = getActivityLogsDB($filters);
    
    successResponse($result);
}

function getActivityCountEndpoint() {
    requireAuth();
    
    $count = getActivityLogCountDB();
    
    successResponse(['count' => $count]);
}

function logActivityEndpoint() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['action'])) {
        errorResponse('Activity action is required');
    }
    
    $user = getCurrentUser();
    
    $activity = logActivityDB(
        $user['userId'],
        $input['action'],
        $input['details'] ?? '',
        $user['role'],
        $input['targetUserId'] ?? null
    );
    
    successResponse(['logId' => $activity['id'], 'log' => $activity]);
}

// ==================== ARTICLES ====================

function getArticles() {
    $articles = readJsonFile(ARTICLES_FILE);
    
    if (is_array($articles) && count($articles) > 0 && isset($articles[0])) {
        // Plain array
        successResponse(['articles' => $articles]);
    } else {
        successResponse(['articles' => []]);
    }
}

function getArticle($id) {
    $articles = readJsonFile(ARTICLES_FILE);
    
    foreach ($articles as $article) {
        if ((string)$article['id'] === $id || (int)$article['id'] === (int)$id) {
            successResponse($article);
        }
    }
    
    errorResponse('Article not found', 404);
}

function saveArticle() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Generate ID if not provided
    if (!isset($input['id'])) {
        $input['id'] = time();
    }
    
    $input['created_at'] = $input['created_at'] ?? date('c');
    
    // Read existing articles
    $articles = readJsonFile(ARTICLES_FILE);
    if (!is_array($articles)) {
        $articles = [];
    }
    
    // Add or update article
    $found = false;
    foreach ($articles as &$article) {
        if ((string)$article['id'] === (string)$input['id']) {
            $article = array_merge($article, $input);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        $articles[] = $input;
    }
    
    // Save to file
    file_put_contents(ARTICLES_FILE, json_encode($articles, JSON_PRETTY_PRINT));
    
    successResponse(['article' => $input]);
}

function deleteArticle($id) {
    requireAuth();
    
    $articles = readJsonFile(ARTICLES_FILE);
    
    $articles = array_filter($articles, function($article) use ($id) {
        return (string)$article['id'] !== (string)$id && (int)$article['id'] !== (int)$id;
    });
    
    // Re-index array
    $articles = array_values($articles);
    
    // Save to file
    file_put_contents(ARTICLES_FILE, json_encode($articles, JSON_PRETTY_PRINT));
    
    successResponse(null, 'Article deleted successfully');
}

function updateArticle($id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $articles = readJsonFile(ARTICLES_FILE);
    
    $found = false;
    foreach ($articles as &$article) {
        if ((string)$article['id'] === (string)$id || (int)$article['id'] === (int)$id) {
            $article = array_merge($article, $input);
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        errorResponse('Article not found', 404);
    }
    
    // Save to file
    file_put_contents(ARTICLES_FILE, json_encode($articles, JSON_PRETTY_PRINT));
    
    successResponse(['article' => $article, 'message' => 'Article updated successfully']);
}

function uploadArticlePDF() {
    requireAuth();
    
    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        errorResponse('PDF file is required', 400);
    }
    
    $file = $_FILES['pdf'];
    $articleId = $_POST['articleId'] ?? null;
    
    // Validate file type
    if ($file['type'] !== 'application/pdf') {
        errorResponse('Only PDF files are allowed', 400);
    }
    
    // Generate unique filename
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = ($articleId ? $articleId . '_' : '') . time() . '.' . $extension;
    
    // Read file content
    $fileData = base64_encode(file_get_contents($file['tmp_name']));
    
    // Upload file (tries GDrive first, falls back to local)
    $uploadDir = dirname(__DIR__, 2) . '/uploads/article-pdfs/';
    $uploadResult = uploadFile($fileData, $filename, $uploadDir);
    
    $pdfPath = $uploadResult['path'];
    
    // If articleId provided, update the article
    if ($articleId) {
        $articles = readJsonFile(ARTICLES_FILE);
        foreach ($articles as &$article) {
            if ((string)$article['id'] === (string)$articleId || (int)$article['id'] === (int)$articleId) {
                $article['pdfPath'] = $pdfPath;
                break;
            }
        }
        file_put_contents(ARTICLES_FILE, json_encode($articles, JSON_PRETTY_PRINT));
    }
    
    successResponse([
        'pdfPath' => $pdfPath, 
        'storageType' => $uploadResult['type'],
        'message' => 'PDF uploaded successfully'
    ]);
}

function getSettings() {
    $settingsFile = dirname(__DIR__) . '/site_settings.json';
    
    if (file_exists($settingsFile)) {
        $settings = json_decode(file_get_contents($settingsFile), true);
        successResponse($settings);
    }
    
    successResponse([]);
}

// ==================== PDF OPERATIONS ====================

function servePDF($id) {
    if (!$id) {
        errorResponse('PDF ID is required', 400);
    }
    
    error_log("servePDF called with id: " . $id);
    
    $pdfBuffer = null;
    $filename = $id . '.pdf';
    
    // Try to load from storage first
    // NOTE: loadFile function doesn't exist - this would cause PHP fatal error
    // Skip this step and go directly to filesystem
    error_log("Attempting to load PDF from filesystem...");
    $fileData = null;
    
    if ($fileData) {
        // Extract PDF content
        if (isset($fileData['content'])) {
            if (is_string($fileData['content']) && strpos($fileData['content'], 'base64') !== false) {
                $base64Data = str_replace('data:application/pdf;base64,', '', $fileData['content']);
                $pdfBuffer = base64_decode($base64Data);
            } elseif (is_string($fileData['content'])) {
                $pdfBuffer = base64_decode($fileData['content']);
            }
            $filename = $fileData['filename'] ?? $filename;
        } elseif (isset($fileData['data'])) {
            $base64Data = str_replace('data:application/pdf;base64,', '', $fileData['data']);
            $pdfBuffer = base64_decode($base64Data);
            $filename = $fileData['filename'] ?? $filename;
        }
    }
    
    // If not found in storage, try filesystem uploads
    error_log("Checking UPLOADS_DIR: " . UPLOADS_DIR);
    if (!$pdfBuffer && is_dir(UPLOADS_DIR)) {
        $files = scandir(UPLOADS_DIR);
        error_log("Files in UPLOADS_DIR: " . implode(', ', $files));
        
        foreach ($files as $file) {
            if (str_starts_with($file, $id) && str_ends_with($file, '.pdf')) {
                error_log("Found matching file in UPLOADS_DIR: " . $file);
                $pdfBuffer = file_get_contents(UPLOADS_DIR . '/' . $file);
                $filename = $file;
                break;
            }
        }
    } else {
        error_log("UPLOADS_DIR does not exist or is not a directory");
    }
    
    // Try Studies folder as fallback
    error_log("Checking STUDIES_DIR: " . STUDIES_DIR);
    if (!$pdfBuffer && is_dir(STUDIES_DIR)) {
        $studiesPath = findPDF(STUDIES_DIR, $id);
        
        if ($studiesPath && file_exists($studiesPath)) {
            $pdfBuffer = file_get_contents($studiesPath);
            $filename = basename($studiesPath);
        }
    }
    
    if (!$pdfBuffer) {
        errorResponse('PDF not found', 404);
    }
    
    // Serve the PDF
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($pdfBuffer));
    echo $pdfBuffer;
    exit;
}

function serveStudiesPDF() {
    $filePath = $_GET['path'] ?? '';
    
    if (!$filePath) {
        errorResponse('File path is required', 400);
    }
    
    // Handle full path (including Studies/) from frontend
    // Strip the Studies/ prefix if present to get relative path
    $relativePath = $filePath;
    if (strpos($filePath, 'Studies/') === 0 || strpos($filePath, '/Studies/') === 0) {
        $relativePath = preg_replace('#^Studies/#', '', $filePath);
        $relativePath = preg_replace('#^/Studies/#', '', $relativePath);
    }
    
    // Debug log
    error_log("serveStudiesPDF - Original path: " . $filePath);
    error_log("serveStudiesPDF - Relative path: " . $relativePath);
    
    // Security: only allow files in Studies folder
    $fullPath = STUDIES_DIR . '/' . $relativePath;
    $normalizedPath = realpath($fullPath);
    $studiesRealPath = realpath(STUDIES_DIR);
    
    // Ensure the path is within Studies directory
    if (!$normalizedPath || strpos($normalizedPath, $studiesRealPath) !== 0) {
        errorResponse('Access denied', 403);
    }
    
    if (!file_exists($normalizedPath)) {
        errorResponse('File not found', 404);
    }
    
    $pdfBuffer = file_get_contents($normalizedPath);
    $filename = basename($normalizedPath);
    
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($pdfBuffer));
    echo $pdfBuffer;
    exit;
}

function uploadPDF() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Handle file data
    $fileData = $input['fileData'] ?? null;
    $filename = $input['filename'] ?? 'document.pdf';
    
    if (!$fileData) {
        // Check multipart form data
        if (isset($_FILES['file'])) {
            $fileData = base64_encode(file_get_contents($_FILES['file']['tmp_name']));
            $filename = $_FILES['file']['name'];
        }
    }
    
    if (!$fileData) {
        errorResponse('No file provided');
    }
    
    // Generate unique ID
    $fileId = generateUniqueFileId();
    
    // Upload file (tries GDrive first, falls back to local)
    $uploadResult = uploadFile($fileData, $filename);
    
    successResponse([
        'fileId' => $fileId,
        'filename' => $filename,
        'filePath' => $uploadResult['path'],
        'storageType' => $uploadResult['type'],
        'message' => "PDF uploaded successfully with ID: $fileId"
    ]);
}

function userUpload() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $userId = $input['userId'] ?? '';
    $userEmail = $input['userEmail'] ?? '';
    $userName = $input['userName'] ?? '';
    $title = $input['title'] ?? '';
    $authors = $input['authors'] ?? '';
    $abstract = $input['abstract'] ?? '';
    $category = $input['category'] ?? 'research';
    $level = $input['level'] ?? 'college';
    $strand = $input['strand'] ?? 'ABM';
    $program = $input['program'] ?? 'BSCS';
    $year = $input['year'] ?? date('Y');
    $citation = $input['citation'] ?? '';
    $fileData = $input['fileData'] ?? '';
    $filename = $input['filename'] ?? 'document.pdf';
    
    if (!$userEmail || !$title) {
        errorResponse('Missing required fields: userEmail and title are required');
    }
    
    if (!$fileData) {
        errorResponse('No file provided');
    }
    
    // Derive userId from email if not provided
    $finalUserId = $userId ?: $userEmail;
    
    // Generate unique IDs
    $uploadId = 'user_' . time() . '_' . rand(1000, 9999);
    $fileId = 'user_pdf_' . time();
    
    // Upload file (tries GDrive first, falls back to local)
    $uploadResult = uploadFile($fileData, $filename);
    
    // Save upload metadata
    $userUpload = [
        'id' => $uploadId,
        'userId' => $finalUserId,
        'userEmail' => $userEmail,
        'userName' => $userName,
        'title' => $title,
        'authors' => $authors,
        'abstract' => $abstract,
        'category' => $category,
        'level' => $level,
        'strand' => $strand,
        'program' => $program,
        'year' => $year,
        'citation' => $citation,
        'fileId' => $fileId,
        'filename' => $filename,
        'filePath' => $uploadResult['path'],
        'storageType' => $uploadResult['type'],
        'status' => 'pending',
        'uploadedAt' => date('c'),
        'updatedAt' => date('c')
    ];
    
    // Save to user uploads
    $uploadsData = file_exists(USER_UPLOADS_FILE) ? json_decode(file_get_contents(USER_UPLOADS_FILE), true) : ['uploads' => []];
    
    if (!isset($uploadsData['uploads'])) {
        $uploadsData['uploads'] = [];
    }
    
    $uploadsData['uploads'][] = $userUpload;
    file_put_contents(USER_UPLOADS_FILE, json_encode($uploadsData, JSON_PRETTY_PRINT));
    
    successResponse([
        'uploadId' => $uploadId,
        'fileId' => $fileId,
        'filename' => $filename,
        'filePath' => $uploadResult['path'],
        'storageType' => $uploadResult['type'],
        'message' => 'Upload submitted successfully! Pending admin approval.'
    ]);
}

function getUserUploads($userId) {
    $uploadsData = file_exists(USER_UPLOADS_FILE) ? json_decode(file_get_contents(USER_UPLOADS_FILE), true) : ['uploads' => []];
    $uploads = $uploadsData['uploads'] ?? [];
    
    // Filter by userId
    $userUploads = array_filter($uploads, function($upload) use ($userId) {
        return $upload['userId'] === $userId;
    });
    
    // Sort by uploadedAt descending
    usort($userUploads, function($a, $b) {
        return strtotime($b['uploadedAt']) - strtotime($a['uploadedAt']);
    });
    
    successResponse(['uploads' => array_values($userUploads)]);
}

function getAllUserUploads() {
    requireAuth();
    
    $uploadsData = file_exists(USER_UPLOADS_FILE) ? json_decode(file_get_contents(USER_UPLOADS_FILE), true) : ['uploads' => []];
    $uploads = $uploadsData['uploads'] ?? [];
    
    // Sort by uploadedAt descending
    usort($uploads, function($a, $b) {
        return strtotime($b['uploadedAt']) - strtotime($a['uploadedAt']);
    });
    
    successResponse(['uploads' => array_values($uploads)]);
}

function updateUserUpload($id) {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    $status = $input['status'] ?? '';
    
    if (!in_array($status, ['pending', 'approved', 'rejected'])) {
        errorResponse('Invalid status');
    }
    
    $uploadsData = file_exists(USER_UPLOADS_FILE) ? json_decode(file_get_contents(USER_UPLOADS_FILE), true) : ['uploads' => []];
    $uploads = $uploadsData['uploads'] ?? [];
    
    $updated = false;
    
    foreach ($uploads as &$upload) {
        if ($upload['id'] === $id) {
            $upload['status'] = $status;
            $upload['updatedAt'] = date('c');
            $updated = true;
            break;
        }
    }
    
    if (!$updated) {
        errorResponse('Upload not found', 404);
    }
    
    $uploadsData['uploads'] = $uploads;
    file_put_contents(USER_UPLOADS_FILE, json_encode($uploadsData, JSON_PRETTY_PRINT));
    
    successResponse(['upload' => $upload]);
}

function deleteUserUpload($id) {
    requireAuth();
    
    $uploadsData = file_exists(USER_UPLOADS_FILE) ? json_decode(file_get_contents(USER_UPLOADS_FILE), true) : ['uploads' => []];
    $uploads = $uploadsData['uploads'] ?? [];
    
    $found = false;
    
    $uploads = array_filter($uploads, function($upload) use ($id, &$found) {
        if ($upload['id'] === $id) {
            $found = true;
            return false;
        }
        return true;
    });
    
    if (!$found) {
        errorResponse('Upload not found', 404);
    }
    
    $uploadsData['uploads'] = array_values($uploads);
    file_put_contents(USER_UPLOADS_FILE, json_encode($uploadsData, JSON_PRETTY_PRINT));
    
    successResponse(null, 'Upload deleted successfully');
}

// ==================== CAROUSEL ====================

function getCarousel() {
    header('Content-Type: application/json');
    
    $carouselFile = __DIR__ . '/data/carousel.json';
    
    if (file_exists($carouselFile)) {
        $carousel = json_decode(file_get_contents($carouselFile), true);
        if ($carousel === null) {
            $carousel = [];
        }
    } else {
        $carousel = [];
    }
    
    // Return in same format as Node.js
    echo json_encode(['success' => true, 'carousel' => $carousel]);
}

function addCarouselItem() {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $imageUrl = $input['imageUrl'] ?? '';
    $title = $input['title'] ?? '';
    $author = $input['author'] ?? '';
    $description = $input['description'] ?? '';
    $pdfId = $input['pdfId'] ?? '';
    $pdfPath = $input['pdfPath'] ?? '';
    
    if (!$imageUrl || !$title) {
        echo json_encode(['success' => false, 'error' => 'Image URL and Title are required']);
        return;
    }
    
    $carouselFile = dirname(__DIR__) . '/data/carousel.json';
    
    // Load existing carousel data
    $carousel = [];
    if (file_exists($carouselFile)) {
        $data = file_get_contents($carouselFile);
        $carousel = json_decode($data, true);
        if ($carousel === null) {
            $carousel = [];
        }
    }
    
    // Create new item
    $newItem = [
        'id' => 'carousel-' . time(),
        'imageUrl' => $imageUrl,
        'title' => $title,
        'author' => $author,
        'description' => $description,
        'pdfId' => $pdfId,
        'pdfPath' => $pdfPath
    ];
    
    $carousel[] = $newItem;
    
    file_put_contents($carouselFile, json_encode($carousel, JSON_PRETTY_PRINT));
    
    echo json_encode(['success' => true, 'item' => $newItem]);
}

function updateCarouselItem($id) {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $carouselFile = dirname(__DIR__) . '/data/carousel.json';
    
    if (!file_exists($carouselFile)) {
        echo json_encode(['success' => false, 'error' => 'Carousel not found']);
        return;
    }
    
    $carousel = json_decode(file_get_contents($carouselFile), true);
    if ($carousel === null) {
        $carousel = [];
    }
    
    $found = false;
    foreach ($carousel as &$item) {
        if ($item['id'] === $id) {
            $item['imageUrl'] = $input['imageUrl'] ?? $item['imageUrl'];
            $item['title'] = $input['title'] ?? $item['title'];
            $item['author'] = isset($input['author']) ? $input['author'] : $item['author'];
            $item['description'] = isset($input['description']) ? $input['description'] : $item['description'];
            $item['pdfId'] = isset($input['pdfId']) ? $input['pdfId'] : $item['pdfId'];
            $item['pdfPath'] = isset($input['pdfPath']) ? $input['pdfPath'] : $item['pdfPath'];
            $found = true;
            break;
        }
    }
    
    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Carousel item not found']);
        return;
    }
    
    file_put_contents($carouselFile, json_encode($carousel, JSON_PRETTY_PRINT));
    
    echo json_encode(['success' => true, 'item' => $item]);
}

function deleteCarouselItem($id) {
    header('Content-Type: application/json');
    
    $carouselFile = __DIR__ . '/data/carousel.json';
    
    if (!file_exists($carouselFile)) {
        echo json_encode(['success' => false, 'error' => 'Carousel not found']);
        return;
    }
    
    $carousel = json_decode(file_get_contents($carouselFile), true);
    if ($carousel === null) {
        $carousel = [];
    }
    
    $found = false;
    $deletedItem = null;
    
    $carousel = array_values(array_filter($carousel, function($item) use ($id, &$found, &$deletedItem) {
        if ($item['id'] === $id) {
            $found = true;
            $deletedItem = $item;
            return false;
        }
        return true;
    }));
    
    if (!$found) {
        echo json_encode(['success' => false, 'error' => 'Carousel item not found']);
        return;
    }
    
    file_put_contents($carouselFile, json_encode($carousel, JSON_PRETTY_PRINT));
    
    echo json_encode(['success' => true, 'item' => $deletedItem]);
}

function uploadCarouselImage() {
    header('Content-Type: application/json');
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['imageData']) || !$input['imageData']) {
        echo json_encode(['success' => false, 'error' => 'No image data provided']);
        return;
    }
    
    $filename = $input['filename'] ?? 'image.png';
    $imageData = $input['imageData'];
    
    // Try Google Drive first if enabled
    if (isGDriveEnabled()) {
        // Save temp file
        $tempFile = sys_get_temp_dir() . '/' . $filename;
        $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $imageData);
        $imageBytes = base64_decode($base64Data);
        
        if ($imageBytes !== false) {
            file_put_contents($tempFile, $imageBytes);
            
            $result = uploadToGDrive($tempFile, $filename, GDrive_FOLDER_ID);
            if ($result['success']) {
                echo json_encode([
                    'success' => true,
                    'imageUrl' => $result['link'],
                    'storageType' => 'gdrive',
                    'message' => 'Image uploaded to Google Drive successfully'
                ]);
                unlink($tempFile);
                return;
            }
            unlink($tempFile);
        }
    }
    
    // Fallback to local storage
    $imagesDir = dirname(__DIR__) . '/../../frontend/assets/images/carousel';
    if (!is_dir($imagesDir)) {
        if (!mkdir($imagesDir, 0755, true)) {
            echo json_encode(['success' => false, 'error' => 'Failed to create directory: ' . $imagesDir]);
            return;
        }
    }
    
    if (!is_writable($imagesDir)) {
        echo json_encode(['success' => false, 'error' => 'Directory is not writable: ' . $imagesDir]);
        return;
    }
    
    // Generate unique filename
    $timestamp = time();
    $ext = pathinfo($filename, PATHINFO_EXTENSION);
    if (!$ext) {
        $ext = 'png';
    }
    $newFilename = 'carousel_' . $timestamp . '.' . $ext;
    $filePath = $imagesDir . '/' . $newFilename;
    
    // Remove data URL prefix if present
    $base64Data = preg_replace('/^data:image\/\w+;base64,/', '', $imageData);
    $imageBytes = base64_decode($base64Data);
    
    if ($imageBytes === false) {
        echo json_encode(['success' => false, 'error' => 'Invalid image data - base64 decode failed']);
        return;
    }
    
    $saved = file_put_contents($filePath, $imageBytes);
    if ($saved === false) {
        echo json_encode(['success' => false, 'error' => 'Failed to save image file to: ' . $filePath]);
        return;
    }
    
    $imageUrl = '/frontend/assets/images/carousel/' . $newFilename;
    
    echo json_encode(['success' => true, 'imageUrl' => $imageUrl, 'storageType' => 'local']);
}

// ==================== EMAIL ====================

function sendUpdateEmail() {
    requireAuth();
    
    $input = json_decode(file_get_contents('php://input'), true);
    
    $to_email = $input['to_email'] ?? '';
    $subject = $input['subject'] ?? '';
    $message = $input['message'] ?? '';
    
    if (!$to_email || !$subject) {
        errorResponse('Email and subject are required');
    }
    
    $user = getCurrentUser();
    
    // Create HTML content
    $content = '
        <h2 style="color: #0057b8; margin: 0 0 20px 0;">' . htmlspecialchars($subject) . '</h2>
        <p style="color: #333333; font-size: 16px; line-height: 1.6;">' . nl2br(htmlspecialchars($message)) . '</p>
        <p style="color: #666666; font-size: 14px; margin: 30px 0 0 0;">
            Sent by: ' . htmlspecialchars($user['email'] ?? 'Admin') . '<br>
            Role: ' . htmlspecialchars($user['role'] ?? 'admin') . '
        </p>
    ';
    
    $htmlContent = EmailService::getEmailTemplate($content);
    $result = EmailService::sendEmail($to_email, $subject, $htmlContent);
    
    if ($result['success']) {
        successResponse(null, 'Email sent successfully');
    } else {
        errorResponse('Failed to send email: ' . ($result['error'] ?? 'Unknown error'));
    }
}

function testEmailEndpoint() {
    // Test endpoint - doesn't require auth
    $input = json_decode(file_get_contents('php://input'), true);
    
    $to_email = $input['to_email'] ?? '';
    $test_type = $input['type'] ?? 'welcome';
    
    if (!$to_email) {
        errorResponse('Test email address is required');
    }
    
    $testUser = [
        'email' => $to_email,
        'personal_email' => $to_email,
        'name' => 'Test User'
    ];
    
    $result = null;
    
    switch ($test_type) {
        case 'welcome':
            $result = EmailService::sendWelcomeEmail($testUser);
            break;
        case 'approval':
            $result = EmailService::sendAccountApprovalEmail($testUser, 'APPROVED');
            break;
        case 'rejection':
            $result = EmailService::sendAccountRejectionEmail($testUser, 'Test rejection reason');
            break;
        case 'ban':
            $result = EmailService::sendAccountBanEmail($testUser, 'Test ban reason');
            break;
        default:
            errorResponse('Unknown test type. Use: welcome, approval, rejection, or ban');
    }
    
    if ($result && $result['success']) {
        successResponse(['result' => $result], 'Test ' . $test_type . ' email sent successfully to ' . $to_email);
    } else {
        errorResponse('Failed to send test email: ' . ($result['error'] ?? 'Unknown error'));
    }
}

// ==================== PREFERENCES ====================

function handlePreferences() {
    $user = requireAuth();
    $userId = $user['userId'];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $preferences = loadUserPreferences($userId);
        successResponse(['preferences' => $preferences]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        saveUserPreferences($userId, $input);
        successResponse(null, 'Preferences saved successfully');
    }
}

// ==================== EDITOR CONTENT ====================

function handleEditorContent() {
    $user = requireAuth();
    $userId = $user['userId'];
    
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $content = loadEditorContent($userId);
        successResponse(['content' => $content]);
    } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        $content = $input['content'] ?? '';
        saveEditorContent($userId, $content);
        successResponse(null, 'Editor content saved successfully');
    }
}

// ==================== SAVED ARTICLES API ====================

/**
 * POST /api/saved-articles - Save an article
 */
function saveSavedArticle() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? '';
    $article_id = $input['article_id'] ?? '';
    $title = $input['title'] ?? '';
    $content = $input['content'] ?? '';
    $url = $input['url'] ?? '';
    $thumbnail = $input['thumbnail'] ?? '';
    $date_saved = $input['date_saved'] ?? date('Y-m-d');
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    if (!$article_id) {
        errorResponse('article_id is required');
    }
    if (!$title) {
        errorResponse('title is required');
    }
    
    $article = [
        'user_id' => $user_id,
        'article_id' => $article_id,
        'title' => $title,
        'content' => $content,
        'url' => $url,
        'thumbnail' => $thumbnail,
        'date_saved' => $date_saved
    ];
    
    $result = saveArticleDB($article);
    
    if ($result['success']) {
        successResponse(['id' => $result['id']], 'Article saved successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to save article');
    }
}

/**
 * GET /api/saved-articles?user_id=xxx - Get all saved articles for user
 */
function getSavedArticles() {
    $user_id = $_GET['user_id'] ?? '';
    $limit = intval($_GET['limit'] ?? 50);
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $articles = getSavedArticlesDB($user_id, $limit);
    
    successResponse(['articles' => $articles, 'total' => count($articles)]);
}

/**
 * DELETE /api/saved-articles/:id - Delete a saved article
 */
function deleteSavedArticle($id) {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    if (!$id) {
        errorResponse('Article ID is required');
    }
    
    $result = deleteSavedArticleDB($id, $user_id);
    
    if ($result['success']) {
        successResponse(null, 'Article deleted successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to delete article');
    }
}

/**
 * GET /api/saved-articles/check?article_id=xxx&user_id=xxx - Check if article is saved
 */
function checkArticleSaved() {
    $article_id = $_GET['article_id'] ?? '';
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$article_id) {
        errorResponse('article_id is required');
    }
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $isSaved = checkArticleSavedDB($article_id, $user_id);
    
    successResponse(['saved' => $isSaved]);
}

// ==================== SEARCH HISTORY API ====================

/**
 * POST /api/search-history - Save a search query
 */
function saveSearchHistory() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? '';
    $search_query = $input['search_query'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    if (!$search_query) {
        errorResponse('search_query is required');
    }
    
    $result = saveSearchHistoryDB($user_id, $search_query);
    
    if ($result['success']) {
        successResponse(['id' => $result['id']], 'Search saved successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to save search');
    }
}

/**
 * GET /api/search-history?user_id=xxx&limit=20 - Get recent searches
 */
function getSearchHistory() {
    $user_id = $_GET['user_id'] ?? '';
    $limit = intval($_GET['limit'] ?? 20);
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $history = getSearchHistoryDB($user_id, $limit);
    
    successResponse(['history' => $history, 'total' => count($history)]);
}

/**
 * DELETE /api/search-history/:id - Delete individual search
 */
function deleteSearchHistory($id) {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    if (!$id) {
        errorResponse('Search ID is required');
    }
    
    $result = deleteSearchHistoryDB($id, $user_id);
    
    if ($result['success']) {
        successResponse(null, 'Search deleted successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to delete search');
    }
}

/**
 * DELETE /api/search-history?user_id=xxx - Clear all search history
 */
function clearAllSearchHistory() {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $result = clearSearchHistoryDB($user_id);
    
    if ($result['success']) {
        successResponse(null, 'Search history cleared successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to clear search history');
    }
}

// ==================== USER PREFERENCES API ====================

/**
 * GET /api/preferences?user_id=xxx - Get user preferences
 */
function getUserPreferences() {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $preferences = getUserPreferencesDB($user_id);
    
    successResponse(['preferences' => $preferences]);
}

/**
 * PUT /api/preferences - Update preferences (dark_mode, language, notifications)
 */
function updateUserPreferences() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? '';
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $preferences = [
        'dark_mode' => isset($input['dark_mode']) ? ($input['dark_mode'] ? 1 : 0) : 0,
        'language' => $input['language'] ?? 'en',
        'notifications' => isset($input['notifications']) ? ($input['notifications'] ? 1 : 0) : 1
    ];
    
    $result = updateUserPreferencesDB($user_id, $preferences);
    
    if ($result['success']) {
        successResponse(null, 'Preferences updated successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to update preferences');
    }
}

// ==================== DOCUMENTS API FUNCTIONS ====================

/**
 * GET /api/documents - Get all documents for a user
 */
function getDocuments() {
    $user_id = $_GET['user_id'] ?? '';
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
    
    if (!$user_id) {
        // Try to get user from session or auth
        $user = getCurrentUser();
        if ($user) {
            $user_id = $user['user_id'] ?? $user['id'] ?? '';
        }
    }
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $documents = getDocumentsDB($user_id, $limit);
    
    successResponse($documents);
}

/**
 * GET /api/documents/{doc_id} - Get a single document
 */
function getDocument($docId) {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        // Try to get user from session or auth
        $user = getCurrentUser();
        if ($user) {
            $user_id = $user['user_id'] ?? $user['id'] ?? '';
        }
    }
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $document = getDocumentByIdDB($docId, $user_id);
    
    if (!$document) {
        errorResponse('Document not found', 404);
    }
    
    successResponse($document);
}

/**
 * POST /api/documents - Save a new document
 */
function saveDocument() {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? '';
    
    if (!$user_id) {
        // Try to get user from session or auth
        $user = getCurrentUser();
        if ($user) {
            $user_id = $user['user_id'] ?? $user['id'] ?? '';
        }
    }
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $document = [
        'doc_id' => $input['doc_id'] ?? $input['id'] ?? 'doc_' . uniqid(),
        'user_id' => $user_id,
        'title' => $input['title'] ?? 'Untitled Document',
        'content' => $input['content'] ?? '',
        'content_html' => $input['content_html'] ?? '',
        'paper_size' => $input['paper_size'] ?? 'letter',
        'is_sti_template' => $input['is_sti_template'] ?? $input['isSTITemplate'] ?? 0
    ];
    
    $result = saveDocumentDB($document);
    
    if ($result['success']) {
        successResponse($result, 'Document saved successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to save document');
    }
}

/**
 * PUT /api/documents/{doc_id} - Update an existing document
 */
function updateDocument($docId) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $user_id = $input['user_id'] ?? '';
    
    if (!$user_id) {
        // Try to get user from session or auth
        $user = getCurrentUser();
        if ($user) {
            $user_id = $user['user_id'] ?? $user['id'] ?? '';
        }
    }
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $document = [
        'doc_id' => $docId,
        'user_id' => $user_id,
        'title' => $input['title'] ?? 'Untitled Document',
        'content' => $input['content'] ?? '',
        'content_html' => $input['content_html'] ?? '',
        'paper_size' => $input['paper_size'] ?? 'letter',
        'is_sti_template' => $input['is_sti_template'] ?? $input['isSTITemplate'] ?? 0
    ];
    
    $result = saveDocumentDB($document);
    
    if ($result['success']) {
        successResponse($result, 'Document updated successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to update document');
    }
}

/**
 * DELETE /api/documents/{doc_id} - Delete a document
 */
function deleteDocument($docId) {
    $user_id = $_GET['user_id'] ?? '';
    
    if (!$user_id) {
        // Try to get user from session or auth
        $user = getCurrentUser();
        if ($user) {
            $user_id = $user['user_id'] ?? $user['id'] ?? '';
        }
    }
    
    if (!$user_id) {
        errorResponse('user_id is required');
    }
    
    $result = deleteDocumentDB($docId, $user_id);
    
    if ($result['success']) {
        successResponse(null, 'Document deleted successfully');
    } else {
        errorResponse($result['error'] ?? 'Failed to delete document');
    }
}
