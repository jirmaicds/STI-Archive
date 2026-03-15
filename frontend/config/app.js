// Frontend configuration for Vercel/Supabase backend
const config = {
  // API Configuration
  api: {
    // Use empty string for relative URLs (works in both dev and production)
    // For production Vercel deployment, this will be your vercel.app domain
    baseUrl: '',
    timeout: 10000,
    endpoints: {
      register: '/api/auth/register',
      login: '/api/auth/login',
      profile: '/api/auth/profile',
      logout: '/api/auth/logout',
      activate: '/api/auth/activate',
      forgotPassword: '/api/auth/forgot-password',
      resetPassword: '/api/auth/reset-password',
      verifyResetCode: '/api/auth/verify-reset-code',
      resetPasswordWithCode: '/api/auth/reset-password',
      approveUser: '/api/auth/approve-user',
      // Activity endpoints
      activityLog: '/api/activity/log',
      activityLogs: '/api/activity/logs',
      activityCount: '/api/activity/count'
    }
  },

  // UI Configuration
  ui: {
    theme: {
      primaryColor: '#007bff',
      secondaryColor: '#6c757d',
      successColor: '#28a745',
      errorColor: '#dc3545',
      warningColor: '#ffc107'
    },
    breakpoints: {
      mobile: '768px',
      tablet: '1024px',
      desktop: '1200px'
    }
  },

  // App Configuration
  app: {
    name: 'STI Web Application',
    version: '1.0.0',
    debug: process.env.NODE_ENV !== 'production',
    storageKeys: {
      token: 'sti_auth_token',
      user: 'sti_user_data'
    }
  }
};

export default config;