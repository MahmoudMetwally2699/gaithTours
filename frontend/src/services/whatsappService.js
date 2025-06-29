import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with auth
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const whatsappService = {
  // Get all conversations
  getConversations: async (params = {}) => {
    const response = await apiClient.get('/admin/whatsapp/conversations', { params });
    return response.data;
  },

  // Get messages for a specific phone number
  getMessages: async (phone, params = {}) => {
    const response = await apiClient.get(`/admin/whatsapp/messages/${phone}`, { params });
    return response.data;
  },

  // Send a reply
  sendReply: async (phone, message, messageType = 'text', metadata = {}) => {
    const response = await apiClient.post('/admin/whatsapp/reply', {
      phone,
      message,
      messageType,
      metadata
    });
    return response.data;
  },

  // Mark message as read
  markMessageAsRead: async (messageId) => {
    const response = await apiClient.put(`/admin/whatsapp/messages/${messageId}/read`);
    return response.data;
  },

  // Mark all messages in conversation as read
  markConversationAsRead: async (conversationId) => {
    const response = await apiClient.put(`/admin/whatsapp/conversations/${conversationId}/read-all`);
    return response.data;
  },

  // Get statistics
  getStats: async (period = '7d') => {
    const response = await apiClient.get('/admin/whatsapp/stats', { params: { period } });
    return response.data;
  },

  // Toggle VIP status
  toggleVip: async (conversationId) => {
    const response = await apiClient.put(`/admin/whatsapp/conversations/${conversationId}/toggle-vip`);
    return response.data;
  },

  // Toggle archive status
  toggleArchive: async (conversationId) => {
    const response = await apiClient.put(`/admin/whatsapp/conversations/${conversationId}/archive`);
    return response.data;
  },

  // Assign conversation to admin
  assignConversation: async (conversationId, adminUserId) => {
    const response = await apiClient.post(`/admin/whatsapp/conversations/${conversationId}/assign`, {
      adminUserId
    });
    return response.data;
  },
  // Test socket events (for debugging)
  testSocket: async (eventType = 'new_whatsapp_message') => {
    const response = await apiClient.post('/admin/whatsapp/test-socket', {
      eventType
    });
    return response.data;
  },

  // Get recent updates for polling fallback
  getRecentUpdates: async (params = {}) => {
    const response = await apiClient.get('/admin/whatsapp/recent-updates', { params });
    return response.data;
  }
};

export default whatsappService;
