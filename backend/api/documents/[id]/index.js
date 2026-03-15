/**
 * STI Archives API - Single Document Routes
 * Handles get/update/delete for a specific document
 */

const { config, isSupabaseConfigured } = require('../../../config/index.js');
const { getSupabase } = require('../../../services/supabase.js');

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

// Extract document ID from URL path
function getDocumentIdFromPath(req) {
  const pathParts = req.url.split('/');
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'documents' && pathParts[i + 1]) {
      return pathParts[i + 1];
    }
  }
  return null;
}

// GET /api/documents/[id] - Get specific document
async function handleGetDocument(req, res, docId) {
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
    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      let query = supabase
        .from('documents')
        .select('*')
        .eq('doc_id', docId);
      
      // If not admin, only show own documents
      if (!currentUser || !isAdmin(currentUser)) {
        query = query.eq('user_id', currentUser ? currentUser.id : '');
      }
      
      const { data, error } = await query.single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Document not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, document: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        document: null,
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting document:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// PUT /api/documents/[id] - Update specific document
async function handleUpdateDocument(req, res, docId) {
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

    const { 
      title, 
      content, 
      content_html, 
      paper_size,
      is_sti_template 
    } = req.body;

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (content_html !== undefined) updateData.content_html = content_html;
    if (paper_size !== undefined) updateData.paper_size = paper_size;
    if (is_sti_template !== undefined) updateData.is_sti_template = is_sti_template;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // First check ownership
      let query = supabase
        .from('documents')
        .select('user_id')
        .eq('doc_id', docId);
      
      // If not admin, only update own documents
      if (!isAdmin(currentUser)) {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data: existing, error: fetchError } = await query.single();
      
      if (fetchError || !existing) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Document not found or access denied' }));
        return;
      }
      
      const { data, error } = await supabase
        .from('documents')
        .update(updateData)
        .eq('doc_id', docId)
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        document: data,
        message: 'Document updated successfully'
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - update simulated',
        document: { doc_id: docId, ...updateData }
      }));
    }
  } catch (error) {
    console.error('Error updating document:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/documents/[id] - Delete specific document
async function handleDeleteDocument(req, res, docId) {
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

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // First check ownership
      let query = supabase
        .from('documents')
        .select('user_id')
        .eq('doc_id', docId);
      
      // If not admin, only delete own documents
      if (!isAdmin(currentUser)) {
        query = query.eq('user_id', currentUser.id);
      }
      
      const { data: existing, error: fetchError } = await query.single();
      
      if (fetchError || !existing) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Document not found or access denied' }));
        return;
      }
      
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('doc_id', docId);
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Document deleted successfully' }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - delete simulated'
      }));
    }
  } catch (error) {
    console.error('Error deleting document:', error);
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

  // Extract document ID from URL path
  const docId = getDocumentIdFromPath(req);
  
  if (!docId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'Document ID is required' }));
    return;
  }

  // Route based on method
  if (req.method === 'GET') {
    await handleGetDocument(req, res, docId);
  } else if (req.method === 'PUT') {
    await handleUpdateDocument(req, res, docId);
  } else if (req.method === 'DELETE') {
    await handleDeleteDocument(req, res, docId);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
