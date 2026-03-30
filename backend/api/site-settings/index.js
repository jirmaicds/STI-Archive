/**
 * STI Archives API - Site Settings
 * Handles site configuration settings from Supabase
 */

const { config, isSupabaseConfigured } = require('../../config/index.js');
const path = require('path');
const { getSupabase } = require(path.resolve(__dirname, '../../services/supabase.js'));

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

// Default site settings
const defaultSettings = {
  site_name: 'STI Archives',
  site_description: 'STI College Calamba Research Archives',
  contact_email: 'stiarchivesorg@gmail.com',
  maintenance_mode: false,
  allow_registrations: true,
  default_user_role: 'user',
  carousel_interval: 5000,
  articles_per_page: 10,
  max_upload_size: 50 // MB
};

// GET /api/site-settings or /get_site_settings
async function handleGetSettings(req, res) {
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
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        settings: data || defaultSettings 
      }));
    } else {
      // Fallback - return default settings
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        settings: defaultSettings,
        message: 'Supabase not configured - using defaults'
      }));
    }
  } catch (error) {
    console.error('Error getting settings:', error);
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

  await handleGetSettings(req, res);
};
