/**
 * Supabase Client Configuration
 * Handles PostgreSQL database connection via Supabase
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseStorageUrl = process.env.SUPABASE_STORAGE_URL || 'https://eopbqatvianrjkdbypvk.storage.supabase.co/storage/v1/s3';

// Import Supabase client
let supabase;

if (supabaseUrl && supabaseKey) {
  // Dynamic import for ES modules in CommonJS
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseKey, {
    storage: {
      baseUrl: supabaseStorageUrl
    }
  });
} else {
  console.warn('Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  supabase = null;
}

/**
 * Get Supabase client instance
 */
function getSupabase() {
  return supabase;
}

/**
 * Check if Supabase is configured
 */
function isSupabaseConfigured() {
  return supabase !== null;
}

module.exports = {
  getSupabase,
  isSupabaseConfigured,
  supabase
};