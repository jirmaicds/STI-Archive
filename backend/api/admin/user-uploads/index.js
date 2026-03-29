/**
 * STI Archives API - Admin User Uploads Routes
 * Handles admin operations on user uploads
 */

const { getServiceSupabase, isSupabaseConfigured } = require('../../services/supabase.js');

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

// GET /api/admin/user-uploads - Get all user uploads for admin
async function handleGetUserUploads(req, res) {
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
      
      // Get uploads with user info
      const { data: uploads, error } = await supabase
        .from('user_uploads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to match frontend expected field names and join with users
      let transformedUploads = [];
      if (uploads && uploads.length > 0) {
        // Get all user IDs
        const userIds = [...new Set(uploads.map(u => u.user_id).filter(Boolean))];
        
        // Fetch user names
        let usersMap = {};
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, full_name, first_name, last_name')
            .in('id', userIds);
          
          if (users) {
            users.forEach(user => {
              usersMap[user.id] = user.full_name || (user.first_name + ' ' + user.last_name) || 'Unknown User';
            });
          }
        }
        
        // Transform each upload
        transformedUploads = uploads.map(upload => ({
          id: upload.id,
          title: upload.title,
          authors: upload.description || 'N/A',
          abstract: upload.description || 'N/A',
          category: upload.category || 'N/A',
          topic: upload.topic || '',
          type: upload.type || '',
          level: upload.category || 'N/A',
          year: new Date(upload.created_at).getFullYear().toString(),
          filename: upload.file_name || 'N/A',
          filePath: upload.file_path || '',
          pdfUrl: upload.file_path || '',
          url: upload.file_path || '',
          status: upload.status || 'pending',
          userId: upload.user_id,
          userName: usersMap[upload.user_id] || 'Unknown User',
          uploadedAt: upload.created_at
        }));
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: transformedUploads }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: [], message: 'Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error getting user uploads:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// PUT /api/admin/user-upload/[id] - Update user upload status
async function handleUpdateUserUpload(req, res, uploadId) {
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
    const { status, topic, type } = req.body;
    
    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const updateData = {};
      if (status) updateData.status = status;
      if (topic) updateData.topic = topic;
      if (type) updateData.type = type;
      updateData.reviewed_at = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('user_uploads')
        .update(updateData)
        .eq('upload_id', uploadId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, upload: data }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error updating user upload:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/admin/user-upload/[id] - Delete user upload
async function handleDeleteUserUpload(req, res, uploadId) {
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
    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      const { error } = await supabase
        .from('user_uploads')
        .delete()
        .eq('upload_id', uploadId);
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ success: false, error: 'Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error deleting user upload:', error);
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

  // Parse URL to get upload ID if present
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(p => p);
  
  // Route: GET /api/admin/user-uploads
  if (pathParts[2] === 'user-uploads' && req.method === 'GET') {
    await handleGetUserUploads(req, res);
    return;
  }
  
  // Route: PUT/DELETE /api/admin/user-upload/[id]
  if (pathParts[2] === 'user-upload' && pathParts[3]) {
    const uploadId = pathParts[3];
    if (req.method === 'PUT') {
      await handleUpdateUserUpload(req, res, uploadId);
      return;
    } else if (req.method === 'DELETE') {
      await handleDeleteUserUpload(req, res, uploadId);
      return;
    }
  }
  
  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
};
