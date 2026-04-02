/**
 * STI Archives API - Users Routes
 * Handles user management with Supabase
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const path = require('path');
const { config } = require(path.resolve(__dirname, '../../config/index.js'));
const { getServiceSupabase, isSupabaseConfigured } = require(path.resolve(__dirname, '../../services/supabase.js'));

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Handle OPTIONS preflight
function handleOptions(res) {
  setCorsHeaders(res);
  res.statusCode = 200;
  res.end();
}

// Generate JWT token
function generateToken(user) {
  const jwt = require('jsonwebtoken');
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.fullname
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
}

// Verify JWT token
function verifyToken(token) {
  const jwt = require('jsonwebtoken');
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

// Check if user is admin
function isAdmin(user) {
  return user && ['admin', 'coadmin'].includes(user.role);
}

// GET /api/users - Get all users (with optional filtering)
async function handleGetUsers(req, res) {
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
      // Parse query params for filtering from Vercel/Edge where host may not be present
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || process.env.VERCEL_URL || 'localhost:3001';
      const url = new URL(req.url || '/', `${protocol}://${host}`);
      const status = url.searchParams.get('status'); // pending, approved, rejected, banned
      const role = url.searchParams.get('role');
      const search = url.searchParams.get('search');

      if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      if (!supabase) {
        // Fallback: return empty array if service client is not available
        res.statusCode = 200;
        res.end(JSON.stringify({ 
          success: true, 
          users: [],
          message: 'Supabase service client not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.'
        }));
        return;
      }
      const defaultSelectFields = 'id, email, fullname, role, user_type, verified, created_at, updated_at';
      const noMetaSelectFields = 'id, email, fullname, role, user_type, verified';
      let query = supabase
        .from('users')
        .select(defaultSelectFields);

      // Apply filters (banned/rejected may not exist in some schemas)
      if (status === 'pending') {
        query = query.eq('verified', false).or('role.eq.pending,user_type.is.null');
      } else if (status === 'approved') {
        query = query.eq('verified', true).neq('role', 'pending');
      } else if (status === 'banned') {
        try {
          query = query.eq('banned', true);
        } catch (err) {
          // Column may not exist; produce no rows for banned if unsupported
          query = query.eq('id', '');
        }
      } else if (status === 'rejected') {
        try {
          query = query.eq('rejected', true);
        } catch (err) {
          query = query.eq('id', '');
        }
      }

      if (role) {
        query = query.eq('user_type', role);
      }
      } else if (status === 'rejected') {
        try {
          query = query.eq('rejected', true);
        } catch (err) {
          query = query.eq('id', '');
        }
      }
      
      if (role) {
        query = query.eq('role', role);
      }
      
      if (search) {
        query = query.or(`fullname.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      let data, error;
      ({ data, error } = await query);
      
      if (error && error.code === '42703') {
        // Missing column in schema: retry with reduced projection
        console.warn('Supabase users query 42703; retrying with less fields', error.message);
        query = supabase.from('users').select(noMetaSelectFields).order('created_at', { ascending: false });
        ({ data, error } = await query);
      }
      
      if (error) throw error;

      // Map database fields to frontend expected format
      const users = (data || []).map(user => {
        // Use the role field for frontend role (admin, coadmin, subadmin, etc.)
        let role = user.role;

        // Debug admin users
        if (user.fullname && (user.fullname.includes('admin') || role === 'admin' || role === 'coadmin' || role === 'subadmin')) {
          console.log('DEBUG API: Admin user mapping:', user.fullname, 'user_type:', user.user_type, 'role:', user.role, 'mapped_role:', role, 'verified:', user.verified);
        }

        return {
          ...user,
          role: role
        };
      });

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, users }));
    } else {
      // Fallback: return mock data
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        users: [],
        message: 'Supabase not configured - using fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error getting users:', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      headers: req.headers
    });
    res.statusCode = 500;
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      details: (process.env.NODE_ENV !== 'production') ? error.stack : undefined
    }));
  }
}

// POST /api/users - Create new user (admin only or self-registration)
async function handleCreateUser(req, res) {
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
    const { email, password, fullname, role, section, strand, permissions, access_level } = req.body;

    if (!email || !password || !fullname) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing required fields: email, password, fullname' }));
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const activationToken = uuidv4();

    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      fullname: fullname,
      role: role || 'user',
      verified: role === 'admin' || role === 'coadmin' ? true : false,
      activation_token: activationToken,
      section: section || '',
      strand: strand || '',
      permissions: permissions || '',
      access_level: access_level || '',
      isActive: true,
      banned: false,
      rejected: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      // Check if user already exists
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .single();
      
      if (existing) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'User with this email already exists' }));
        return;
      }
      
      const { data, error } = await supabase
        .from('users')
        .insert([newUser])
        .select()
        .single();
      
      if (error) throw error;
      
      // Remove password from response
      delete data.password;
      
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        user: { ...newUser, password: undefined },
        message: 'Supabase not configured - user created in fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error creating user:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// Main handler
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  // Check if this is a count request
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.endsWith('/count') || url.pathname.includes('/count')) {
    await handleGetUserCounts(req, res);
    return;
  }
  
  // Check for debug endpoint
  if (req.method === 'GET' && url.pathname.includes('/debug')) {
    await handleDebugUsers(req, res);
    return;
  }

  // Route based on method
  if (req.method === 'GET') {
    await handleGetUsers(req, res);
  } else if (req.method === 'POST') {
    await handleCreateUser(req, res);
  } else if (req.method === 'PUT') {
    await handleUpdateUser(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};

// PUT /api/users - Update user (admin only)
async function handleUpdateUser(req, res) {
  setCorsHeaders(res);

  if (req.method !== 'PUT') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { user_id, student_id, name, email, role, admin_role, permissions } = req.body;

    if (!user_id && !student_id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'User ID is required' }));
      return;
    }

    const userId = user_id || student_id;

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();

      // Prepare update data
      const updateData = {};
      if (name) updateData.fullname = name;
      if (email) updateData.email = email.toLowerCase();
      if (role) updateData.user_type = role; // Map role to user_type
      if (admin_role) updateData.user_type = admin_role; // Alternative field
      if (permissions) updateData.permissions = permissions;

      console.log('Updating user:', userId, 'with data:', updateData);

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        user: data,
        message: 'User updated successfully'
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Supabase not configured - update simulated'
      }));
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/users/debug - Debug endpoint to see raw user data
async function handleDebugUsers(req, res) {
  setCorsHeaders(res);

  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(10);

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        users: data,
        count: data?.length || 0
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Supabase not configured',
        users: []
      }));
    }
  } catch (error) {
    console.error('Debug users error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/users/count - Get user counts for dashboard
async function handleGetUserCounts(req, res) {
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
    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      if (!supabase) {
        // Fallback: return zeros if service client is not available
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          counts: {
            totalUsers: 0,
            adminUsers: 0,
            newSignups: 0,
            bannedUsers: 0
          },
          message: 'Supabase service client not configured. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.'
        }));
        return;
      }
      
      // Get total users (verified or active, excluding admin roles)
      let { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, role, user_type, verified, isActive, banned, rejected');

      if (allError && allError.code === '42703') {
        // isActive field may not exist in older/newer schemas; fall back to verified + admin roles
        console.warn('Supabase users count query missing isActive; falling back to verified-only logic');
        ({ data: allUsers, error: allError } = await supabase
          .from('users')
          .select('id, role, user_type, verified, banned, rejected'));
      }

      if (allError) throw allError;
      
      // Calculate counts based on user_type
      console.log('DEBUG API: All users for counting:', allUsers.map(u => ({ id: u.id, user_type: u.user_type, role: u.role, verified: u.verified })));

      const totalUsers = allUsers.filter(u => u.user_type === 'user').length;
      const adminUsers = allUsers.filter(u => u.user_type === 'admin').length;
      const newSignups = allUsers.filter(u =>
        u.user_type === 'user' && !u.verified && !u.rejected && !u.banned
      ).length;

      const bannedUsers = allUsers.filter(u => u.banned).length;

      const result = {
        success: true,
        counts: {
          totalUsers,
          adminUsers,
          newSignups,
          bannedUsers
        }
      };

      console.log('DEBUG API: Calculated counts:', result.counts);

      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        counts: {
          totalUsers: 0,
          adminUsers: 0,
          newSignups: 0,
          bannedUsers: 0
        },
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting user counts:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}
