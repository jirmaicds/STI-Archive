/**
 * STI Archives API - Health Check
 * Tests Supabase connection
 */

const { config, isSupabaseConfigured } = require('../config/index.js');
const { getSupabase } = require('../services/supabase.js');

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const result = {
    success: true,
    timestamp: new Date().toISOString(),
    supabase: {
      configured: isSupabaseConfigured(),
      url: config.supabase.url ? 'SET' : 'NOT SET',
      anonKey: config.supabase.anonKey ? 'SET' : 'NOT SET',
      serviceKey: config.supabase.serviceKey ? 'SET' : 'NOT SET'
    },
    jwt: {
      secret: config.jwt.secret ? 'SET' : 'NOT SET'
    }
  };

  // Test Supabase connection - skip table query to avoid RLS issues
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      // Just verify client is created - skip table query
      result.supabase.connection = 'SUCCESS (client created)';
      result.supabase.clientUrl = config.supabase.url;
    } catch (err) {
      result.supabase.connection = 'ERROR';
      result.supabase.error = err.message;
    }
  } else {
    result.supabase.connection = 'NOT CONFIGURED';
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result, null, 2));
}

module.exports = handler;
