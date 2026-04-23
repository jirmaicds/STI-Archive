/**
 * STI Archives API - Authentication Routes
 * Supports Supabase Auth and custom user management
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { config, isSupabaseConfigured } = require('../config/index.js');
const path = require('path');
const { getServiceSupabase } = require(path.resolve(__dirname, '../../services/supabase.js'));
const emailService = require(path.resolve(__dirname, '../services/EmailService.js'));

// Helper to get current time in Philippine timezone as ISO string
function getPhilippineISOString(date = new Date()) {
  const philippineOffset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const philippineTime = new Date(date.getTime() + philippineOffset);
  return philippineTime.toISOString();
}

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
    role: user.user_type,
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

// Verify Supabase Auth token via Service Role client
async function verifySupabaseToken(token) {
  if (!token) {
    return null;
  }
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) {
    return null;
  }
  return data.user;
}

// Middleware to check auth (custom app JWT)
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

  // Parse JSON data with base64 file
  const { email, password, fullname, role, grade, section, section_degree, file, filename, mimetype } = req.body;

  if (!email || !password || !fullname) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'Missing required fields' }));
    return;
  }

  // Prevent signing up as admin roles
  if (role === 'admin' || role === 'coadmin' || role === 'subadmin') {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'Invalid role selected' }));
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const activationToken = uuidv4();

    // Create user object (let SERIAL auto-assign integer id)
    const userRole = role || 'pending';
    const isAdminRole = userRole === 'admin' || userRole === 'coadmin' || userRole === 'subadmin';

    const newUser = {
      email: email.toLowerCase(),
      password: hashedPassword,
      fullname: fullname,
      role: userRole,
           user_type: 'user',
      verified: isAdminRole,  // Admin roles are verified immediately
      isactive: isAdminRole,  // Admin roles are active immediately
      new_user: !isAdminRole,  // Regular users are new users initially
      rejected_user: false,   // No one starts as rejected
      banned_user: false,     // No one starts as banned
       grade: grade || null,
       Sec_Degr: section_degree || section || null,
       strand: section_degree || section || null,
       section: section_degree || section || null,
      registration_assessment_form: null,
      educator_id: null,
      activation_token: activationToken,
      created_at: getPhilippineISOString()
    };
    console.log('Creating user with verified:', newUser.verified);

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();

      if (error) throw error;
      console.log('Inserted user verified:', data.verified);

      const userId = data.id; // Use the auto-assigned integer ID

      // Upload file if present
      if (file && filename && mimetype) {
        const buffer = Buffer.from(file, 'base64');
        const fileExt = filename.split('.').pop();
        const fileName = `${userId}.${fileExt}`;
        const filePath = `Raf/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, buffer, {
            contentType: mimetype,
            upsert: false
          });

        if (uploadError) throw uploadError;

        const fileUrl = `https://eopbqatvianrjkdbypvk.supabase.co/storage/v1/object/public/uploads/${filePath}`;

        // Update user with file URL
        const isEducator = userRole === 'educator';
        const { error: updateError } = await supabase
          .from('users')
          .update({ [isEducator ? 'educator_id' : 'registration_assessment_form']: fileUrl })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      // Send welcome email (not activation - admin will manually approve)
      await emailService.sendWelcomeEmail(email, fullname);

      res.statusCode = 201;
      res.end(JSON.stringify({
        success: true,
        message: 'Registration submitted successfully! Your account is pending admin approval. You will receive an email once approved.',
        user: { id: userId, email: data.email, fullname: data.fullname, role: data.role }
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
    console.log('Login attempt:', { hasEmail: !!email, hasFullname: !!fullname, loginField: email || fullname });

    // Support both email and fullname login
    const loginField = email || fullname;

    if (!loginField || !password) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing credentials' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();

      console.log('Attempting email lookup for:', loginField.toLowerCase());
      // Find user by email or fullname
      let query = supabase
        .from('users')
        .select('*')
        .eq('email', loginField.toLowerCase());

      const { data: users, error } = await query;

      if (error) {
        console.error('Email lookup error:', error);
        throw error;
      }

      console.log('Email lookup results:', users?.length || 0, 'users found');

      if (!users || users.length === 0) {
        // Try fullname lookup (case-insensitive)
        console.log('Attempting fullname lookup for:', loginField);
        const { data: nameUsers } = await supabase
          .from('users')
          .select('*')
          .ilike('fullname', loginField);

        if (!nameUsers || nameUsers.length === 0) {
          console.log('No users found with fullname either');
          res.statusCode = 401;
          res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
          return;
        }
        var user = nameUsers[0];
        console.log('Found user by fullname:', user.email, user.fullname);
      } else {
        var user = users[0];
        console.log('Found user by email:', user.email, user.fullname);
      }

      console.log('Checking password for user:', user.email);
      const validPassword = await bcrypt.compare(password, user.password);
      console.log('Password valid:', validPassword);

      if (!validPassword) {
        console.log('Invalid password for user:', user.email);
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Invalid credentials' }));
        return;
      }

      // Check if user is active
      // Allow login for active users or admin/coadmin/subadmin roles
      console.log('User active check:', { isactive: user.isactive, user_type: user.user_type, role: user.role });
      const isAdminRole = user.role === 'admin' || user.role === 'coadmin' || user.role === 'subadmin';
      if (!user.isactive && !isAdminRole) {
        console.log('User not active and not admin role - blocking login');
        res.statusCode = 403;
        res.end(JSON.stringify({
          success: false,
          error: 'Account not active. Please wait for admin approval to access the system.'
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
          role: user.user_type,
          isactive: user.isactive
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
          role: 'user',
          isactive: false
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
    let profile = null;

    if (!auth) {
      // Try Supabase Auth token
      const authHeader = req.headers.authorization;
      const supabaseToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
      const result = await verifySupabaseToken(supabaseToken);
      if (!result) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      profile = result;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const userId = profile ? profile.id : auth.id;
      const { data, error } = await supabase
        .from('users')
        .select('id, email, fullname, user_type as role, verified, created_at')
        .eq('id', userId)
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
          reset_expires: getPhilippineISOString(new Date(Date.now() + 3600000)) // 1 hour
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
          .update({ verified: true, role: 'user', isactive: true, new_user: false, rejected_user: false, banned_user: false })
          .eq('id', user.id);

        await emailService.sendApprovalNotification(user.email, user.fullname);
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'User approved' }));
      } else if (action === 'reject') {
        await supabase
          .from('users')
          .update({ verified: false, role: 'rejected', isactive: false, new_user: false, rejected_user: true, banned_user: false })
          .eq('id', user.id);

        await emailService.sendRejectionNotification(user.email, user.fullname, reason);
        
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'User rejected' }));
      } else if (action === 'ban') {
        await supabase
          .from('users')
          .update({ verified: false, role: 'banned', isactive: false, new_user: false, rejected_user: false, banned_user: true })
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