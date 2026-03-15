/**
 * STI Archives API - Article PDF Upload
 * Handles PDF file uploads for articles to Supabase Storage
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

// Check if user is admin
function isAdmin(user) {
  return user && ['admin', 'coadmin'].includes(user.role);
}

// Get content type from filename
function getContentType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const types = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain'
  };
  return types[ext] || 'application/octet-stream';
}

// POST /api/articles/upload - Upload PDF for article
async function handleUpload(req, res) {
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

    if (!currentUser || !isAdmin(currentUser)) {
      res.statusCode = 403;
      res.end(JSON.stringify({ success: false, error: 'Forbidden - only admins can upload articles' }));
      return;
    }

    // Parse multipart form data manually
    const contentType = req.headers['content-type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Content-Type must be multipart/form-data' }));
      return;
    }

    // Get boundary from content-type
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'No boundary found in content-type' }));
      return;
    }

    // Read the body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);

    // Parse multipart data
    const parts = body.toString('binary').split(`--${boundary}`);
    
    let filename = null;
    let fileData = null;
    let articleId = null;
    let title = null;

    for (const part of parts) {
      if (part.includes('filename="')) {
        // File field
        const filenameMatch = part.match(/filename="([^"]+)"/);
        const nameMatch = part.match(/name="([^"]+)"/);
        
        if (filenameMatch && nameMatch) {
          filename = filenameMatch[1];
          const fieldName = nameMatch[1];
          
          // Get file content (after headers and blank line)
          const headerEnd = part.indexOf('\r\n\r\n');
          if (headerEnd > 0) {
            const fileContent = part.substring(headerEnd + 4);
            // Remove trailing \r\n
            fileData = fileContent.replace(/\r\n$/, '');
          }
        }
      } else if (part.includes('name="article_id"')) {
        const valueMatch = part.match(/name="article_id"\r\n\r\n([^\r\n]+)/);
        if (valueMatch) {
          articleId = valueMatch[1].trim();
        }
      } else if (part.includes('name="title"')) {
        const valueMatch = part.match(/name="title"\r\n\r\n([^\r\n]+)/);
        if (valueMatch) {
          title = valueMatch[1].trim();
        }
      }
    }

    if (!filename || !fileData) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'No file uploaded' }));
      return;
    }

    // Validate file type
    const ext = filename.split('.').pop().toLowerCase();
    if (!['pdf', 'doc', 'docx'].includes(ext)) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'Only PDF, DOC, and DOCX files are allowed' }));
      return;
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeFilename = `${timestamp}_${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // Convert base64 to buffer
      const buffer = Buffer.from(fileData, 'binary');
      
      // Upload to Supabase Storage - use 'articles' bucket
      // First ensure bucket exists or use existing one
      let bucketName = 'articles';
      
      // Check if articles bucket exists, if not use user-uploads
      const { data: buckets } = await supabase.storage.listBuckets();
      const articlesBucket = buckets?.find(b => b.name === 'articles');
      
      if (!articlesBucket) {
        // Try to create the bucket
        try {
          await supabase.storage.createBucket('articles', {
            public: true,
            fileSizeLimit: 50 * 1024 * 1024 // 50MB
          });
        } catch (e) {
          // Bucket might already exist or no permission
          console.log('Using existing bucket or falling back');
        }
      }
      
      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(safeFilename, buffer, {
          contentType: getContentType(filename),
          upsert: true
        });

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        // Try with user-uploads bucket as fallback
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('user-uploads')
          .upload(safeFilename, buffer, {
            contentType: getContentType(filename),
            upsert: true
          });
        
        if (fallbackError) {
          throw new Error('Failed to upload file: ' + fallbackError.message);
        }
        
        // Get public URL from fallback
        const { data: urlData } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(safeFilename);
        
        const publicUrl = urlData.publicUrl;
        
        // Update article if article_id provided
        if (articleId) {
          await supabase
            .from('articles')
            .update({ pdf_path: publicUrl })
            .eq('id', parseInt(articleId));
        }
        
        res.statusCode = 200;
        res.end(JSON.stringify({ 
          success: true, 
          url: publicUrl,
          filename: safeFilename,
          message: 'File uploaded to user-uploads bucket'
        }));
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(safeFilename);
      
      const publicUrl = urlData.publicUrl;

      // Update article if article_id provided
      if (articleId) {
        await supabase
          .from('articles')
          .update({ pdf_path: publicUrl })
          .eq('id', parseInt(articleId));
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        url: publicUrl,
        filename: safeFilename,
        articleId: articleId
      }));
    } else {
      // Fallback: return fake URL
      res.statusCode = 200;
      res.end(JSON.stringify({ 
        success: true, 
        url: `/uploads/articles/${safeFilename}`,
        filename: safeFilename,
        message: 'Supabase not configured - upload skipped'
      }));
    }
  } catch (error) {
    console.error('Error uploading article:', error);
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

  await handleUpload(req, res);
};
