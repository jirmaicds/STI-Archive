/**
 * STI Archives API - Studies PDF
 * Handles serving PDF files from Supabase Storage
 */

const { config, isSupabaseConfigured } = require('../../config/index.js');
const { getSupabase } = require('../../services/supabase.js');

// Helper to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Handle OPTIONS preflight
function handleOptions(res) {
  setCorsHeaders(res);
  res.statusCode = 200;
  res.end();
}

// GET /api/studies-pdf?path=Research/2023-2024/Santibañez et al.pdf
async function handleGetPdf(req, res) {
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
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pdfPath = url.searchParams.get('path');

    if (!pdfPath) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'PDF path is required' }));
      return;
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // Path from frontend is already processed: Research/2023-2024/Santibañez et al.pdf
      // Try direct path in Studies bucket
      const { data: directData, error: directError } = await supabase.storage
        .from('Studies')
        .download(pdfPath);
      
      if (directData && !directError) {
        res.setHeader('Content-Type', 'application/pdf');
        const chunks = [];
        for await (const chunk of directData.stream()) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
        return;
      }
      
      // If download fails, try to redirect to public URL
      const { data: urlData } = supabase.storage
        .from('Studies')
        .getPublicUrl(pdfPath);
      
      if (urlData?.publicUrl) {
        res.statusCode = 302;
        res.setHeader('Location', urlData.publicUrl);
        res.end();
        return;
      }
      
      console.error('PDF not found in Studies bucket:', { pdfPath, directError });
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: 'PDF not found in Studies bucket' }));
      return;
    } else {
      // Fallback - PDF not available
      res.statusCode = 404;
      res.end(JSON.stringify({ success: false, error: 'PDF not available - Supabase not configured' }));
    }
  } catch (error) {
    console.error('Error getting PDF:', error);
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

  await handleGetPdf(req, res);
};
