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

  // Test Supabase connection
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('users').select('count').limit(1);
      
      if (error) {
        result.supabase.connection = 'ERROR';
        result.supabase.error = error.message;
      } else {
        result.supabase.connection = 'SUCCESS';
      }
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
