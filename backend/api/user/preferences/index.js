/**
 * STI Archives API - User Preferences
 * Handles user preferences for PDF viewer settings
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

// GET /api/user/preferences/:userId - Get user preferences
async function handleGetPreferences(req, res) {
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
    // Extract userId from URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(p => p);
    const userId = pathParts[pathParts.length - 1];

    if (!userId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'User ID is required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      // Return default preferences if none exist
      const defaultPrefs = {
        user_id: userId,
        theme: 'light',
        fontSize: 14,
        layout: 'split'
      };
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        preferences: data || defaultPrefs 
      }));
    } else {
      // Fallback - return default preferences
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        preferences: {
          user_id: userId,
          theme: 'light',
          fontSize: 14,
          layout: 'split'
        },
        message: 'Supabase not configured - using defaults'
      }));
    }
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// POST /api/user/preferences - Save user preferences
async function handleSavePreferences(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST' && req.method !== 'PUT') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    // Get request body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString());
    
    const { user_id, theme, fontSize, layout } = body;

    if (!user_id) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'User ID is required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert([{
          user_id,
          theme: theme || 'light',
          fontSize: fontSize || 14,
          layout: layout || 'split',
          updated_at: new Date().toISOString()
        }], { onConflict: 'user_id' })
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, preferences: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        message: 'Supabase not configured - preferences not saved'
      }));
    }
  } catch (error) {
    console.error('Error saving preferences:', error);
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

  if (req.method === 'GET') {
    await handleGetPreferences(req, res);
  } else if (req.method === 'POST' || req.method === 'PUT') {
    await handleSavePreferences(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
