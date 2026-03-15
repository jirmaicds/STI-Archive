/**
 * Backend Configuration for STI Archives
 * Vercel and Supabase ready
 */

// Load environment variables
const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || ''
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    expiry: process.env.JWT_EXPIRY || '24h'
  },

  // Email Configuration
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    user: process.env.EMAIL_USER || 'stiarchivesorg@gmail.com',
    pass: process.env.EMAIL_PASS || ''
  },

  // Site Configuration
  site: {
    url: process.env.SITE_URL || 'https://stiarchives.vercel.app',
    name: 'STI Archives'
  },

  // Admin roles hierarchy
  roles: {
    admin: 'admin',
    coadmin: 'coadmin',
    subadmin: 'subadmin',
    user: 'user'
  }
};

// Helper to check if Supabase is configured
function isSupabaseConfigured() {
  return !!(config.supabase.url && config.supabase.anonKey);
}

module.exports = {
  config,
  isSupabaseConfigured
};