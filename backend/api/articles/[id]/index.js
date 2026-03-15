/**
 * STI Archives API - Single Article Routes
 * Handles get/update/delete for a specific article
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

// Extract article ID from URL path
function getArticleIdFromPath(req) {
  const pathParts = req.url.split('/');
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'articles' && pathParts[i + 1]) {
      return pathParts[i + 1];
    }
  }
  return null;
}

// GET /api/articles/[id] - Get specific article
async function handleGetArticle(req, res, articleId) {
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
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Article not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, article: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        article: null,
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting article:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// PUT /api/articles/[id] - Update specific article
async function handleUpdateArticle(req, res, articleId) {
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

    if (!currentUser || !isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can update articles' }));
      return;
    }

    const { 
      title, 
      authors, 
      meta, 
      summary, 
      category, 
      strand, 
      level, 
      program, 
      year, 
      type, 
      pdf_path, 
      topic,
      qualitativeQuantitative 
    } = req.body;

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title !== undefined) updateData.title = title;
    if (authors !== undefined) updateData.authors = authors;
    if (meta !== undefined) updateData.meta = meta;
    if (summary !== undefined) updateData.summary = summary;
    if (category !== undefined) updateData.category = category;
    if (strand !== undefined) updateData.strand = strand;
    if (level !== undefined) updateData.level = level;
    if (program !== undefined) updateData.program = program;
    if (year !== undefined) updateData.year = year;
    if (type !== undefined) updateData.type = type;
    if (pdf_path !== undefined) updateData.pdf_path = pdf_path;
    if (topic !== undefined) updateData.topic = topic;
    if (qualitativeQuantitative !== undefined) updateData.qualitativeQuantitative = qualitativeQuantitative;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', articleId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Article not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, article: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - update simulated',
        article: { id: articleId, ...updateData }
      }));
    }
  } catch (error) {
    console.error('Error updating article:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/articles/[id] - Delete specific article
async function handleDeleteArticle(req, res, articleId) {
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

    if (!currentUser || !isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can delete articles' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Article not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Article deleted successfully' }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - delete simulated'
      }));
    }
  } catch (error) {
    console.error('Error deleting article:', error);
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

  // Extract article ID from URL path
  const articleId = getArticleIdFromPath(req);
  
  if (!articleId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'Article ID is required' }));
    return;
  }

  // Route based on method
  if (req.method === 'GET') {
    await handleGetArticle(req, res, articleId);
  } else if (req.method === 'PUT') {
    await handleUpdateArticle(req, res, articleId);
  } else if (req.method === 'DELETE') {
    await handleDeleteArticle(req, res, articleId);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
