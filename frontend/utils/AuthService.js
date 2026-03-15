import ApiService from '../services/ApiService.js';

class AuthService {
  constructor() {
    this.api = ApiService;
    this.currentUser = null;
  }

  async login(identifier, password) {
    try {
      // Support both email and fullname login
      const credentials = identifier.includes('@') 
        ? { email: identifier, password } 
        : { fullname: identifier, password };
      const response = await this.api.login(credentials);
      this.setSession(response.token);
      this.currentUser = response.user;
      return response;
    } catch (error) {
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(userData) {
    try {
      const response = await this.api.register(userData);
      // Only set session if token is provided (user is pre-activated like admin/coadmin)
      if (response.token) {
        this.setSession(response.token);
        this.currentUser = response.user;
      }
      return response;
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