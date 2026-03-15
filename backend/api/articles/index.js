/**
 * STI Archives API - Articles Routes
 * Handles research papers/articles management with Supabase
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

// Check if user is admin
function isAdmin(user) {
  return user && ['admin', 'coadmin'].includes(user.role);
}

// GET /api/articles - Get all articles (with optional filtering)
async function handleGetArticles(req, res) {
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
    const category = url.searchParams.get('category');
    const year = url.searchParams.get('year');
    const strand = url.searchParams.get('strand');
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('search');
    const limit = url.searchParams.get('limit') || 50;
    const offset = url.searchParams.get('offset') || 0;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }
      if (year) {
        query = query.eq('year', year);
      }
      if (strand) {
        query = query.eq('strand', strand);
      }
      if (level) {
        query = query.eq('level', level);
      }
      if (search) {
        query = query.or(`title.ilike.%${search}%,authors.ilike.%${search}%,summary.ilike.%${search}%`);
      }
      
      query = query.order('created_at', { ascending: false });
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        articles: data || [],
        total: count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }));
    } else {
      // Fallback: return empty array
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        articles: [],
        total: 0,
        message: 'Supabase not configured - using fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error getting articles:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/articles - Create new article (admin only)
async function handleCreateArticle(req, res) {
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

    if (!currentUser || !isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can create articles' }));
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

    if (!title) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Title is required' }));
      return;
    }

    const newArticle = {
      id: parseInt(Date.now()),
      title,
      authors: authors || '',
      meta: meta || '',
      summary: summary || '',
      category: category || '',
      strand: strand || '',
      level: level || '',
      program: program || '',
      year: year || '',
      type: type || '',
      pdf_path: pdf_path || '',
      topic: topic || '',
      qualitativeQuantitative: qualitativeQuantitative || '',
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('articles')
        .insert([newArticle])
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, article: data }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        article: newArticle,
        message: 'Supabase not configured - article created in fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error creating article:', error);
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
    await handleGetArticles(req, res);
  } else if (req.method === 'POST') {
    await handleCreateArticle(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
