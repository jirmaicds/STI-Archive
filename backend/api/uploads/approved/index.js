/**
 * STI Archives API - Approved Uploads Routes
 * Returns approved user uploads for public display
 */

const { getSupabase, isSupabaseConfigured } = require('../services/supabase.js');

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

// GET /api/uploads/approved - Get all approved uploads for public display
async function handleGetApprovedUploads(req, res) {
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

      // Get only approved uploads
      const { data: uploads, error } = await supabase
        .from('user_uploads')
        .select('*')
        .eq('approved', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: uploads || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: [] }));
    }
  } catch (error) {
    console.error('Error getting approved uploads:', error);
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

  // Parse URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathParts = url.pathname.split('/').filter(p => p);

  // Route: GET /api/uploads/approved
  if (pathParts[1] === 'uploads' && pathParts[2] === 'approved' && req.method === 'GET') {
    await handleGetApprovedUploads(req, res);
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ success: false, error: 'Not found' }));
};