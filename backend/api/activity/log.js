/**
 * STI Archives API - Activity Logging Routes
 * Handles activity logging for admin actions
 */

const { v4: uuidv4 } = require('uuid');
const { config, isSupabaseConfigured } = require('../config/index.js');
const { getSupabase } = require('../services/supabase.js');

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

// Verify JWT token
function verifyToken(token) {
  const jwt = require('jsonwebtoken');
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

// POST /api/activity/log
async function handleLogActivity(req, res) {
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

    const { adminId, adminName, adminRole, action, targetUserId, targetUserName, details } = req.body;

    const activityLog = {
      id: uuidv4(),
      admin_id: adminId || auth.id,
      admin_name: adminName || auth.name || auth.email,
      admin_role: adminRole || auth.role,
      action: action,
      target_user_id: targetUserId || null,
      target_user_name: targetUserName || null,
      details: details || {},
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('activity_logs')
        .insert([activityLog])
        .select()
        .single();

      if (error) throw error;

      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, log: data }));
    } else {
      // Dev mode - return success without storing
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Activity logged (dev mode)',
        log: activityLog 
      }));
    }
  } catch (error) {
    console.error('Log activity error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/activity/logs
async function handleGetActivityLogs(req, res) {
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

    // Parse query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const adminRole = url.searchParams.get('adminRole');
    const action = url.searchParams.get('action');
    const adminId = url.searchParams.get('adminId');
    const targetUserId = url.searchParams.get('targetUserId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const limit = parseInt(url.searchParams.get('limit')) || 50;

    let query;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (adminRole) query = query.eq('admin_role', adminRole);
      if (action) query = query.eq('action', action);
      if (adminId) query = query.eq('admin_id', adminId);
      if (targetUserId) query = query.eq('target_user_id', targetUserId);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);

      const { data, error } = await query;

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, logs: data || [], total: data?.length || 0 }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        logs: [],
        total: 0,
        message: 'Activity logs not available in dev mode'
      }));
    }
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// GET /api/activity/count
async function handleGetActivityCount(req, res) {
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
      const supabase = getSupabase();
      const { count, error } = await supabase
        .from('activity_logs')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, count: count || 0 }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, count: 0 }));
    }
  } catch (error) {
    console.error('Get activity count error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

module.exports = {
  handleLogActivity,
  handleGetActivityLogs,
  handleGetActivityCount
};