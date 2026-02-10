import axios from 'axios';
import { getGuestId } from './chatService';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Get headers for push API calls — supports both authenticated and guest users
 */
const getPushHeaders = () => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json'
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else {
        headers['x-guest-id'] = getGuestId();
    }

    return { headers };
};

/**
 * Get the VAPID public key from the server
 */
export const getVapidKey = async (): Promise<string> => {
    const response = await axios.get(`${API_URL}/push/vapid-key`);
    return response.data.data.publicKey;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPush = async (subscription: PushSubscription): Promise<void> => {
    await axios.post(
        `${API_URL}/push/subscribe`,
        { subscription: subscription.toJSON() },
        getPushHeaders()
    );
};

/**
 * Unsubscribe from push notifications
 */
export const unsubscribeFromPush = async (endpoint: string): Promise<void> => {
    await axios.delete(`${API_URL}/push/unsubscribe`, {
        ...getPushHeaders(),
        data: { endpoint }
    });
};

/**
 * Check push subscription status
 */
export const getPushStatus = async (): Promise<{ isSubscribed: boolean; subscriptionCount: number }> => {
    const response = await axios.get(`${API_URL}/push/status`, getPushHeaders());
    return response.data.data;
};

/**
 * Send a test notification to self
 */
export const sendTestNotification = async (): Promise<void> => {
    await axios.post(`${API_URL}/push/test`, {}, getPushHeaders());
};

/**
 * Convert a base64 VAPID key to Uint8Array (needed for PushManager.subscribe)
 */
export const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};
