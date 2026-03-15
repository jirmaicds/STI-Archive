/**
 * Vercel Serverless Function - Health Check
 */

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  // Check Supabase connection
  let supabaseStatus = 'not_configured';
  try {
    const { isSupabaseConfigured } = require('../config/index.js');
    supabaseStatus = isSupabaseConfigured() ? 'connected' : 'not_configured';
  } catch (e) {
    supabaseStatus = 'error';
  }

  res.statusCode = 200;
  res.end(JSON.stringify({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase: supabaseStatus,
    node: process.version,
    platform: process.platform
  }));
};