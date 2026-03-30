/**
 * STI Archives API - Single User Routes
 * Handles get/update/delete for a specific user
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { config } = require('../../../config/index.js');
const path = require('path');
const { getSupabase, isSupabaseAnonConfigured } = require(path.resolve(__dirname, '../../../services/supabase.js'));

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

// Extract user ID from URL path
function getUserIdFromPath(req) {
  const pathParts = req.url.split('/');
  // The ID should be in the path - format: /api/users/[id] or just /[id]
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'users' && pathParts[i + 1]) {
      return pathParts[i + 1];
    }
  }
  return null;
}

// GET /api/users/[id] - Get specific user
async function handleGetUser(req, res, userId) {
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
    if (isSupabaseAnonConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email, fullname, role, verified, created_at, updated_at, section, strand, permissions, access_level, isActive, banned, rejected')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'User not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        user: null,
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting user:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// PUT /api/users/[id] - Update specific user
async function handleUpdateUser(req, res, userId) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'PUT') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    const { 
      fullname, 
      role, 
      section, 
      strand, 
      permissions, 
      access_level,
      isActive,
      banned,
      rejected,
      verified
    } = req.body;

    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    if (!currentUser) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Users can only update themselves unless they're admin
    if (currentUser.id !== userId && !isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - can only update your own profile' }));
      return;
    }

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (fullname !== undefined) updateData.fullname = fullname;
    if (section !== undefined) updateData.section = section;
    if (strand !== undefined) updateData.strand = strand;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (access_level !== undefined) updateData.access_level = access_level;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (banned !== undefined) updateData.banned = banned;
    if (rejected !== undefined) updateData.rejected = rejected;
    if (verified !== undefined) updateData.verified = verified;
    
    // Only admins can change role
    if (role !== undefined && isAdmin(currentUser)) {
      updateData.role = role;
    }

    // If password is being updated
    if (req.body.password !== undefined) {
      updateData.password = await bcrypt.hash(req.body.password, 10);
    }

    if (isSupabaseAnonConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, email, fullname, role, verified, created_at, updated_at, section, strand, permissions, access_level, isActive, banned, rejected')
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'User not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - update simulated',
        user: { id: userId, ...updateData }
      }));
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/users/[id] - Delete specific user
async function handleDeleteUser(req, res, userId) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'DELETE') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    if (!currentUser) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
      return;
    }

    // Only admins can delete users
    if (!isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can delete users' }));
      return;
    }

    if (isSupabaseAnonConfigured()) {
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'User not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'User deleted successfully' }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - delete simulated'
      }));
    }
  } catch (error) {
    console.error('Error deleting user:', error);
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

  // Extract user ID from URL path
  const userId = getUserIdFromPath(req);
  
  if (!userId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'User ID is required' }));
    return;
  }

  // Route based on method
  if (req.method === 'GET') {
    await handleGetUser(req, res, userId);
  } else if (req.method === 'PUT') {
    await handleUpdateUser(req, res, userId);
  } else if (req.method === 'DELETE') {
    await handleDeleteUser(req, res, userId);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
