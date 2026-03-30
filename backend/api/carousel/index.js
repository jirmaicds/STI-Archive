/**
 * STI Archives API - Carousel Routes
 * Handles carousel management with Supabase
 */

const { v4: uuidv4 } = require('uuid');
const { config } = require('../../config/index.js');
const path = require('path');
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

// GET /api/carousel - Get all carousel items
async function handleGetCarousel(req, res) {
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
    // Parse query params
    const url = new URL(req.url, `http://${req.headers.host}`);
    const activeOnly = url.searchParams.get('active') !== 'false';

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      let query = supabase
        .from('carousel')
        .select('*');
      
      // Only return active items by default
      if (activeOnly) {
        query = query.eq('is_active', true);
      }
      
      query = query.order('display_order', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        carousel: data || []
      }));
    } else {
      // Fallback: return mock data from carousel.json
      const fs = require('fs');
      const path = require('path');
      try {
        const carouselPath = path.join(__dirname, '../../..', 'api/data/carousel.json');
        const carouselData = JSON.parse(fs.readFileSync(carouselPath, 'utf8'));
        res.statusCode = 200;
        res.end(JSON.stringify({ 
          success: true, 
          carousel: carouselData
        }));
      } catch (e) {
        res.statusCode = 200;
        res.end(JSON.stringify({ 
          success: true, 
          carousel: [],
          message: 'No carousel data available'
        }));
      }
    }
  } catch (error) {
    console.error('Error getting carousel:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/carousel - Create new carousel item (admin only)
async function handleCreateCarousel(req, res) {
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
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can create carousel items' }));
      return;
    }

    const { 
      image_url, 
      title, 
      author, 
      description, 
      pdf_id, 
      pdf_path,
      display_order,
      is_active 
    } = req.body;

    if (!image_url || !title) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Image URL and title are required' }));
      return;
    }

    const newCarouselItem = {
      carousel_id: 'carousel-' + Date.now(),
      image_url,
      title,
      author: author || '',
      description: description || '',
      pdf_id: pdf_id || '',
      pdf_path: pdf_path || '',
      display_order: display_order || 0,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { data, error } = await supabase
        .from('carousel')
        .insert([newCarouselItem])
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, carousel: data }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        carousel: newCarouselItem,
        message: 'Supabase not configured - carousel item created in fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error creating carousel item:', error);
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
    await handleGetCarousel(req, res);
  } else if (req.method === 'POST') {
    await handleCreateCarousel(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
