/**
 * ARCHON API CLIENT
 * Handles JWT storage, header injection, and REST endpoints
 */

const API = {
  TOKEN_KEY: 'archon_auth_token',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  setToken(token) {
    if (token) {
      localStorage.setItem(this.TOKEN_KEY, token);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  },

  clearToken() {
    localStorage.removeItem(this.TOKEN_KEY);
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Auth Endpoints
  auth: {
    login: (identifier, password) => API.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    }),

    register: (userData) => API.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    }),

    me: () => API.request('/api/auth/me'),

    getDemoAccounts: () => API.request('/api/auth/demo-accounts')
  },

  // Activities Endpoints
  activities: {
    getAll: () => API.request('/api/activities'),

    create: (activityData) => API.request('/api/activities', {
      method: 'POST',
      body: JSON.stringify(activityData)
    }),

    delete: (id) => API.request(`/api/activities/${id}`, {
      method: 'DELETE'
    })
  },

  // Workout Logs Endpoints
  logs: {
    getMy: (filters = {}) => {
      const query = new URLSearchParams(filters).toString();
      return API.request(`/api/logs/my${query ? '?' + query : ''}`);
    },

    getMySummary: () => API.request('/api/logs/my-summary'),

    create: (logData) => API.request('/api/logs', {
      method: 'POST',
      body: JSON.stringify(logData)
    }),

    update: (id, logData) => API.request(`/api/logs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(logData)
    }),

    delete: (id) => API.request(`/api/logs/${id}`, {
      method: 'DELETE'
    })
  },

  // Leaderboard Endpoints
  leaderboard: {
    get: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return API.request(`/api/leaderboard${query ? '?' + query : ''}`);
    }
  },

  // Stats & Head-to-Head Comparison
  stats: {
    compare: (user1Id, user2Id, activity = 'all') => {
      const query = new URLSearchParams({ user1: user1Id, user2: user2Id, activity }).toString();
      return API.request(`/api/stats/compare?${query}`);
    }
  }
};
