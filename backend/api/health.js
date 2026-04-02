/**
 * STI Archives API - Health Check
 * Tests Supabase connection and environment
 */

const { isSupabaseConfigured, getServiceSupabase } = require('../services/supabase.js');

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

  try {
    const supabaseConfigured = isSupabaseConfigured();
    let dbStatus = 'not_configured';
    let userCount = 0;
    let connectionError = null;

    if (supabaseConfigured) {
      try {
        const supabase = getServiceSupabase();
        if (supabase) {
          // Test connection by getting user count
          const { count, error } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

          if (error) {
            dbStatus = 'error';
            connectionError = error.message;
          } else {
            dbStatus = 'connected';
            userCount = count || 0;
          }
        } else {
          dbStatus = 'client_not_initialized';
        }
      } catch (dbError) {
        dbStatus = 'connection_failed';
        connectionError = dbError.message;
      }
    }

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      message: dbStatus === 'connected' ? 'API and database are working!' : 'API is working, but database may have issues',
      environment: {
        supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
        supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET',
        jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
      },
      database: {
        configured: supabaseConfigured,
        status: dbStatus,
        userCount: userCount,
        error: connectionError
      }
    };

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result, null, 2));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, null, 2));
  }
}

module.exports = handler;
