/**
 * STI Archives API - User Status Update Routes
 * Handles user status changes (accept, reject, ban)
 */

const { getSupabase, isSupabaseConfigured } = require('../../services/supabase.js');
const emailService = require('../../services/EmailService.js');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function handleOptions(res) {
  setCorsHeaders(res);
  res.statusCode = 200;
  res.end();
}

// POST /api/users/status - Update user status (accept, reject, ban)
async function handleUserStatus(req, res) {
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
    const { user_id, action, email, role } = req.body;
    
    if (!user_id || !action) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing user_id or action' }));
      return;
    }
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // Find user by email or id
      let query = supabase.from('users').select('*');
      if (email) {
        query = query.eq('email', email);
      } else {
        query = query.eq('id', user_id);
      }
      
      const { data: users, error: findError } = await query;
      
      if (findError) throw findError;
      if (!users || users.length === 0) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'User not found' }));
        return;
      }
      
      const user = users[0];
      const updateData = { updated_at: new Date().toISOString() };
      
      if (action === 'accept') {
        updateData.verified = true;
        updateData.role = role || 'user';
        
        // Send approval notification email
        await emailService.sendApprovalNotification(user.email, user.fullname);
      } else if (action === 'reject') {
        updateData.rejected = true;
        
        // Send rejection notification email
        const reason = req.body.reason || '';
        await emailService.sendRejectionNotification(user.email, user.fullname, reason);
      } else if (action === 'ban') {
        updateData.banned = true;
        
        // Send ban notification email
        const reason = req.body.reason || '';
        await emailService.sendBanNotification(user.email, user.fullname, reason);
      }
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: `User ${action}ed successfully`, user: data }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/users/remove - Remove user
async function handleRemoveUser(req, res) {
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
    const { user_id, email } = req.body;
    
    if (!user_id && !email) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Missing user_id or email' }));
      return;
    }
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      let query = supabase.from('users').delete();
      if (email) {
        query = query.eq('email', email);
      } else {
        query = query.eq('id', user_id);
      }
      
      const { error } = await query;
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'User removed successfully' }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error removing user:', error);
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

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // Route: POST /api/users/status
  if (pathParts[2] === 'status' && req.method === 'POST') {
    await handleUserStatus(req, res);
    return;
  }
  
  // Route: POST /api/users/remove
  if (pathParts[2] === 'remove' && req.method === 'POST') {
    await handleRemoveUser(req, res);
    return;
  }
  
  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
};
