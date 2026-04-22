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
      const limit = parseInt(url.searchParams.get('limit')) || 50;
      const offset = parseInt(url.searchParams.get('offset')) || 0;

      if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      if (!supabase) {
        // Fallback: return mock data if service client is not available
        const mockUsers = [
          { id: 1, fullname: 'John Doe', email: 'john@example.com', role: 'user', user_type: 'user', verified: true, new_user: false, rejected_user: false, banned_user: false, created_at: '2023-01-01T00:00:00Z' },
          { id: 2, fullname: 'Jane Smith', email: 'jane@example.com', role: 'user', user_type: 'user', verified: false, new_user: true, rejected_user: false, banned_user: false, created_at: '2023-01-02T00:00:00Z' },
          { id: 3, fullname: 'Bob Johnson', email: 'bob@example.com', role: 'user', user_type: 'user', verified: true, new_user: false, rejected_user: false, banned_user: false, created_at: '2023-01-03T00:00:00Z' },
          { id: 4, fullname: 'Alice Brown', email: 'alice@example.com', role: 'user', user_type: 'user', verified: false, new_user: true, rejected_user: false, banned_user: false, created_at: '2023-01-04T00:00:00Z' },
          { id: 5, fullname: 'Charlie Wilson', email: 'charlie@example.com', role: 'user', user_type: 'user', verified: true, new_user: false, rejected_user: false, banned_user: false, created_at: '2023-01-05T00:00:00Z' },
          { id: 6, fullname: 'Diana Davis', email: 'diana@example.com', role: 'user', user_type: 'user', verified: false, new_user: true, rejected_user: false, banned_user: false, created_at: '2023-01-06T00:00:00Z' },
          { id: 7, fullname: 'Eve Miller', email: 'eve@example.com', role: 'user', user_type: 'user', verified: true, new_user: false, rejected_user: false, banned_user: false, created_at: '2023-01-07T00:00:00Z' },
          { id: 8, fullname: 'Frank Garcia', email: 'frank@example.com', role: 'user', user_type: 'user', verified: false, new_user: true, rejected_user: false, banned_user: false, created_at: '2023-01-08T00:00:00Z' },
          { id: 9, fullname: 'Grace Lee', email: 'grace@example.com', role: 'user', user_type: 'user', verified: true, new_user: false, rejected_user: false, banned_user: false, created_at: '2023-01-09T00:00:00Z' },
          { id: 10, fullname: 'Henry Taylor', email: 'henry@example.com', role: 'user', user_type: 'user', verified: false, new_user: true, rejected_user: false, banned_user: false, created_at: '2023-01-10T00:00:00Z' }
        ];
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          users: mockUsers,
          total: mockUsers.length,
          message: 'Supabase service client not configured. Using mock data. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.'
        }));
        return;
      }
      const defaultSelectFields = 'id, email, fullname, role, user_type, verified, new_user, rejected_user, banned_user, created_at, updated_at';
      const noMetaSelectFields = 'id, email, fullname, role, user_type, verified, new_user, rejected_user, banned_user';
      let query = supabase
        .from('users')
        .select(defaultSelectFields, { count: 'exact' });

      // Apply filters using boolean status columns
      if (status === 'pending') {
        query = query.eq('new_user', true);
      } else if (status === 'approved') {
        query = query.eq('verified', true).eq('new_user', false).eq('rejected_user', false).eq('banned_user', false);
      } else if (status === 'banned') {
        query = query.eq('banned_user', true);
      } else if (status === 'rejected') {
        query = query.eq('rejected_user', true);
      }

      if (role) {
        query = query.eq('user_type', role);
      }
      
      if (search) {
        query = query.or(`fullname.ilike.%${search}%,email.ilike.%${search}%`);
      }

      query = query.order('created_at', { ascending: false });
      query = query.range(offset, offset + limit - 1);

      let data, error, count;
      ({ data, error, count } = await query);
      
      if (error && error.code === '42703') {
        // Missing column in schema: retry with reduced projection
        console.warn('Supabase users query 42703; retrying with less fields', error.message);
        query = supabase.from('users').select(noMetaSelectFields, { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + limit - 1);
        ({ data, error, count } = await query);
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
      res.end(JSON.stringify({ success: true, users, total: count || 0, limit, offset }));
      } else {
        // Fallback: return mock data
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          users: [],
          total: 0,
          limit,
          offset,
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
      isactive: true,
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
    const { user_id, student_id, name, email, role, admin_role, permissions, verified, new_user, rejected_user, banned_user } = req.body;

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
      if (verified !== undefined) updateData.verified = verified;
      if (new_user !== undefined) updateData.new_user = new_user;
      if (rejected_user !== undefined) updateData.rejected_user = rejected_user;
      if (banned_user !== undefined) updateData.banned_user = banned_user;

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
    if (!isSupabaseConfigured()) {
      // Fallback: return mock counts if service client is not available
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        counts: {
          adminUsers: 0,
          newSignups: 5,
          usersCount: 10,
          verifiedUsers: 5
        },
        message: 'Supabase not configured'
      }));
      return;
    }

    const supabase = getServiceSupabase();

    if (!supabase) {
      // Fallback: return mock counts if service client is not available
      res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          counts: {
            adminUsers: 0,
            newSignups: 5,
            usersCount: 10,
            verifiedUsers: 5
          },
          message: 'Supabase service client not configured. Using mock counts. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.'
        }));
      return;
    }

      // Get all users for counting (include banned_user, rejected_user as they exist)
      const selectFields = 'id, email, fullname, role, user_type, verified, banned_user, rejected_user';
      const hasBannedColumn = true;
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select(selectFields);

      if (allError) throw allError;

      // Calculate counts based on user_type
      console.log('DEBUG API: All users for counting:', allUsers.map(u => ({ id: u.id, user_type: u.user_type, role: u.role, verified: u.verified })));

      const userTypeUsers = allUsers.filter(u => u.user_type === 'user').length;
      const adminUsers = allUsers.filter(u => ['admin', 'coadmin', 'subadmin'].includes(u.role)).length;
      const newSignups = allUsers.filter(u => u.new_user === true).length;
      const bannedUsers = hasBannedColumn ? allUsers.filter(u => u.banned_user || false).length : 0;
      const verifiedUsers = allUsers.filter(u => u.verified === true).length;

    const result = {
      success: true,
      counts: {
        adminUsers,
        newSignups,
        bannedUsers,
        usersCount: userTypeUsers,
        verifiedUsers
      }
    };

    console.log('DEBUG API: Calculated counts:', result.counts);

    res.statusCode = 200;
    res.end(JSON.stringify(result));
      
      // Get all users for counting (include banned_user, rejected_user as they exist)
      const selectFields = 'id, email, fullname, role, user_type, verified, banned_user, rejected_user';
      const hasBannedColumn = true;
      const { data: allUsers, error: allError } = await supabase
        .from('users')
        .select(selectFields);

      if (allError) throw allError;
      
      // Calculate counts based on user_type
      console.log('DEBUG API: All users for counting:', allUsers.map(u => ({ id: u.id, user_type: u.user_type, role: u.role, verified: u.verified })));

      const userTypeUsers = allUsers.filter(u => u.user_type === 'user').length;
      const adminUsers = allUsers.filter(u => ['admin', 'coadmin', 'subadmin'].includes(u.role)).length;
      const newSignups = allUsers.filter(u => u.new_user === true).length;
      const verifiedUsers = allUsers.filter(u => u.verified === true).length;

      const result = {
        success: true,
        counts: {
          adminUsers,
          newSignups,
          usersCount: userTypeUsers,
          verifiedUsers
        }
      };

      console.log('DEBUG API: Calculated counts:', result.counts);

      res.statusCode = 200;
      res.end(JSON.stringify(result));
  } catch (error) {
    console.error('Error getting user counts:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}
