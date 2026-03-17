/**
 * STI Archives API - Unified API Handler
 * Consolidates all routes into a single serverless function
 * Fixes Vercel Hobby plan 12 function limit
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config, isSupabaseConfigured } = require('../config/index.js');
const { getSupabase } = require('../services/supabase.js');

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

// Generate JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.fullname || user.name
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
}

// Verify JWT token
function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    return null;
  }
}

// Check if user is admin
function isAdmin(user) {
  const role = (user.role || '').toLowerCase();
  return user && ['admin', 'coadmin'].includes(role);
}

// Parse request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

// ============ HEALTH ROUTE ============
async function handleHealth(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }
  const status = { success: true, message: 'STI Archives API is running', supabase: isSupabaseConfigured() ? 'connected' : 'not configured', timestamp: new Date().toISOString() };
  res.statusCode = 200;
  res.end(JSON.stringify(status));
}

// ============ AUTH ROUTES ============
async function handleAuthRegister(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const { email, password, fullname, role } = body;
    if (!email || !password || !fullname) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Missing required fields' })); return; }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    const activationToken = uuidv4();
    const newUser = { id: userId, email: email.toLowerCase(), password: hashedPassword, fullname: fullname, role: role || 'pending', verified: false, activation_token: activationToken, created_at: new Date().toISOString() };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('users').insert([newUser]).select().single();
      if (error) throw error;
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, message: 'Registration successful', user: { id: data.id, email: data.email, fullname: data.fullname, role: data.role } }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, message: 'Registration successful (dev mode)', user: { id: userId, email, fullname, role: 'pending' } }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAuthLogin(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const loginField = body.fullname || body.email;
    const { password } = body;
    
    if (!loginField) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Username or email is required' })); return; }
    if (!password) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'Password is required' })); return; }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let user = null;
      
      console.log('Login attempt:', loginField, '| Supabase configured:', isSupabaseConfigured());
      
      // Only check fullname for login (email is only for password reset)
      const { data: nameUsers, error: nameError } = await supabase.from('users').select('*').eq('fullname', loginField);
      console.log('Query result:', nameUsers, '| Error:', nameError);
      
      if (nameUsers && nameUsers.length > 0) {
        user = nameUsers[0];
      }
      
      if (!user) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'No account found. Please sign up first.' }));
        return;
      }

      // Verify password
      // For testing: try bcrypt first, then plain text
      let validPassword = false;
      
      // Try bcrypt first
      try {
        validPassword = await bcrypt.compare(password, user.password);
      } catch (e) {
        // If bcrypt fails, try plain text (for testing only)
        console.log('bcrypt compare failed, trying plain text');
        validPassword = (password === user.password);
      }
      
      // Also accept plain text password for testing
      if (!validPassword && user.password === password) {
        validPassword = true;
      }
      
      if (!validPassword) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, error: 'Invalid password' }));
        return;
      }

      // Normalize role to lowercase for checking
      const userRole = (user.role || '').toLowerCase();
      
      // Check if user is verified (admin/coadmin roles bypass verification)
      if (!user.verified && userRole !== 'admin' && userRole !== 'coadmin') {
        res.statusCode = 403;
        res.end(JSON.stringify({ success: false, error: 'Account not activated. Please wait for admin approval.' }));
        return;
      }

      const token = generateToken(user);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, token, user: { id: user.id, email: user.email, fullname: user.fullname, role: user.role, verified: user.verified } }));
    } else {
      // Dev mode fallback - only when Supabase is NOT configured
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, token: 'dev-token', user: { id: 'dev-id', email: loginField, fullname: loginField, role: 'admin', verified: true } }));
    }
  } catch (error) {
    console.error('Login error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAuthProfile(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) { res.statusCode = 401; res.end(JSON.stringify({ success: false, error: 'Unauthorized' })); return; }
  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);
  if (!user) { res.statusCode = 401; res.end(JSON.stringify({ success: false, error: 'Invalid token' })); return; }

  if (isSupabaseConfigured()) {
    const supabase = getSupabase();
    const { data, error } = await supabase.from('users').select('id, email, fullname, role, verified, created_at').eq('id', user.id).single();
    if (error) throw error;
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, user: data }));
  } else {
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, user: { id: user.id, email: user.email, fullname: user.name, role: user.role } }));
  }
}

async function handleAuthForgotPassword(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Password reset instructions sent' }));
}

async function handleAuthVerify(req, res, userId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, verified: true }));
}

async function handleAuthApproveUser(req, res, email) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').update({ verified: true, role: 'user' }).eq('email', decodeURIComponent(email));
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User approved' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAuthBanUser(req, res, email) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').update({ banned: true }).eq('email', decodeURIComponent(email));
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User banned' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAuthRejectUser(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  try {
    const { email } = body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').update({ rejected: true, verified: false }).eq('email', email);
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User rejected' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAuthAcceptUser(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  try {
    const { userId } = body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').update({ verified: true, role: 'user' }).eq('id', userId);
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User accepted' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ USERS ROUTES ============
async function handleUsers(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const status = url.searchParams.get('status');
    const role = url.searchParams.get('role');
    const search = url.searchParams.get('search');

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase.from('users').select('id, email, fullname, role, verified, created_at, isActive');
      if (status === 'pending') query = query.eq('verified', false).eq('role', 'pending');
      else if (status === 'approved') query = query.eq('verified', true).neq('role', 'pending');
      if (role) query = query.eq('role', role);
      if (search) query = query.or(`fullname.ilike.%${search}%,email.ilike.%${search}%`);
      query = query.order('created_at', { ascending: false });
      const { data, error } = await query;
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, users: data || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, users: [] }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUsersId(req, res, userId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, user: null }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUsersStatus(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const { userId, action } = body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let update = {};
      if (action === 'accept') update = { verified: true, role: 'user' };
      else if (action === 'ban') update = { banned: true };
      else if (action === 'reject') update = { rejected: true, verified: false };
      else if (action === 'unban') update = { banned: false };
      const { error } = await supabase.from('users').update(update).eq('id', userId);
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User status updated' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUsersRemove(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const { userId } = body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User removed' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUsersUpdate(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const { userId, ...updates } = body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { error } = await supabase.from('users').update(updates).eq('id', userId);
      if (error) throw error;
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, message: 'User updated' }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUsersAdd(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const { email, password, fullname, role } = body;
    const hashedPassword = await bcrypt.hash(password || 'password123', 10);
    const newUser = { id: uuidv4(), email: email.toLowerCase(), password: hashedPassword, fullname, role: role || 'pending', verified: role === 'admin', created_at: new Date().toISOString() };
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('users').insert([newUser]).select().single();
      if (error) throw error;
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, user: data }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ success: true, user: newUser }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ ARTICLES ROUTES ============
async function handleArticles(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const category = url.searchParams.get('category');
    const year = url.searchParams.get('year');
    const strand = url.searchParams.get('strand');
    const level = url.searchParams.get('level');
    const search = url.searchParams.get('search');
    const limit = url.searchParams.get('limit') || 50;
    const offset = url.searchParams.get('offset') || 0;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase.from('articles').select('*', { count: 'exact' });
      if (category) query = query.eq('category', category);
      if (year) query = query.eq('year', year);
      if (strand) query = query.eq('strand', strand);
      if (level) query = query.eq('level', level);
      if (search) query = query.or(`title.ilike.%${search}%,authors.ilike.%${search}%,summary.ilike.%${search}%`);
      query = query.order('created_at', { ascending: false });
      query = query.range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
      const { data, error, count } = await query;
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, articles: data || [], total: count || 0, limit: parseInt(limit), offset: parseInt(offset) }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, articles: [], total: 0 }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleArticlesId(req, res, articleId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('articles').delete().eq('id', articleId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Article deleted' }));
      } else {
        const { data, error } = await supabase.from('articles').select('*').eq('id', articleId).single();
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, article: data }));
      }
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, article: null }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ CAROUSEL ROUTES ============
async function handleCarousel(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const activeOnly = url.searchParams.get('active') !== 'false';

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase.from('carousel').select('*');
      if (activeOnly) query = query.eq('is_active', true);
      query = query.order('display_order', { ascending: true });
      const { data, error } = await query;
      if (error) throw error;
      
      // If no data in Supabase, use fallback carousel.json
      if (!data || data.length === 0) {
        const fs = require('fs');
        const path = require('path');
        try {
          const carouselPath = path.join(__dirname, 'data/carousel.json');
          const carouselData = JSON.parse(fs.readFileSync(carouselPath, 'utf8'));
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, carousel: carouselData }));
          return;
        } catch (e) {
          // Fallback file not found, return empty array
        }
      }
      
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, carousel: data || [] }));
    } else {
      // Fallback: return mock data from carousel.json
      const fs = require('fs');
      const path = require('path');
      try {
        const carouselPath = path.join(__dirname, 'data/carousel.json');
        const carouselData = JSON.parse(fs.readFileSync(carouselPath, 'utf8'));
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, carousel: carouselData }));
      } catch (e) {
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, carousel: [] }));
      }
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleCarouselId(req, res, carouselId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('carousel').delete().eq('carousel_id', carouselId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Carousel item deleted' }));
      } else if (req.method === 'PUT') {
        const body = await parseBody(req);
        const { error } = await supabase.from('carousel').update(body).eq('carousel_id', carouselId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Carousel item updated' }));
      } else {
        res.statusCode = 405;
        res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
      }
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ DOCUMENTS ROUTES ============
async function handleDocuments(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('user_id');
    const limit = url.searchParams.get('limit') || 50;

    if (!userId) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'user_id is required' })); return; }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('documents').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(parseInt(limit));
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, documents: data || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, documents: [] }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleDocumentsId(req, res, docId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('user_id');
    
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('documents').delete().eq('doc_id', docId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Document deleted' }));
      } else {
        const { data, error } = await supabase.from('documents').select('*').eq('doc_id', docId).single();
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, document: data }));
      }
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, document: null }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ SITE SETTINGS ROUTE ============
async function handleSiteSettings(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET' && req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  // Default settings
  const defaultSettings = {
    siteName: 'STI Archives',
    siteDescription: 'Digital Library for Research Papers',
    siteEmail: 'stiarchivesorg@gmail.com',
    siteFavicon: '/frontend/assets/images/STI Logo.png',
    primaryColor: '#0057b8',
    secondaryColor: '#ffd700'
  };

  try {
    if (req.method === 'POST') {
      const body = await parseBody(req);
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('site_settings').upsert(body).select().single();
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, settings: data }));
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, settings: body }));
      }
    } else {
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('site_settings').select('*').limit(1).single();
        
        // If no data or error, return default settings
        if (error || !data) {
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, settings: defaultSettings }));
        } else {
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, settings: data }));
        }
      } else {
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, settings: defaultSettings }));
      }
    }
  } catch (error) {
    // Return default settings on error
    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, settings: defaultSettings }));
  }
}

// ============ STUDIES PDF ROUTE ============
async function handleStudiesPdf(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pdfPath = url.searchParams.get('path') || url.searchParams.get('filename');

    if (!pdfPath) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'PDF path is required' })); return; }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // Debug: log the path being used
      console.log('PDF Path received:', pdfPath);
      
      // Path from frontend is: Research/2023-2024/Juangco et al. (2024).pdf
      // This matches directly with the Studies bucket
      // No need to add 'research/' prefix
      
      // Redirect to public URL directly
      const { data: urlData } = supabase.storage.from('Studies').getPublicUrl(pdfPath);
      
      console.log('Supabase URL generated:', urlData?.publicUrl);
      
      if (urlData?.publicUrl) {
        res.statusCode = 302;
        res.setHeader('Location', urlData.publicUrl);
        res.end();
        return;
      }
      
      console.error('PDF not found in Studies bucket:', { pdfPath });
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: 'PDF not found in Studies bucket', debug: { pdfPath, supabaseConfigured: true } }));
    } else {
      console.log('Supabase NOT configured - URL:', config.supabase.url, 'Key:', config.supabase.anonKey ? 'set' : 'not set');
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: 'PDF not available - Supabase not configured', debug: { url: config.supabase.url, hasKey: !!config.supabase.anonKey } }));
    }
  } catch (error) {
    console.error('Error getting PDF:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ PDF ROUTE ============
async function handlePdf(req, res, pdfId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.storage.from('uploads').getPublicUrl(pdfId);
      if (error) throw error;
      res.statusCode = 302;
      res.setHeader('Location', data.publicUrl);
      res.end();
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: 'PDF not found' }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handlePdfUpload(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'PDF upload endpoint' }));
}

async function handleUploadArticlePdf(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Article PDF upload endpoint' }));
}

// ============ ACTIVITY ROUTES ============
async function handleActivity(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('user_id');
    const limit = url.searchParams.get('limit') || 50;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      let query = supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, logs: data || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, logs: [] }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ USER PREFERENCES ROUTE ============
async function handleUserPreferences(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const userId = url.searchParams.get('user_id');

    if (!userId) { res.statusCode = 400; res.end(JSON.stringify({ success: false, error: 'user_id is required' })); return; }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, preferences: data || {} }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, preferences: {} }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleUserEditorContent(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Editor content saved' }));
}

// ============ USER UPLOAD ROUTES ============
async function handleUserUpload(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Upload endpoint' }));
}

async function handleUserUploadsId(req, res, userId) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('user_uploads').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: data || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: [] }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ ADMIN USER UPLOADS ROUTE ============
async function handleAdminUserUploads(req, res) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const limit = url.searchParams.get('limit') || 50;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.from('user_uploads').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
      if (error) throw error;
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: data || [] }));
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, uploads: [] }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

async function handleAdminUserUploadId(req, res, uploadId, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      if (req.method === 'DELETE') {
        const { error } = await supabase.from('user_uploads').delete().eq('id', uploadId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Upload deleted' }));
      } else if (req.method === 'PUT') {
        const { error } = await supabase.from('user_uploads').update(body).eq('id', uploadId);
        if (error) throw error;
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, message: 'Upload updated' }));
      } else {
        res.statusCode = 405;
        res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
      }
    } else {
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true }));
    }
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// ============ CAROUSEL UPLOAD IMAGE ============
async function handleCarouselUploadImage(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Image upload endpoint' }));
}

// ============ USER REQUEST EMAIL CHANGE ============
async function handleUserRequestEmailChange(req, res, body) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') { handleOptions(res); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ success: false, error: 'Method not allowed' })); return; }
  
  res.statusCode = 200;
  res.end(JSON.stringify({ success: true, message: 'Email change request received' }));
}

// ============ MAIN ROUTER ============
module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname.replace(/^\/api\//, '').replace(/\/$/, '');
    const segments = path.split('/');
    
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      body = await parseBody(req);
    }

    switch (segments[0]) {
      case '':
      case 'health':
        await handleHealth(req, res);
        break;
        
      case 'hash':
        // Temporary endpoint to generate bcrypt hash
        const bcrypt = require('bcryptjs');
        const passwordToHash = body.password || 'test123';
        const hash = bcrypt.hashSync(passwordToHash, 10);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, hash: hash, password: passwordToHash }));
        break;
        
      case 'create-user':
        // Create/update user with specified password (temp endpoint)
        const bcrypt2 = require('bcryptjs');
        const newFullname = body.fullname;
        const newPassword = body.password;
        const newRole = body.role || 'user';
        const newEmail = body.email || (body.fullname || 'user') + '@test.com';
        
        if (!newFullname || !newPassword) {
          res.statusCode = 400;
          res.end(JSON.stringify({ success: false, error: 'fullname and password required' }));
          break;
        }
        
        const supabase2 = getSupabase();
        const hashedPassword = bcrypt2.hashSync(newPassword, 10);
        
        const { data: existing } = await supabase2.from('users').select('*').eq('fullname', newFullname);
        
        if (existing && existing.length > 0) {
          // Update existing user
          await supabase2.from('users').update({ password: hashedPassword }).eq('fullname', newFullname);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'User password updated', fullname: newFullname, password: newPassword }));
        } else {
          // Create new user
          await supabase2.from('users').insert({
            email: newEmail,
            password: hashedPassword,
            fullname: newFullname,
            role: newRole,
            verified: true,
            isActive: true
          });
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, message: 'User created', fullname: newFullname, password: newPassword, role: newRole }));
        }
        break;
        
      case 'auth':
        if (segments[1] === 'register') await handleAuthRegister(req, res, body);
        else if (segments[1] === 'login') await handleAuthLogin(req, res, body);
        else if (segments[1] === 'profile') await handleAuthProfile(req, res);
        else if (segments[1] === 'forgot-password') await handleAuthForgotPassword(req, res, body);
        else if (segments[1] === 'verify' && segments[2]) await handleAuthVerify(req, res, segments[2]);
        else if (segments[1] === 'approve-user' && segments[2]) await handleAuthApproveUser(req, res, segments[2]);
        else if (segments[1] === 'ban-user' && segments[2]) await handleAuthBanUser(req, res, segments[2]);
        else if (segments[1] === 'reject-user') await handleAuthRejectUser(req, res, body);
        else if (segments[1] === 'accept-user') await handleAuthAcceptUser(req, res, body);
        else { res.statusCode = 404; res.end(JSON.stringify({ success: false, error: 'Auth endpoint not found' })); }
        break;
        
      case 'users':
        if (segments[1] === 'status') await handleUsersStatus(req, res, body);
        else if (segments[1] === 'remove') await handleUsersRemove(req, res, body);
        else if (segments[1] === 'update') await handleUsersUpdate(req, res, body);
        else if (segments[1] === 'add') await handleUsersAdd(req, res, body);
        else if (segments[1]) await handleUsersId(req, res, segments[1]);
        else await handleUsers(req, res);
        break;
        
      case 'articles':
        if (segments[1]) await handleArticlesId(req, res, segments[1]);
        else await handleArticles(req, res);
        break;
        
      case 'carousel':
        if (segments[1] === 'upload-image') await handleCarouselUploadImage(req, res, body);
        else if (segments[1]) await handleCarouselId(req, res, segments[1]);
        else await handleCarousel(req, res);
        break;
        
      case 'documents':
        if (segments[1]) await handleDocumentsId(req, res, segments[1]);
        else await handleDocuments(req, res);
        break;
        
      case 'site-settings':
        await handleSiteSettings(req, res);
        break;
        
      case 'studies-pdf':
        await handleStudiesPdf(req, res);
        break;
        
      case 'pdf':
        if (segments[1] === 'upload') await handlePdfUpload(req, res, body);
        else if (segments[1]) await handlePdf(req, res, segments[1]);
        else { res.statusCode = 404; res.end(JSON.stringify({ success: false, error: 'PDF ID required' })); }
        break;
        
      case 'upload-article-pdf':
        await handleUploadArticlePdf(req, res, body);
        break;
        
      case 'activity':
        await handleActivity(req, res);
        break;
        
      case 'preferences':
        await handleUserPreferences(req, res);
        break;
        
      case 'user':
        if (segments[1] === 'preferences') {
          if (segments[2]) {
            // /api/user/preferences/{userId} - GET
            const userPrefUrl = new URL(req.url, `http://${req.headers.host}`);
            userPrefUrl.searchParams.set('user_id', segments[2]);
            req.url = userPrefUrl.toString().replace(`http://${req.headers.host}`, '');
          }
          await handleUserPreferences(req, res);
        }
        else if (segments[1] === 'upload') await handleUserUpload(req, res, body);
        else if (segments[1] === 'uploads' && segments[2]) await handleUserUploadsId(req, res, segments[2]);
        else if (segments[1] === 'editor-content') await handleUserEditorContent(req, res, body);
        else if (segments[1] === 'request-email-change') await handleUserRequestEmailChange(req, res, body);
        else { res.statusCode = 404; res.end(JSON.stringify({ success: false, error: 'User endpoint not found' })); }
        break;
        
      case 'admin-user-uploads':
        if (segments[1]) await handleAdminUserUploadId(req, res, segments[1], body);
        else await handleAdminUserUploads(req, res);
        break;
        
      default:
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'Endpoint not found', path: segments[0] }));
    }
  } catch (error) {
    console.error('API Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: 'Internal server error' }));
  }
};
