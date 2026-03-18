/**
 * Supabase Storage Service
 * Handles file uploads to Supabase Storage buckets
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Dynamic import for ES modules
let supabase;

if (supabaseUrl && supabaseKey) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  supabase = null;
}

/**
 * Upload a file to Supabase Storage
 * @param {string} bucketName - The bucket name (studies, uploads)
 * @param {string} filePath - The path within the bucket
 * @param {Buffer} fileData - The file data
 * @param {string} contentType - The MIME type of the file
 * @returns {object} - The upload result
 */
async function uploadFile(bucketName, filePath, fileData, contentType) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(filePath, fileData, {
      contentType,
      upsert: false
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * Get a public URL for a file
 * @param {string} bucketName - The bucket name
 * @param {string} filePath - The path within the bucket
 * @returns {string} - The public URL
 */
function getPublicUrl(bucketName, filePath) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage
 * @param {string} bucketName - The bucket name
 * @param {string} filePath - The path within the bucket
 */
async function deleteFile(bucketName, filePath) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }

  const { error } = await supabase.storage
    .from(bucketName)
    .remove([filePath]);

  if (error) {
    throw error;
  }
}

/**
 * Check if Supabase Storage is configured
 */
function isStorageConfigured() {
  return supabase !== null;
}

module.exports = {
  uploadFile,
  getPublicUrl,
  deleteFile,
  isStorageConfigured,
  supabase
};
