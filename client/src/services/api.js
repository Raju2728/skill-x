import axios from 'axios';

// ---------------------------------------------------------------------------
// Base URL resolution
//
// Development (npm run dev):
//   VITE_API_URL is empty → baseURL = '/api'
//   Vite's dev-server proxy forwards /api → http://localhost:5000/api
//
// Production (Vercel):
//   VITE_API_URL = 'https://your-backend.onrender.com'
//   baseURL becomes 'https://your-backend.onrender.com/api'
// ---------------------------------------------------------------------------
const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect to login if the user is on a protected /app route
      // (i.e., their session expired while using the app).
      // Don't redirect on public pages — the AuthContext handles 401 gracefully.
      const path = window.location.pathname;
      if (path.startsWith('/app')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  getConfig: () => api.get('/auth/config'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  // Google OAuth — redirect to backend (not Vercel) so the server handles the OAuth flow
  googleAuth: () => {
    const backendUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${backendUrl}/api/auth/google`;
  },
};

// User API
export const userAPI = {
  getProfile: (id) => api.get(`/users/${id}`),
  updateProfile: (data) => api.put('/users/profile', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getUsers: (params) => api.get('/users', { params }),
};

// Skill API
export const skillAPI = {
  getAll: (params) => api.get('/skills', { params }),
  getCategories: () => api.get('/skills/categories'),
  getUserSkills: (userId) => api.get(`/users/${userId}/skills`),
  addUserSkill: (data) => api.post('/users/skills', data),
  removeUserSkill: (skillId) => api.delete(`/users/skills/${skillId}`),
};

// Match API
export const matchAPI = {
  getMatches: () => api.get('/matches'),
  getMatchExplanation: (userId) => api.get(`/matches/${userId}/explain`),
};

// Exchange API
export const exchangeAPI = {
  sendRequest: (data) => api.post('/exchange-requests', data),
  getRequests: (params) => api.get('/exchange-requests', { params }),
  respond: (id, action) => api.put(`/exchange-requests/${id}/${action}`),
};

// Connection API
export const connectionAPI = {
  getConnections: (params) => api.get('/connections', { params }),
  getConnection: (id) => api.get(`/connections/${id}`),
};

// Conversation API
export const conversationAPI = {
  getConversations: () => api.get('/conversations'),
  getMessages: (id, params) => api.get(`/conversations/${id}/messages`, { params }),
  createConversation: (participantId) => api.post('/conversations', { participantId }),
  sendMessage: (conversationId, data) => api.post(`/conversations/${conversationId}/messages`, data),
};

// Session API
export const sessionAPI = {
  create: (data) => api.post('/sessions', data),
  getAll: (params) => api.get('/sessions', { params }),
  getById: (id) => api.get(`/sessions/${id}`),
  update: (id, data) => api.put(`/sessions/${id}`, data),
  cancel: (id) => api.put(`/sessions/${id}/cancel`),
};

// Review API
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByUser: (userId, params) => api.get(`/users/${userId}/reviews`, { params }),
};

// Learning API
export const learningAPI = {
  getGoals: () => api.get('/learning/goals'),
  createGoal: (data) => api.post('/learning/goals', data),
  updateGoal: (id, data) => api.put(`/learning/goals/${id}`, data),
  getProgress: () => api.get('/learning/progress'),
};

// Notification API
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  getSkills: (params) => api.get('/admin/skills', { params }),
  createSkill: (data) => api.post('/admin/skills', data),
  updateSkill: (id, data) => api.put(`/admin/skills/${id}`, data),
  deleteSkill: (id) => api.delete(`/admin/skills/${id}`),
  getReports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (id, data) => api.put(`/admin/reports/${id}`, data),
  getAuditLogs: (params) => api.get('/admin/audit-logs', { params }),
};

// Keys API (E2EE)
export const keysAPI = {
  uploadBundle: (data) => api.post('/keys/bundle', data),
  getBundle: (userId) => api.get(`/keys/bundle/${userId}`),
  uploadPreKeys: (data) => api.post('/keys/prekeys', data),
};

// File API
export const fileAPI = {
  upload: (file, metadata) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) formData.append('metadata', JSON.stringify(metadata));
    return api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getFile: (id) => api.get(`/files/${id}`),
};
