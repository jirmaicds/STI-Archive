import config from './app.js';

class ApiService {
  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      timeout: this.timeout
    };

    if (this.token) {
      config.headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`API request failed: ${error.message}`);
    }
  }

  async register(userData) {
    return this.request(
      config.api.endpoints.register,
      {
        method: 'POST',
        body: userData
      }
    );
  }

  async login(credentials) {
    return this.request(
      config.api.endpoints.login,
      {
        method: 'POST',
        body: credentials
      }
    );
  }

  async getProfile() {
    return this.request(
      config.api.endpoints.profile,
      {
        method: 'GET'
      }
    );
  }

  async activateAccount(token) {
    return this.request(
      `${config.api.endpoints.activate}/${token}`,
      {
        method: 'GET'
      }
    );
  }

  async forgotPassword(email) {
    return this.request(
      config.api.endpoints.forgotPassword,
      {
        method: 'POST',
        body: { email }
      }
    );
  }

  async resetPassword(token, password) {
    return this.request(
      `${config.api.endpoints.resetPassword}/${token}`,
      {
        method: 'POST',
        body: { password }
      }
    );
  }

  // Code-based password reset methods
  async verifyResetCode(code) {
    return this.request(
      config.api.endpoints.verifyResetCode,
      {
        method: 'POST',
        body: { code }
      }
    );
  }

  async resetPasswordWithCode(code, newPassword) {
    return this.request(
      config.api.endpoints.resetPasswordWithCode,
      {
        method: 'POST',
        body: { code, newPassword }
      }
    );
  }

  async approveUser(email) {
    return this.request(
      `${config.api.endpoints.approveUser}/${email}`,
      {
        method: 'POST'
      }
    );
  }
}

export default new ApiService();