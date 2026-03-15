<?php
/**
 * Google Drive Upload for STI Archives
 * Handles file uploads to Google Drive
 * Only loads if credentials file exists
 */

// Only load Google API if credentials file exists
$credentialsPath = __DIR__ . '/gdrive-credentials.json';
if (!file_exists($credentialsPath)) {
    // Google Drive not configured - define stub functions only if not already defined
    if (!function_exists('uploadToGDrive')) {
        function uploadToGDrive($filePath, $fileName, $folderId = null) {
            return ['success' => false, 'error' => 'Google Drive not configured'];
        }
    }
    if (!function_exists('deleteFromGDrive')) {
        function deleteFromGDrive($fileId) {
            return ['success' => false, 'error' => 'Google Drive not configured'];
        }
    }
    if (!function_exists('isGDriveEnabled')) {
        function isGDriveEnabled() {
            return false;
        }
    }
    return;
}

require_once __DIR__ . '/google-api-php-client/vendor/autoload.php';

use Google\Client;
use Google\Service\Drive;
use Google\Service\Drive\DriveFile;

// Configuration - loaded from config.php
if (!defined('GDrive_FOLDER_ID')) {
    define('GDrive_FOLDER_ID', '1Oyif5qvEcjHOQKnokGV3IFHFQsfv8d08');
}
if (!defined('GDrive_CREDENTIALS')) {
    define('GDrive_CREDENTIALS', __DIR__ . '/gdrive-credentials.json');
}

/**
 * Upload file to Google Drive
 */
function uploadToGDrive($filePath, $fileName, $folderId = null) {
    if ($folderId === null) {
        $folderId = GDrive_FOLDER_ID;
    }
    
    try {
        // Check if credentials exist
        if (!file_exists(GDrive_CREDENTIALS)) {
            return [
                'success' => false,
                'error' => 'Google Drive credentials not found'
            ];
        }
        
        $client = new Client();
        $client->setAuthConfig(GDrive_CREDENTIALS);
        $client->addScope(Drive::DRIVE);
        
        $driveService = new Drive($client);
        
        // Create file metadata
        $file = new DriveFile();
        $file->setName($fileName);
        $file->setParents([$folderId]);
        
        // Upload file
        $result = $driveService->files->create(
            $file,
            [
                'data' => file_get_contents($filePath),
                'mimeType' => mime_content_type($filePath),
                'uploadType' => 'multipart'
            ]
        );
        
        // Make publicly accessible
        $permission = new Drive\Permission([
            'type' => 'anyone',
            'role' => 'reader'
        ]);
        $driveService->permissions->create($result->getId(), $permission);
        
        // Return direct download link
        return [
            'success' => true,
            'fileId' => $result->getId(),
            'link' => "https://drive.google.com/uc?export=download&id=" . $result->getId()
        ];
        
    } catch (Exception $e) {
        return [
            'success' => false,
            'error' => $e->getMessage()
        ];
    }
}

/**
 * Delete file from Google Drive
 */
function deleteFromGDrive($fileId) {
    try {
        $client = new Client();
        $client->setAuthConfig(GDrive_CREDENTIALS);
        $client->addScope(Drive::DRIVE);
        
        $driveService = new Drive($client);
        $driveService->files->delete($fileId);
        
        return ['success' => true];
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}

/**
 * Check if Google Drive is configured
 */
function isGDriveEnabled() {
    return file_exists(GDrive_CREDENTIALS);
}
?>
