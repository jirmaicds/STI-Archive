/**
 * STI Archives API - Authentication Routes
 * Supports Supabase Auth and custom user management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, isSupabaseConfigured } = require('../config/index.js');
const { getServiceSupabase } = require('../../services/supabase.js');
const emailService = require('../services/EmailService.js');

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Handle OPTIONS preflight
function handleOptions(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.statusCode = 200;
  res.end();
}

// Generate JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

// Middleware to check auth
function checkAuth(req, res) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  return verifyToken(token);
}

// POST /api/auth/register
async function handleRegister(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { email, password, fullname, role } = req.body;

    if (!email || !password || !fullname) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    // Note: activation_token is kept in DB but not used for activation
    // Admin will manually approve users via /api/users/status
    const activationToken = uuidv4();

    // Create user object
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullname: fullname,
      role: role || 'pending', // pending, user, admin, coadmin, subadmin
      verified: false,
      activation_token: activationToken,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) throw error;
      
      // Send welcome email (not activation - admin will manually approve)
      await emailService.sendWelcomeEmail(email, fullname);
      
      res.statusCode = 201;
      res.end(JSON.stringify({
        success: true,
        message: 'Registration successful! Welcome to STI Archives. Please wait for admin approval.',
        user: { id: data.id, email: data.email, fullname: data.fullname, role: data.role }
      }));
    } else {
      // Fallback to local storage simulation (for development)
      res.statusCode = 201;
      res.end(JSON.stringify({
        success: true,
        message: 'Registration successful (dev mode).',
        user: { id: userId, email, fullname, role: 'pending' }
      }));
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/login
async function handleLogin(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { email, password, fullname } = req.body;
    
    // Support both email and fullname login
    const loginField = email || fullname;
    
    if (!loginField || !password) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing credentials' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      // Find user by email or fullname
      let query = supabase
        .from('users')
        .select('*')
        .eq('email', loginField.toLowerCase());
      
      const { data: users, error } = await query;
      
      if (error) throw error;
      
      if (!users || users.length === 0) {
        // Try fullname lookup
        const { data: nameUsers } = await supabase
          .from('users')
          .select('*')
          .eq('fullname', loginField);
        
        if (!nameUsers || nameUsers.length === 0) {
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
          return;
        }
        var user = nameUsers[0];
      } else {
        var user = users[0];
      }

      const validPassword = await bcrypt.compare(password, user.password);
      
      if (!validPassword) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
        return;
      }

      // Check if user is verified
      if (!user.verified && user.role !== 'admin' && user.role !== 'coadmin') {
        res.statusCode = 403;
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Account not activated. Please check your email.' 
        }));
        return;
      }

      const token = generateToken(user);
      
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        token: token,
        user: {
          id: user.id,
          email: user.email,
          fullname: user.fullname,
          role: user.role,
          verified: user.verified
        }
      }));
    } else {
      // Dev mode fallback
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        token: 'dev-token',
        user: { 
          id: 'dev-id', 
          email: loginField, 
          fullname: loginField, 
          role: 'admin',
          verified: true 
        }
      }));
    }
  } catch (error) {
    console.error('Login error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/auth/profile
async function handleProfile(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const auth = checkAuth(req, res);
    if (!auth) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, email, fullname, role, verified, created_at')
        .eq('id', auth.id)
        .single();

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        user: { 
          id: auth.id, 
          email: auth.email, 
          fullname: auth.name, 
          role: auth.role 
        } 
      }));
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/forgot-password
async function handleForgotPassword(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Email is required' }));
      return;
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetToken = uuidv4();

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      // Update user with reset token
      const { error } = await supabase
        .from('users')
        .update({ 
          reset_token: resetToken, 
          reset_code: resetCode,
          reset_expires: new Date(Date.now() + 3600000).toISOString() // 1 hour
        })
        .eq('email', email.toLowerCase());

      if (error) throw error;

      // Send email
      await emailService.sendPasswordResetEmail(email, resetCode, resetToken);
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ 
      success: true, 
      message: 'Password reset instructions sent to your email' 
    }));
  } catch (error) {
    console.error('Forgot password error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/reset-password
async function handleResetPassword(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { code, newPassword } = req.body;
    
    if (!code || !newPassword) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Code and new password required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      // Find user with reset code
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('reset_code', code);

      if (error) throw error;
      
      if (!users || users.length === 0) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Invalid reset code' }));
        return;
      }

      const user = users[0];
      
      // Check expiry
      if (new Date(user.reset_expires) < new Date()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Reset code expired' }));
        return;
      }

      // Update password
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          reset_token: null,
          reset_code: null,
          reset_expires: null
        })
        .eq('id', user.id);

      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Password reset successful' 
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Password reset successful (dev mode)' 
      }));
    }
  } catch (error) {
    console.error('Reset password error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/verify-reset-code
async function handleVerifyResetCode(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { code } = req.body;
    
    if (!code) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Code is required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('reset_code', code);

      if (error) throw error;
      
      if (!users || users.length === 0) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Invalid reset code' }));
        return;
      }

      const user = users[0];
      
      if (new Date(user.reset_expires) < new Date()) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Reset code expired' }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, valid: true }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, valid: true }));
    }
  } catch (error) {
    console.error('Verify reset code error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/auth/activate
async function handleActivate(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  try {
    const { token } = req.query;
    
    if (!token) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Activation token required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('activation_token', token);

      if (error) throw error;
      
      if (!users || users.length === 0) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Invalid activation token' }));
        return;
      }

      // Activate user
      await supabase
        .from('users')
        .update({ 
          verified: true,
          activation_token: null,
          role: 'user' // Default role for activated users
        })
        .eq('id', users[0].id);

      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Account activated successfully' 
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Account activated (dev mode)' 
      }));
    }
  } catch (error) {
    console.error('Activation error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/approve-user
async function handleApproveUser(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const auth = checkAuth(req, res);
    if (!auth) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Check if admin
    if (auth.role !== 'admin' && auth.role !== 'coadmin') {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Admin access required' }));
      return;
    }

    const { email, action, reason } = req.body;
    
    if (!email || !action) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Email and action required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase());

      if (error) throw error;
      
      if (!users || users.length === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'User not found' }));
        return;
      }

      const user = users[0];

      if (action === 'approve') {
        await supabase
          .from('users')
          .update({ verified: true, role: 'user' })
          .eq('id', user.id);

        await emailService.sendApprovalNotification(user.email, user.fullname);
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'User approved' }));
      } else if (action === 'reject') {
        await supabase
          .from('users')
          .update({ verified: false, role: 'rejected' })
          .eq('id', user.id);

        await emailService.sendRejectionNotification(user.email, user.fullname, reason);
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'User rejected' }));
      } else if (action === 'ban') {
        await supabase
          .from('users')
          .update({ verified: false, role: 'banned' })
          .eq('id', user.id);
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'User banned' }));
      } else {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'Invalid action' }));
      }
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: `User ${action} (dev mode)` }));
    }
  } catch (error) {
    console.error('Approve user error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/auth/logout
async function handleLogout(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  // JWT tokens are stateless, so we just return success
  // Frontend should remove the token from localStorage
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Logged out successfully' }));
}

// Export individual handlers for Vercel
module.exports = {
  handleRegister,
  handleLogin,
  handleProfile,
  handleForgotPassword,
  handleResetPassword,
  handleVerifyResetCode,
  handleActivate,
  handleApproveUser,
  handleLogout
};