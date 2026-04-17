/**
 * STI Archives API - Verification Check Endpoint
 * Checks if a user is verified by ID
 */

const { getServiceSupabase } = require('../services/supabase.js');

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

// GET /api/auth/verify/[userId]
async function handleVerify(req, res) {
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

  const urlParts = req.url.split('/');
  const userId = urlParts[urlParts.length - 1];

  if (!userId) {
    res.statusCode = 400;
    res.end(JSON.stringify({ success: false, error: 'User ID required' }));
    return;
  }

  try {
    if (getServiceSupabase) {
      const supabase = getServiceSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('id, verified')
        .eq('id', parseInt(userId))
        .single();

      if (error || !data) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'User not found' }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, verified: data.verified }));
    } else {
      // Dev mode fallback
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, verified: false }));
    }
  } catch (error) {
    console.error('Verify error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

module.exports = handleVerify;