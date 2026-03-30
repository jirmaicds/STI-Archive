/**
 * STI Archives API - Single Carousel Routes
 * Handles get/update/delete for a specific carousel item
 */

const { config } = require('../../../config/index.js');
const { getServiceSupabase, isSupabaseConfigured } = require('../../../services/supabase.js');

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

// Extract carousel ID from URL path
function getCarouselIdFromPath(req) {
  const pathParts = req.url.split('/');
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i] === 'carousel' && pathParts[i + 1]) {
      return pathParts[i + 1];
    }
  }
  return null;
}

// GET /api/carousel/[id] - Get specific carousel item
async function handleGetCarouselItem(req, res, carouselId) {
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
      
      const { data, error } = await supabase
        .from('carousel')
        .select('*')
        .eq('carousel_id', carouselId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Carousel item not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, carousel: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        carousel: null,
        message: 'Supabase not configured'
      }));
    }
  } catch (error) {
    console.error('Error getting carousel item:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// PUT /api/carousel/[id] - Update specific carousel item
async function handleUpdateCarousel(req, res, carouselId) {
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
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can update carousel items' }));
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

    // Build update object
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (image_url !== undefined) updateData.image_url = image_url;
    if (title !== undefined) updateData.title = title;
    if (author !== undefined) updateData.author = author;
    if (description !== undefined) updateData.description = description;
    if (pdf_id !== undefined) updateData.pdf_id = pdf_id;
    if (pdf_path !== undefined) updateData.pdf_path = pdf_path;
    if (display_order !== undefined) updateData.display_order = display_order;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { data, error } = await supabase
        .from('carousel')
        .update(updateData)
        .eq('carousel_id', carouselId)
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Carousel item not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, carousel: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - update simulated',
        carousel: { carousel_id: carouselId, ...updateData }
      }));
    }
  } catch (error) {
    console.error('Error updating carousel item:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// DELETE /api/carousel/[id] - Delete specific carousel item
async function handleDeleteCarousel(req, res, carouselId) {
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
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can delete carousel items' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getServiceSupabase();
      
      const { error } = await supabase
        .from('carousel')
        .delete()
        .eq('carousel_id', carouselId);
      
      if (error) {
        if (error.code === 'PGRST116') {
          res.statusCode = 404;
          res.end(JSON.stringify({ success: false, error: 'Carousel item not found' }));
          return;
        }
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: 'Carousel item deleted successfully' }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - delete simulated'
      }));
    }
  } catch (error) {
    console.error('Error deleting carousel item:', error);
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

  // Extract carousel ID from URL path
  const carouselId = getCarouselIdFromPath(req);
  
  if (!carouselId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'Carousel ID is required' }));
    return;
  }

  // Route based on method
  if (req.method === 'GET') {
    await handleGetCarouselItem(req, res, carouselId);
  } else if (req.method === 'PUT') {
    await handleUpdateCarousel(req, res, carouselId);
  } else if (req.method === 'DELETE') {
    await handleDeleteCarousel(req, res, carouselId);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
