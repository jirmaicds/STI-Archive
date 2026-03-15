/**
 * STI Archives API - Documents Routes
 * Handles user documents management with Supabase
 */

const { v4: uuidv4 } = require('uuid');
const { config, isSupabaseConfigured } = require('../../config/index.js');
const { getSupabase } = require('../../services/supabase.js');

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

// GET /api/documents - Get all documents for a user
async function handleGetDocuments(req, res) {
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
    // Get user_id from query params or auth header
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userIdParam = url.searchParams.get('user_id');
    
    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    // If no user_id in params and no auth, return error
    const userId = userIdParam || (currentUser ? currentUser.id : null);
    
    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'user_id is required or authentication needed' }));
      return;
    }

    const limit = url.searchParams.get('limit') || 50;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        documents: data || []
      }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        documents: [],
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting documents:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/documents - Create new document
async function handleCreateDocument(req, res) {
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
    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    if (!currentUser) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized - login required' }));
      return;
    }

    const { 
      title, 
      content, 
      content_html, 
      paper_size,
      is_sti_template 
    } = req.body;

    if (!title) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Title is required' }));
      return;
    }

    const newDocument = {
      doc_id: 'doc_' + Date.now() + '_' + uuidv4().substring(0, 8),
      user_id: currentUser.id,
      title: title,
      content: content || '',
      content_html: content_html || '',
      paper_size: paper_size || 'letter',
      is_sti_template: is_sti_template || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('documents')
        .insert([newDocument])
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        document: data,
        message: 'Document saved successfully'
      }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        document: newDocument,
        message: 'Supabase not configured - document saved in fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error creating document:', error);
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

  // Route based on method
  if (req.method === 'GET') {
    await handleGetDocuments(req, res);
  } else if (req.method === 'POST') {
    await handleCreateDocument(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
