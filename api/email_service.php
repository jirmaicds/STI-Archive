<?php
/**
 * PHP Email Service for STI Archives
 * Provides email sending functionality using direct SMTP socket connection
 * Replaces the Node.js EmailService functionality
 */

// Load configuration
require_once __DIR__ . '/config.php';

/**
 * Email Service Class
 */
class EmailService {
    
    // SMTP Configuration
    private static $smtpHost = 'smtp.gmail.com';
    private static $smtpPort = 465; // Use SSL port for better Windows compatibility
    private static $smtpUsername = 'stiarchivesorg@gmail.com';
    private static $smtpPassword = 'wdvw ptol wqgq qncd';
    private static $fromEmail = 'stiarchivesorg@gmail.com';
    private static $fromName = 'STI Archives';
    
    // Company branding
    private static $companyBranding = [
        'name' => 'STI Archives',
        'website' => 'https://sti.edu',
        'supportEmail' => 'stiarchivesorg@gmail.com',
        'logoUrl' => '/frontend/assets/images/STI Logo.png',
        'primaryColor' => '#0057b8',
        'secondaryColor' => '#0f1a41'
    ];
    
    /**
     * Initialize SMTP settings from environment/config
     */
    public static function init() {
        // Can be extended to load from config
        if (defined('EMAIL_USER') && EMAIL_USER) {
            self::$smtpUsername = EMAIL_USER;
            self::$fromEmail = EMAIL_USER;
        }
        if (defined('EMAIL_PASS') && EMAIL_PASS) {
            self::$smtpPassword = EMAIL_PASS;
        }
    }
    
    /**
     * Validate email address
     */
    public static function validateEmail($email) {
        if (!$email) {
            return ['valid' => false, 'error' => 'Email address is required'];
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['valid' => false, 'error' => 'Invalid email address format'];
        }
        return ['valid' => true];
    }
    
    /**
     * Generate email HTML template
     */
    public static function getEmailTemplate($content, $footer = true) {
        $footerHtml = '';
        if ($footer) {
            $footerHtml = '
                <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e0e0e0;">
                        <p style="color: #666666; font-size: 12px; margin: 0 0 10px 0;">
                            © ' . date('Y') . ' STI Archives. All rights reserved.
                        </p>
                        <p style="color: #999999; font-size: 11px; margin: 0;">
                            This is an automated message. Please do not reply to this email.
                        </p>
                    </td>
                </tr>
            ';
        }
        
        $html = '
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>STI Archives</title>
</head>
<body style="margin: 0; padding: 0; font-family: \'Segoe UI\', Arial, sans-serif; background-color: #f4f4f4;">
    <table cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, ' . self::$companyBranding['secondaryColor'] . ' 0%, ' . self::$companyBranding['primaryColor'] . ' 100%); padding: 30px; text-align: center;">                            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">STI Archives</h1>
                            <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Digital Library Management System</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px;">
                            ' . $content . '
                        </td>
                    </tr>
                    ' . $footerHtml . '
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        ';
        
        return $html;
    }
    
    /**
     * Send email using direct SMTP socket connection (no PHPMailer required)
     * Falls back to Node.js email proxy if SMTP fails
     */
    public static function sendEmail($to, $subject, $htmlContent) {
        // Validate email
        $validation = self::validateEmail($to);
        if (!$validation['valid']) {
            return [
                'success' => false,
                'error' => $validation['error']
            ];
        }
        
        // Try direct SMTP first
        $result = self::sendEmailDirectSMTP($to, $subject, $htmlContent);
        
        // If direct SMTP fails, try Node.js proxy
        if (!$result['success']) {
            $result = self::sendEmailViaNodeJS($to, $subject, $htmlContent);
        }
        
        return $result;
    }
    
    /**
     * Send email via Node.js server proxy (port 3001)
     */
    private static function sendEmailViaNodeJS($to, $subject, $htmlContent) {
        $nodeUrl = 'http://localhost:3001/api/send-email';
        
        $postData = json_encode([
            'to_email' => $to,
            'subject' => $subject,
            'message' => $htmlContent
        ]);
        
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $postData,
                'timeout' => 30
            ]
        ]);
        
        $response = @file_get_contents($nodeUrl, false, $context);
        
        if ($response !== false) {
            $result = json_decode($response, true);
            if ($result && isset($result['messageId'])) {
                return [
                    'success' => true,
                    'message' => 'Email sent successfully via Node.js',
                    'timestamp' => date('c')
                ];
            } elseif ($result && isset($result['error'])) {
                return [
                    'success' => false,
                    'error' => $result['error']
                ];
            }
        }
        
        return [
            'success' => false,
            'error' => 'Failed to send email via Node.js proxy'
        ];
    }
    
    /**
     * Direct SMTP sending without PHPMailer - uses SSL connection on port 465
     */
    private static function sendEmailDirectSMTP($to, $subject, $htmlContent) {
        $smtpHost = self::$smtpHost;
        $smtpPort = self::$smtpPort;
        $username = self::$smtpUsername;
        $password = self::$smtpPassword;
        $fromEmail = self::$fromEmail;
        $fromName = self::$fromName;
        
        // Use SSL context for port 465
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            ]
        ]);
        
        // Connect with SSL
        $socket = @stream_socket_client(
            "ssl://$smtpHost:$smtpPort",
            $errno,
            $errstr,
            30,
            STREAM_CLIENT_CONNECT,
            $context
        );
        
        if (!$socket) {
            return [
                'success' => false,
                'error' => "Cannot connect to SMTP: $errstr ($errno)"
            ];
        }
        
        // Read greeting
        $response = fgets($socket, 515);
        
        // EHLO
        fputs($socket, "EHLO " . gethostname() . "\r\n");
        $response = fgets($socket, 515);
        
        // AUTH LOGIN
        fputs($socket, "AUTH LOGIN\r\n");
        $response = fgets($socket, 515);
        
        // Send username (base64 encoded)
        fputs($socket, base64_encode($username) . "\r\n");
        $response = fgets($socket, 515);
        
        // Send password (base64 encoded)
        fputs($socket, base64_encode($password) . "\r\n");
        $response = fgets($socket, 515);
        
        if (strpos($response, '235') === false) {
            fclose($socket);
            return [
                'success' => false,
                'error' => 'SMTP authentication failed'
            ];
        }
        
        // MAIL FROM
        fputs($socket, "MAIL FROM:<$fromEmail>\r\n");
        $response = fgets($socket, 515);
        
        // RCPT TO
        fputs($socket, "RCPT TO:<$to>\r\n");
        $response = fgets($socket, 515);
        
        // DATA
        fputs($socket, "DATA\r\n");
        $response = fgets($socket, 515);
        
        // Email headers and body
        $message = "From: $fromName <$fromEmail>\r\n";
        $message .= "To: $to\r\n";
        $message .= "Subject: $subject\r\n";
        $message .= "MIME-Version: 1.0\r\n";
        $message .= "Content-Type: text/html; charset=UTF-8\r\n";
        $message .= "\r\n";
        $message .= $htmlContent . "\r\n";
        $message .= ".\r\n";
        
        fputs($socket, $message);
        $response = fgets($socket, 515);
        
        // QUIT
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        if (strpos($response, '250') !== false) {
            return [
                'success' => true,
                'message' => 'Email sent successfully',
                'timestamp' => date('c')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send email: ' . $response
            ];
        }
    }
    
    /**
     * Simple mail() function fallback
     */
    private static function sendEmailSimple($to, $subject, $htmlContent) {
        $headers = "MIME-Version: 1.0" . "\r\n";
        $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        $headers .= "From: " . self::$fromName . " <" . self::$fromEmail . ">" . "\r\n";
        
        $result = @mail($to, $subject, $htmlContent, $headers);
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Email sent successfully (via mail)',
                'timestamp' => date('c')
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to send email'
            ];
        }
    }
    
    /**
     * Send Welcome Email (when user registers)
     * "Thank you for registering - your account is pending approval"
     */
    public static function sendWelcomeEmail($userData) {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $subject = '📚 Welcome to STI Archives - Registration Received!';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Welcome, ' . htmlspecialchars($name) . '! 🎓
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for registering with <strong>STI Archives</strong> - the digital library management system.
            </p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: #856404; margin: 0 0 10px 0; font-size: 18px;">
                    ⏳ Account Pending Approval
                </h3>
                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.6;">
                    Your account is currently <strong>pending approval</strong> from our administrators. 
                    You will receive an email once your account has been verified and approved.
                </p>
            </div>
            
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                This typically takes 1-2 business days. Thank you for your patience!
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
    
    /**
     * Send Account Verification/Approval Notification
     * "Your account is now active!"
     */
    public static function sendAccountVerificationNotification($userData) {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $subject = '✅ Your STI Archives Account is Now Active!';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Welcome, ' . htmlspecialchars($name) . '! 🎉
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Great news! Your STI Archives account has been verified and is now <strong>active</strong>.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid ' . self::$companyBranding['primaryColor'] . '; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: ' . self::$companyBranding['secondaryColor'] . '; margin: 0 0 15px 0; font-size: 18px;">
                    📚 What You Can Do Now
                </h3>
                <ul style="color: #555555; line-height: 1.8; margin: 0; padding-left: 20px;">
                    <li>Access the digital library and browse research papers</li>
                    <li>Save articles to your personal collection</li>
                    <li>View and download capstone projects</li>
                    <li>Search through all available studies</li>
                </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="' . self::$companyBranding['website'] . '" 
                   style="display: inline-block; background-color: ' . self::$companyBranding['primaryColor'] . '; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    🚀 Login to STI Archives
                </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                If you have any questions or need assistance, please don\'t hesitate to contact our support team.
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
    
    /**
     * Send Account Approval Email
     * "Your account has been verified!"
     */
    public static function sendAccountApprovalEmail($userData, $verificationCode = 'APPROVED') {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $subject = '✅ STI Archives - Your account has been verified!';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Hi ' . htmlspecialchars($name) . ', great news! 🎉
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Your registration is now <strong>complete</strong>. You can now login to your account.
            </p>
            
            <div style="background-color: #d4edda; border-left: 4px solid #28a745; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #155724; font-size: 14px; margin: 0; line-height: 1.6;">
                    <strong>✅ We\'re glad to have you with us!</strong>
                </p>
            </div>
            
            <p style="color: #333333; font-size: 16px; margin: 20px 0;">
                You can now access all features of STI Archives including:
            </p>
            
            <ul style="color: #555555; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                <li>Research papers from previous school years</li>
                <li>Capstone projects from ITMAWD and other programs</li>
                <li>Easy search and filtering capabilities</li>
                <li>Personal saved articles collection</li>
            </ul>
            
            <p style="color: #666666; font-size: 14px; margin: 30px 0 0 0;">
                If you have any questions, feel free to reach out to our support team.
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
    
    /**
     * Send Account Rejection Email
     * "Regarding your account request"
     */
    public static function sendAccountRejectionEmail($userData, $reason = '') {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $subject = '📋 STI Archives - Regarding your account request';
        
        $reasonHtml = $reason ? '<p style="color: #333333; font-size: 14px; margin: 10px 0;"><strong>Reason:</strong> ' . htmlspecialchars($reason) . '</p>' : '';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Hi ' . htmlspecialchars($name) . ',
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Thank you for your interest in <strong>STI Archives</strong>.
            </p>
            
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #721c24; font-size: 14px; margin: 0; line-height: 1.6;">
                    After reviewing your application, we are <strong>unable to approve your account at this time</strong>. This is typically due to:
                </p>
                <ul style="color: #721c24; font-size: 14px; margin: 10px 0 0 0; padding-left: 20px; line-height: 1.8;">
                    <li>Incomplete or invalid credentials</li>
                    <li>Failure to meet our current eligibility criteria</li>
                    <li>Duplicate account registration</li>
                </ul>
            </div>
            
            ' . $reasonHtml . '
            
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                If you believe this was an error or would like to provide more information, please reply to this email or contact our support team.
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Admin Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
    
    /**
     * Send Account Ban Email
     * "Your account has been banned"
     */
    public static function sendAccountBanEmail($userData, $reason = '') {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $subject = '🚫 STI Archives - Account Banned';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Hello, ' . htmlspecialchars($name) . '
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We regret to inform you that your <strong>STI Archives</strong> account has been <strong>banned</strong>.
            </p>
            
            <div style="background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: #721c24; margin: 0 0 10px 0; font-size: 18px;">
                    ⚠️ Account Banned
                </h3>
                <p style="color: #721c24; font-size: 14px; margin: 0; line-height: 1.6;">
                    Your access to STI Archives has been permanently revoked. You will no longer be able to login or access any resources.
                </p>
            </div>';
        
        if ($reason) {
            $content .= '
            <div style="background-color: #f8f9fa; border-left: 4px solid ' . self::$companyBranding['primaryColor'] . '; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <h3 style="color: ' . self::$companyBranding['secondaryColor'] . '; margin: 0 0 10px 0; font-size: 16px;">
                    Reason for ban:
                </h3>
                <p style="color: #555555; font-size: 14px; margin: 0; line-height: 1.6;">
                    ' . htmlspecialchars($reason) . '
                </p>
            </div>';
        }
        
        $content .= '
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                If you believe this was a mistake or would like to appeal this decision, please contact the STI Archives administration.
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
    
    /**
     * Send Password Reset Email
     */
    public static function sendPasswordResetEmail($userData, $resetToken) {
        $email = $userData['email'] ?? '';
        $fullname = $userData['fullname'] ?? $userData['name'] ?? 'User';
        
        $resetUrl = (defined('SITE_URL') ? SITE_URL : 'http://localhost:5500') . '/reset-password.html?token=' . urlencode($resetToken);
        
        $subject = '🔐 STI Archives - Password Reset Request';
        
        $content = '
            <h2 style="color: ' . self::$companyBranding['primaryColor'] . '; margin: 0 0 20px 0; font-size: 24px;">
                Hi ' . htmlspecialchars($name) . ',
            </h2>
            
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                We received a request to reset your STI Archives password.
            </p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid ' . self::$companyBranding['primaryColor'] . '; padding: 20px; margin: 25px 0; border-radius: 4px;">
                <p style="color: #333333; font-size: 14px; margin: 0 0 10px 0;">
                    <strong>Click the button below to reset your password:</strong>
                </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="' . $resetUrl . '" 
                   style="display: inline-block; background-color: ' . self::$companyBranding['primaryColor'] . '; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                    🔑 Reset Password
                </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                <strong>Note:</strong> This link will expire in 1 hour.
            </p>
            
            <p style="color: #666666; font-size: 14px; margin: 20px 0;">
                If you didn\'t request a password reset, please ignore this email. Your password will remain unchanged.
            </p>
            
            <p style="color: #333333; font-size: 16px; margin: 30px 0 0 0;">
                Best regards,<br>
                <strong style="color: ' . self::$companyBranding['primaryColor'] . ';">The STI Archives Team</strong>
            </p>
        ';
        
        $htmlContent = self::getEmailTemplate($content);
        
        return self::sendEmail($email, $subject, $htmlContent);
    }
}
