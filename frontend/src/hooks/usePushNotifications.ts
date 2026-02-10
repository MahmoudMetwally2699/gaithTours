import { useState, useEffect, useCallback } from 'react';
import {
    getVapidKey,
    subscribeToPush,
    unsubscribeFromPush,
    getPushStatus,
    urlBase64ToUint8Array
} from '../services/pushNotificationService';

type PermissionState = 'granted' | 'denied' | 'default' | 'unsupported';

interface UsePushNotificationsReturn {
    isSupported: boolean;
    permission: PermissionState;
    isSubscribed: boolean;
    isLoading: boolean;
    subscribe: () => Promise<boolean>;
    unsubscribe: () => Promise<boolean>;
    error: string | null;
}

export const usePushNotifications = (): UsePushNotificationsReturn => {
    const [isSupported] = useState(() => {
        return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    });
    const [permission, setPermission] = useState<PermissionState>(() => {
        if (!('Notification' in window)) return 'unsupported';
        return Notification.permission as PermissionState;
    });
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Check current subscription status
    useEffect(() => {
        if (!isSupported) return;

        const checkStatus = async () => {
            try {
                const status = await getPushStatus();
                setIsSubscribed(status.isSubscribed);
            } catch (err) {
                // Silently fail
            }
        };

        checkStatus();
    }, [isSupported]);

    // Register the service worker
    const registerServiceWorker = useCallback(async (): Promise<ServiceWorkerRegistration | null> => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            await navigator.serviceWorker.ready;
            return registration;
        } catch (err) {
            console.error('Service worker registration failed:', err);
            return null;
        }
    }, []);

    // Subscribe to push notifications
    const subscribe = useCallback(async (): Promise<boolean> => {
        if (!isSupported) {
            setError('Push notifications are not supported in this browser');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Request notification permission
            const perm = await Notification.requestPermission();
            setPermission(perm as PermissionState);

            if (perm !== 'granted') {
                setError('Notification permission denied');
                setIsLoading(false);
                return false;
            }

            // Register service worker
            const registration = await registerServiceWorker();
            if (!registration) {
                setError('Failed to register service worker');
                setIsLoading(false);
                return false;
            }

            // Get VAPID key
            const vapidKey = await getVapidKey();
            const applicationServerKey = urlBase64ToUint8Array(vapidKey);

            // Subscribe to push
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey as any
            });

            // Send subscription to server
            await subscribeToPush(subscription);

            setIsSubscribed(true);
            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error('Push subscription failed:', err);
            setError(err.message || 'Failed to subscribe to notifications');
            setIsLoading(false);
            return false;
        }
    }, [isSupported, registerServiceWorker]);

    // Unsubscribe from push notifications
    const unsubscribe = useCallback(async (): Promise<boolean> => {
        setIsLoading(true);
        setError(null);

        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration) {
                const subscription = await registration.pushManager.getSubscription();
                if (subscription) {
                    await subscription.unsubscribe();
                    await unsubscribeFromPush(subscription.endpoint);
                }
            }

            setIsSubscribed(false);
            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error('Push unsubscription failed:', err);
            setError(err.message || 'Failed to unsubscribe');
            setIsLoading(false);
            return false;
        }
    }, []);

    return {
        isSupported,
        permission,
        isSubscribed,
        isLoading,
        subscribe,
        unsubscribe,
        error
    };
};
