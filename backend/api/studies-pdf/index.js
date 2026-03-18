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
    let pdfPath = url.searchParams.get('path');

    if (!pdfPath) {
      res.statusCode = 400;
      res.end(JSON.stringify({ success: false, error: 'PDF path is required' }));
      return;
    }

    // Remove /Studies/ prefix if present since we're already accessing the Studies bucket
    if (pdfPath.startsWith('/Studies/')) {
      pdfPath = pdfPath.replace('/Studies/', '');
    } else if (pdfPath.startsWith('Studies/')) {
      pdfPath = pdfPath.replace('Studies/', '');
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      // PDF is in Studies bucket → research/2023-2024/filename.pdf
      // Path from frontend is: Research/2023-2024/Santibañez et al.pdf
      // Need to prepend 'research/' to match folder structure
      const folderPath = 'research/' + pdfPath;
      
      // Try to get from Studies bucket
      const { data: studyData, error: studyError } = await supabase.storage
        .from('Studies')
        .download(folderPath);
      
      if (studyData && !studyError) {
        // Serve from Studies bucket
        res.setHeader('Content-Type', 'application/pdf');
        const chunks = [];
        for await (const chunk of studyData.stream()) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        res.setHeader('Content-Length', buffer.length);
        res.end(buffer);
        return;
      }
      
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
        .getPublicUrl(folderPath);
      
      if (urlData?.publicUrl) {
        res.statusCode = 302;
        res.setHeader('Location', urlData.publicUrl);
        res.end();
        return;
      }
      
      console.error('PDF not found in Studies bucket:', { folderPath, pdfPath, studyError, directError });
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
