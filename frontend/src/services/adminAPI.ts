import api from './api';

// Admin API endpoints
export const adminAPI = {
  // Dashboard stats
  getStats: () => api.get('/admin/stats'),
  // Clients management
  getClients: (params = {}) => api.get('/admin/clients', { params }),
  getClient: (id: string) => api.get(`/admin/clients/${id}`),
  createClient: (data: any) => api.post('/admin/clients', data),
  updateClient: (id: string, data: any) => api.put(`/admin/clients/${id}`, data),

  // Booking requests management
  getBookings: (params = {}) => api.get('/admin/bookings', { params }),
  approveBooking: (id: string, data: any) => api.patch(`/admin/bookings/${id}/approve`, data),
  denyBooking: (id: string, data: any) => api.patch(`/admin/bookings/${id}/deny`, data),

  // Invoices management
  getInvoices: (params = {}) => api.get('/admin/invoices', { params }),
  getInvoice: (id: string) => api.get(`/admin/invoices/${id}`),

  // Payments management
  getPayments: (params = {}) => api.get('/admin/payments', { params }),
};

export default adminAPI;
