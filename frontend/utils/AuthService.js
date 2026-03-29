import ApiService from '../services/ApiService.js';

class AuthService {
  constructor() {
    this.api = ApiService;
    this.currentUser = null;
  }

  async login(identifier, password) {
    try {
      // Use Supabase Auth for login (email/password)
      const email = identifier.includes('@') ? identifier : undefined;
      if (!email) {
        throw new Error('Please provide email for Supabase login');
      }

      if (!window.supabase || !window.supabase.auth) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await window.supabase.auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }

      const session = data.session;
      if (!session) {
        throw new Error('No Supabase session returned');
      }

      // Set token for backend requests (optional): uses Supabase JWT for backend auth
      this.setSession(session.access_token);

      // Attempt to read user info from local app table
      const profileResponse = await this.api.request('/api/auth/profile', { headers: { Authorization: `Bearer ${session.access_token}` } });
      this.currentUser = profileResponse.user || { email };
      return { success: true, user: this.currentUser, session };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(userData) {
    try {
      if (!window.supabase || !window.supabase.auth) {
        throw new Error('Supabase client not initialized');
      }

      const { data, error } = await window.supabase.auth.signUp({
        email: userData.email,
        password: userData.password
      });

      if (error) {
        throw error;
      }

      const user = data.user;

      // Save into app table as well (roles, profile extras)
      const saveResponse = await this.api.request('/api/users', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${data.session?.access_token || ''}` },
        body: {
          id: user?.id || undefined,
          email: userData.email,
          fullname: userData.fullname,
          role: userData.role || 'pending'
        }
      });

      this.currentUser = saveResponse.user || { email: userData.email, fullname: userData.fullname };

      if (data.session) {
        this.setSession(data.session.access_token);
      }

      return { success: true, user: this.currentUser, supabase: data, save: saveResponse };
    } catch (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }
  }

  async logout() {
    this.clearSession();
    this.currentUser = null;
  }

  async getCurrentUser() {
    if (this.currentUser) {
      return this.currentUser;
    }

    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const response = await this.api.getProfile();
      this.currentUser = response.user;
      return this.currentUser;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  setSession(token) {
    localStorage.setItem('sti_auth_token', token);
    this.api.setToken(token);
  }

  clearSession() {
    localStorage.removeItem('sti_auth_token');
    this.api.setToken(null);
  }

  getToken() {
    return localStorage.getItem('sti_auth_token');
  }

  isAuthenticated() {
    return !!this.getToken();
  }

  hasRole(requiredRole) {
    if (!this.currentUser) {
      return false;
    }
    return this.currentUser.role === requiredRole;
  }
}

export default new AuthService();