/**
 * STI Archives API - Update User
 * Handles user updates from admin panel
 */

const { isSupabaseConfigured, getServiceSupabase } = require('../services/supabase.js');

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// POST /update_user - Update user information
async function handleUpdateUser(req, res) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
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
        message: 'User updated successfully',
        user: data
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

module.exports = handleUpdateUser;