/**
 * Supabase Client Configuration
 * Handles PostgreSQL database connection via Supabase
 * Provides two clients: anonClient (for public data) and serviceClient (for admin operations)
 */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Import Supabase client
const { createClient } = require('@supabase/supabase-js');

// Public/Anon client - for public data (articles, etc)
let anonClient;
if (supabaseUrl && supabaseAnonKey) {
  anonClient = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase ANON credentials not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  anonClient = null;
}

// Service client - for admin operations (bypasses RLS)
let serviceClient;
if (supabaseUrl && supabaseServiceKey) {
  serviceClient = createClient(supabaseUrl, supabaseServiceKey);
} else {
  console.warn('Supabase SERVICE_ROLE credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  serviceClient = null;
}

/**
 * Get Supabase Anon Client (for public data)
 */
function getSupabase() {
  return anonClient;
}

/**
 * Get Supabase Service Client (for admin operations)
 */
function getServiceSupabase() {
  return serviceClient;
}

/**
 * Check if Supabase is configured
 * Only requires service client for direct users table management in admin mode.
 */
function isSupabaseConfigured() {
  return serviceClient !== null;
}

module.exports = {
  getSupabase,
  getServiceSupabase,
  anonClient,
  serviceClient,
  isSupabaseConfigured,
  supabase: serviceClient // backward compatibility
};