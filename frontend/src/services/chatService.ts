import api from './api';
import axios from 'axios';

export interface SupportChat {
    _id: string;
    userId: any;
    guestId?: string;
    guestName?: string;
    subject: string;
    topic: 'booking' | 'payment' | 'cancellation' | 'general' | 'technical' | 'other';
    status: 'open' | 'assigned' | 'resolved' | 'closed';
    assignedAdmin?: { _id: string; name: string };
    lastMessageAt: string;
    lastMessagePreview: string;
    unreadByUser: number;
    unreadByAdmin: number;
    createdAt: string;
}

export interface ChatMessage {
    _id: string;
    chatId: string;
    sender: 'user' | 'admin';
    senderUserId: { _id: string; name: string } | string;
    message: string;
    isRead: boolean;
    createdAt: string;
}

/**
 * Generate or retrieve a persistent guest ID for non-authenticated users
 */
export const getGuestId = (): string => {
    let guestId = localStorage.getItem('gaith_guest_id');
    if (!guestId) {
        guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
        localStorage.setItem('gaith_guest_id', guestId);
    }
    return guestId;
};

/**
 * Create an axios instance with guest headers (for non-authenticated requests)
 */
const guestApi = () => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
    return axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
            'x-guest-id': getGuestId()
        }
    });
};

/**
 * Get the appropriate API instance (authenticated or guest)
 */
const getApi = (isAuthenticated: boolean) => {
    return isAuthenticated ? api : guestApi();
};

export const chatAPI = {
    createChat: async (subject: string, topic: string, message: string, isAuthenticated: boolean = true, guestName?: string) => {
        const instance = getApi(isAuthenticated);
        const response = await instance.post('/support-chat', { subject, topic, message, guestName });
        return response.data;
    },

    getMyChats: async (isAuthenticated: boolean = true) => {
        const instance = getApi(isAuthenticated);
        const response = await instance.get('/support-chat');
        return response.data;
    },

    getChatMessages: async (chatId: string, isAuthenticated: boolean = true) => {
        const instance = getApi(isAuthenticated);
        const response = await instance.get(`/support-chat/${chatId}/messages`);
        return response.data;
    },

    sendMessage: async (chatId: string, message: string, isAuthenticated: boolean = true) => {
        const instance = getApi(isAuthenticated);
        const response = await instance.post(`/support-chat/${chatId}/messages`, { message });
        return response.data;
    },

    closeChat: async (chatId: string, isAuthenticated: boolean = true) => {
        const instance = getApi(isAuthenticated);
        const response = await instance.patch(`/support-chat/${chatId}/close`);
        return response.data;
    },

    // Admin endpoints (always authenticated)
    adminGetChats: async (status?: string, page: number = 1) => {
        const response = await api.get('/support-chat/admin/list', { params: { status, page } });
        return response.data;
    },

    adminGetMessages: async (chatId: string) => {
        const response = await api.get(`/support-chat/admin/${chatId}/messages`);
        return response.data;
    },

    adminSendMessage: async (chatId: string, message: string) => {
        const response = await api.post(`/support-chat/admin/${chatId}/messages`, { message });
        return response.data;
    },

    adminAssign: async (chatId: string) => {
        const response = await api.patch(`/support-chat/admin/${chatId}/assign`);
        return response.data;
    },

    adminResolve: async (chatId: string) => {
        const response = await api.patch(`/support-chat/admin/${chatId}/resolve`);
        return response.data;
    }
};
