/**
 * STI Archives API - User Upload Routes
 * Handles user file uploads with Supabase storage
 */

const { v4: uuidv4 } = require('uuid');
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

// POST /api/user/upload - Handle user file upload
async function handleUserUpload(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
    return;
  }

  try {
    // Check authorization
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      currentUser = verifyToken(token);
    }

    if (!currentUser) {
      res.statusCode = 401;
      res.end(JSON.stringify({ success: false, error: 'Unauthorized - login required to upload' }));
      return;
    }

    // Parse the multipart form data
    const contentType = req.headers['content-type'] || '';
    
    let body = '';
    if (contentType.includes('application/json')) {
      body = req.body;
    } else {
      // For multipart form data, we'll handle simple key-value pairs
      // In production, you'd use a library like 'busboy' or 'formidable'
      res.statusCode = 400;
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Please send JSON data with base64 encoded file',
        example: {
          title: 'Research Title',
          authors: 'Author Names',
          abstract: 'Abstract text',
          category: 'research',
          level: 'college',
          strand: 'ABM',
          program: 'BSCS',
          year: '2024',
          citation: 'Citation text',
          file_data: 'base64_encoded_file_content',
          filename: 'document.pdf'
        }
      }));
      return;
    }

    const { 
      title, 
      authors, 
      abstract, 
      category, 
      level, 
      strand, 
      program, 
      year, 
      citation,
      file_data,
      filename
    } = req.body;

    if (!title || !filename) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Title and filename are required' }));
      return;
    }

    const uploadId = 'user_' + Date.now() + '_' + uuidv4().substring(0, 8);
    const fileId = 'user_pdf_' + Date.now();

    // Handle file upload to storage if Supabase is configured
    let filePath = '';
    let fileSize = 0;
    
    if (isSupabaseConfigured() && file_data) {
      try {
        const supabase = getSupabase();
        
        // Decode base64 file data
        const buffer = Buffer.from(file_data, 'base64');
        fileSize = buffer.length;
        
        // Upload to Supabase Storage bucket
        const fileName = `${uploadId}_${filename}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(fileName, buffer, {
            contentType: getContentType(filename),
            upsert: true
          });
        
        if (uploadError) {
          console.error('Storage upload error:', uploadError);
          // Continue with local path as fallback
          filePath = `/uploads/${fileName}`;
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('user-uploads')
            .getPublicUrl(fileName);
          
          filePath = urlData.publicUrl;
        }
      } catch (storageError) {
        console.error('Storage error:', storageError);
        filePath = `/uploads/${uploadId}_${filename}`;
      }
    } else {
      // Fallback: just store the metadata
      filePath = `/uploads/${uploadId}_${filename}`;
    }

    // Create user upload record
    const newUpload = {
      upload_id: uploadId,
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_name: currentUser.name || currentUser.fullname || '',
      title: title,
      authors: authors || '',
      abstract: abstract || '',
      category: category || '',
      level: level || '',
      strand: strand || '',
      program: program || '',
      year: year || '',
      citation: citation || '',
      file_id: fileId,
      filename: filename,
      file_path: filePath,
      file_size: fileSize,
      status: 'pending',
      uploaded_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data, error } = await supabase
        .from('user_uploads')
        .insert([newUpload])
        .select()
        .single();
      
      if (error) throw error;
      
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        upload: data,
        message: 'Upload submitted successfully and pending review'
      }));
    } else {
      res.statusCode = 201;
      res.end(JSON.stringify({ 
        success: true, 
        upload: newUpload,
        message: 'Supabase not configured - upload recorded in fallback mode'
      }));
    }
  } catch (error) {
    console.error('Error handling upload:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
  }
}

// Helper to get content type from filename
function getContentType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const types = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
  };
  return types[ext] || 'application/octet-stream';
}

// Main handler
module.exports = async function handler(req, res) {
  setCorsHeaders(res);
  
  if (req.method === 'OPTIONS') {
    handleOptions(res);
    return;
  }

  if (req.method === 'POST') {
    await handleUserUpload(req, res);
  } else {
    res.statusCode = 405;
    res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }
};
