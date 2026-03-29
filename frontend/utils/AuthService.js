import ApiService from '../services/ApiService.js';

class AuthService {
  constructor() {
    this.api = ApiService;
    this.currentUser = null;
  }

  async login(email, password) {
    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // Call backend API directly
      const response = await this.api.request('/api/auth/login', {
        method: 'POST',
        body: { email, password }
      });

      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      // Set token for backend requests
      this.setSession(response.token);
      this.currentUser = response.user;

      return { success: true, user: this.currentUser };
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(userData) {
    try {
      if (!userData.email || !userData.password || !userData.fullname) {
        throw new Error('Email, password, and fullname are required');
      }

      // Call backend API directly
      const response = await this.api.request('/api/auth/register', {
        method: 'POST',
        body: {
          email: userData.email,
          password: userData.password,
          fullname: userData.fullname,
          role: userData.role || 'pending'
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      this.currentUser = response.user;

      return { success: true, user: this.currentUser };
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
