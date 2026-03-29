/**
 * STI Archives API - Users Routes
 * Handles user management with Supabase
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { config, isSupabaseConfigured } = require('../../config/index.js');
const { getServiceSupabase } = require('../../services/supabase.js');

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
    // Parse query params for filtering
    const url = new URL(req.url, `http://${req.headers.host}`);
    const status = url.searchParams.get('status'); // pending, approved, rejected, banned
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      if (!supabase) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: 'Supabase service client not initialized. Check SUPABASE_SERVICE_ROLE_KEY.' }));
        return;
      }
      let query = supabase
        .from('users')
        .select('id, email, fullname, role, verified, created_at, updated_at, section, strand, permissions, access_level, isActive, banned, rejected');
      
      // Apply filters
      if (status === 'pending') {
        query = query.eq('verified', false).eq('role', 'pending');
      } else if (status === 'approved') {
        query = query.eq('verified', true).neq('role', 'pending');
      } else if (status === 'banned') {
        query = query.eq('banned', true);
      } else if (status === 'rejected') {
        query = query.eq('rejected', true);
      }
      
      if (role) {
        query = query.eq('role', role);
      }
      
      if (search) {
        query = query.or(`fullname.ilike.%${search}%,email.ilike.%${search}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, users: data || [] }));
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
    console.error('Error getting users:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
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
  
  // Route based on method
  if (req.method === 'GET') {
    await handleGetUsers(req, res);
  } else if (req.method === 'POST') {
    await handleCreateUser(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};

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
      
      // Get total users (verified or active, excluding admin roles)
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select('id, role, verified, isActive, banned, rejected');
      
      if (allError) throw allError;
      
      // Calculate counts based on the same logic as frontend
      const totalUsers = allUsers.filter(u => 
        (u.isActive || u.verified) && 
        !['admin', 'coadmin', 'subadmin'].includes(u.role)
      ).length;
      
      const adminUsers = allUsers.filter(u => 
        ['admin', 'coadmin', 'subadmin'].includes(u.role)
      ).length;
      
      const newSignups = allUsers.filter(u => 
        !u.isActive && !u.verified && !u.rejected && !u.banned && 
        !['admin', 'coadmin', 'subadmin'].includes(u.role)
      ).length;
      
      const bannedUsers = allUsers.filter(u => u.banned).length;
      
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        counts: {
          totalUsers,
          adminUsers,
          newSignups,
          bannedUsers
        }
      }));
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
