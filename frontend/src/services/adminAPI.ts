import api from './api';

// Admin API endpoints
export const adminAPI = {
    // Dashboard stats
    getStats: () => api.get('/admin/stats'),
    getPromoStats: (params = {}) => api.get('/admin/analytics/promo-stats', { params }),
    // Clients management
    getClients: (params = {}) => api.get('/admin/clients', { params }),
    getClient: (id: string) => api.get(`/admin/clients/${id}`),
    createClient: (data: any) => api.post('/admin/clients', data),
    updateClient: (id: string, data: any) => api.put(`/admin/clients/${id}`, data),
    deleteClient: (id: string) => api.delete(`/admin/clients/${id}`),

    // Booking requests management
    getBookings: (params = {}) => api.get('/admin/bookings', { params }),
    approveBooking: (id: string, data: any) => api.patch(`/admin/bookings/${id}/approve`, data),
    denyBooking: (id: string, data: any) => api.patch(`/admin/bookings/${id}/deny`, data),
    createBooking: (data: any) => api.post('/admin/bookings/create', data),

    // Invoices management
    getInvoices: (params = {}) => api.get('/admin/invoices', { params }),
    getInvoice: (id: string) => api.get(`/admin/invoices/${id}`),

    // Payments management
    getPayments: (params = {}) => api.get('/admin/payments', { params }),

    // Margin rules management
    getMarginRules: (params = {}) => api.get('/admin/margins', { params }),
    getMarginRule: (id: string) => api.get(`/admin/margins/${id}`),
    createMarginRule: (data: any) => api.post('/admin/margins', data),
    updateMarginRule: (id: string, data: any) => api.put(`/admin/margins/${id}`, data),
    deleteMarginRule: (id: string) => api.delete(`/admin/margins/${id}`),
    toggleMarginRule: (id: string) => api.patch(`/admin/margins/${id}/toggle`),
    getMarginStats: () => api.get('/admin/margins/stats'),
    getMarginLocations: (params = {}) => api.get('/admin/margins/locations', { params }),
    simulateMargin: (data: any) => api.post('/admin/margins/simulate', data),
    reorderMarginRules: (orderedIds: string[]) => api.post('/admin/margins/reorder', { orderedIds }),

    // Sub-admin management
    getSubAdmins: () => api.get('/admin/sub-admins'),
    inviteSubAdmin: (data: { email: string; permissions: string[] }) =>
        api.post('/admin/sub-admins/invite', data),
    updateSubAdminPermissions: (id: string, permissions: string[]) =>
        api.put(`/admin/sub-admins/${id}/permissions`, { permissions }),
    removeSubAdmin: (id: string) => api.delete(`/admin/sub-admins/${id}`),

    // Invitations management
    getInvitations: () => api.get('/admin/invitations'),
    cancelInvitation: (id: string) => api.delete(`/admin/invitations/${id}`),
    validateInvitation: (token: string) => api.get(`/admin/invitation/${token}`),
    acceptInvitation: (data: { token: string; name: string; password: string; phone: string }) =>
        api.post('/admin/invitation/accept', data),
};

export default adminAPI;
