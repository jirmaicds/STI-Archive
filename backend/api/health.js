/**
 * STI Archives API - Health Check
 * Simple test without Supabase
 */

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
    message: 'API is working!',
    environment: {
      supabaseUrl: process.env.SUPABASE_URL ? 'SET' : 'NOT SET',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET',
      supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET',
      jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT SET'
    }
  };

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(result, null, 2));
}

module.exports = handler;
