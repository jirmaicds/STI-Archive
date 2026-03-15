<?php
/**
 * Router script for PHP built-in server
 * Routes all requests to the appropriate handlers
 */

// Get the request URI
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove any hash fragment from URI (browsers may send this in some cases)
$uri = strtok($uri, '#');

// Debug: log the incoming URI (for debugging)
error_log('Router received URI: ' . $uri);

// Define the document root (project root)
$docRoot = dirname(__DIR__, 2); // Go up two directories from backend/php

// Handle root URL - serve index.html from root directory
if ($uri === '/' || $uri === '') {
    $indexFile = $docRoot . '/index.html';
    if (file_exists($indexFile)) {
        include $indexFile;
        return;
    }
}

// Handle Homepage.html specifically (capital H) - handle any URL variations
$uriLower = strtolower($uri);
if ($uriLower === '/homepage.html' || $uriLower === '/homepage') {
    $homepageFile = $docRoot . '/frontend/pages/Homepage.html';
    error_log('Looking for Homepage at: ' . $homepageFile);
    if (file_exists($homepageFile)) {
        include $homepageFile;
        return;
    } else {
        error_log('Homepage file not found at: ' . $homepageFile);
    }
}

// Handle admin.html
if ($uri === '/admin.html') {
    $adminFile = $docRoot . '/frontend/pages/admin.html';
    if (file_exists($adminFile)) {
        include $adminFile;
        return;
    }
}

// Handle Homepage.html
if ($uri === '/Homepage.html') {
    $homepageFile = $docRoot . '/frontend/pages/Homepage.html';
    if (file_exists($homepageFile)) {
        include $homepageFile;
        return;
    }
}

// Handle other admin pages
if ($uri === '/coadmin.html') {
    $file = $docRoot . '/frontend/pages/coadmin.html';
    if (file_exists($file)) {
        include $file;
        return;
    }
}

if ($uri === '/subadmin.html') {
    $file = $docRoot . '/frontend/pages/subadmin.html';
    if (file_exists($file)) {
        include $file;
        return;
    }
}

// Add /Homepage (without .html) route
if ($uriLower === '/homepage/') {
    $homepageFile = $docRoot . '/frontend/pages/Homepage.html';
    if (file_exists($homepageFile)) {
        include $homepageFile;
        return;
    }
}

// Handle static files (CSS, JS, images, PDFs) - not API requests
if ($uri !== '/' && !str_starts_with($uri, '/api/') && !str_starts_with($uri, '/backend/php/')) {
    // Decode URL to handle spaces and special characters
    $decodedUri = urldecode($uri);
    $filePath = $docRoot . $decodedUri;
    
    // Check if file exists and serve it
    if (file_exists($filePath) && is_file($filePath)) {
        return false; // Let PHP built-in server serve static files
    }
    
    // Try with original URI too
    $filePath2 = $docRoot . $uri;
    if (file_exists($filePath2) && is_file($filePath2)) {
        return false;
    }
    
    // Try adding .html extension for HTML pages
    $htmlFile = $filePath . '.html';
    if (file_exists($htmlFile)) {
        include $htmlFile;
        return;
    }
    
    // Try looking in frontend/pages directory for HTML files
    if (str_ends_with($uri, '.html')) {
        $pagesFile = $docRoot . '/frontend/pages' . $uri;
        if (file_exists($pagesFile)) {
            include $pagesFile;
            return;
        }
    }
}

// Handle API requests - route through index.php
// For /api/ paths, rewrite to /backend/php/index.php
if (str_starts_with($uri, '/api/')) {
    $_SERVER['SCRIPT_NAME'] = '/backend/php/index.php';
    $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/index.php';
    error_log('API request, routing to PHP: ' . $uri);
    require __DIR__ . '/index.php';
    return;
}

// Handle backend/php direct paths
if (str_starts_with($uri, '/backend/php')) {
    $_SERVER['REQUEST_URI'] = str_replace('/backend/php', '', $uri);
    if ($_SERVER['REQUEST_URI'] === '') {
        $_SERVER['REQUEST_URI'] = '/';
    }
    error_log('PHP path, rewritten URI: ' . $_SERVER['REQUEST_URI']);
    require __DIR__ . '/index.php';
    return;
}

// Handle legacy Node.js paths - rewrite them to API paths and route through PHP
$legacyPaths = [
    '/get_articles' => '/api/articles',
    '/signup_user' => '/api/auth/register',
    '/get_users' => '/api/users',
    '/health' => '/api/health',
    '/send_update_email' => '/send_update_email'
];

foreach ($legacyPaths as $legacy => $api) {
    if (str_starts_with($uri, $legacy)) {
        $_SERVER['REQUEST_URI'] = $api;
        $_SERVER['SCRIPT_NAME'] = '/backend/php/index.php';
        $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/index.php';
        error_log('Legacy path converted: ' . $uri . ' -> ' . $api);
        require __DIR__ . '/index.php';
        return;
    }
}

// Otherwise, route through index.php
require __DIR__ . '/index.php';
