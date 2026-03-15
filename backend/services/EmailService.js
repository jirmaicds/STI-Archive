/**
 * Email Service for STI Archives
 * Handles password reset, account activation, and notifications
 */

const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'stiarchivesorg@gmail.com',
    pass: process.env.EMAIL_PASS || ''
  }
};

// Create transporter
let transporter;

function getTransporter() {
  if (!transporter && emailConfig.auth.user && emailConfig.auth.pass) {
    transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: emailConfig.auth
    });
  }
  return transporter;
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetCode, resetToken) {
  const siteUrl = process.env.SITE_URL || 'https://stiarchives.x10.mx';
  const mailOptions = {
    from: `"STI Archives" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Password Reset - STI Archives',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Password Reset Request</h2>
        <p>You requested a password reset for your STI Archives account.</p>
        <p>Your reset code is: <strong style="font-size: 18px; color: #007bff;">${resetCode}</strong></p>
        <p>This code will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">STI Archives System</p>
      </div>
    `
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send account activation email
 */
async function sendActivationEmail(email, activationToken, userName) {
  const siteUrl = process.env.SITE_URL || 'https://stiarchives.x10.mx';
  const activationUrl = `${siteUrl}/api/auth/activate?token=${activationToken}`;
  
  const mailOptions = {
    from: `"STI Archives" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Activate Your Account - STI Archives',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Welcome to STI Archives, ${userName}!</h2>
        <p>Your account has been created. Please activate it by clicking the link below:</p>
        <p><a href="${activationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 5px;">Activate Account</a></p>
        <p>Or copy this link: ${activationUrl}</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">STI Archives System</p>
      </div>
    `
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending activation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send account approval notification
 */
async function sendApprovalNotification(email, userName) {
  const siteUrl = process.env.SITE_URL || 'https://stiarchives.x10.mx';
  
  const mailOptions = {
    from: `"STI Archives" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Account Approved - STI Archives',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Your Account Has Been Approved!</h2>
        <p>Hello ${userName},</p>
        <p>Your STI Archives account has been approved. You can now log in and access all features.</p>
        <p><a href="${siteUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; display: inline-block; border-radius: 5px;">Login Now</a></p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">STI Archives System</p>
      </div>
    `
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending approval notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send rejection notification
 */
async function sendRejectionNotification(email, userName, reason) {
  const mailOptions = {
    from: `"STI Archives" <${emailConfig.auth.user}>`,
    to: email,
    subject: 'Account Rejected - STI Archives',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Account Rejection Notice</h2>
        <p>Hello ${userName},</p>
        <p>Your STI Archives account registration has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you believe this is an error, please contact the administrator.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">STI Archives System</p>
      </div>
    `
  };

  try {
    const result = await getTransporter().sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending rejection notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getTransporter,
  sendPasswordResetEmail,
  sendActivationEmail,
  sendApprovalNotification,
  sendRejectionNotification
};