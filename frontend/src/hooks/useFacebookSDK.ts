import { useEffect, useState, useCallback } from 'react';

const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || '';
const FACEBOOK_CONFIG_ID = process.env.REACT_APP_FACEBOOK_CONFIG_ID || '';

interface FacebookAuthResponse {
    accessToken: string;
    expiresIn: number;
    signedRequest: string;
    userID: string;
}

interface FacebookLoginStatus {
    status: 'connected' | 'not_authorized' | 'unknown';
    authResponse?: FacebookAuthResponse;
}

/**
 * Hook to initialize Facebook SDK
 * Returns SDK ready state and login function
 */
export const useFacebookSDK = () => {
    const [isReady, setIsReady] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Skip if no App ID configured
        if (!FACEBOOK_APP_ID) {
            console.warn('Facebook App ID not configured');
            return;
        }

        // Skip if already loaded
        if (window.FB) {
            setIsReady(true);
            return;
        }

        // Define callback for when SDK loads
        window.fbAsyncInit = function () {
            window.FB.init({
                appId: FACEBOOK_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });

            window.FB.AppEvents.logPageView();
            setIsReady(true);
        };

        // Load SDK script
        const loadFacebookSDK = () => {
            if (document.getElementById('facebook-jssdk')) return;

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;

            const firstScript = document.getElementsByTagName('script')[0];
            firstScript.parentNode?.insertBefore(script, firstScript);
        };

        loadFacebookSDK();
    }, []);

    // Login function using FB.login()
    const login = useCallback((): Promise<{ accessToken: string; userInfo: any }> => {
        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK not loaded'));
                return;
            }

            setIsLoading(true);

            window.FB.login((response: FacebookLoginStatus) => {
                if (response.status === 'connected' && response.authResponse) {
                    const { accessToken } = response.authResponse;

                    // Get user info
                    window.FB.api('/me', { fields: 'name,email,picture.type(large)' }, (userInfo: any) => {
                        setIsLoading(false);
                        if (userInfo.error) {
                            reject(new Error(userInfo.error.message));
                        } else {
                            resolve({ accessToken, userInfo });
                        }
                    });
                } else {
                    setIsLoading(false);
                    reject(new Error('Facebook login was cancelled or failed'));
                }
            }, {
                scope: 'email,public_profile',
                config_id: FACEBOOK_CONFIG_ID || undefined
            });
        });
    }, []);

    // Check current login status
    const getLoginStatus = useCallback((): Promise<FacebookLoginStatus> => {
        return new Promise((resolve, reject) => {
            if (!window.FB) {
                reject(new Error('Facebook SDK not loaded'));
                return;
            }

            window.FB.getLoginStatus((response: FacebookLoginStatus) => {
                resolve(response);
            });
        });
    }, []);

    return {
        isReady,
        isLoading,
        login,
        getLoginStatus
    };
};

/**
 * Check if Facebook SDK is configured
 */
export const isFacebookConfigured = (): boolean => {
    return !!FACEBOOK_APP_ID;
};

// TypeScript declaration for Facebook SDK
declare global {
    interface Window {
        FB: {
            init: (params: any) => void;
            login: (callback: (response: any) => void, options?: any) => void;
            logout: (callback?: (response: any) => void) => void;
            getLoginStatus: (callback: (response: any) => void) => void;
            api: (path: string, params: any, callback: (response: any) => void) => void;
            AppEvents: {
                logPageView: () => void;
            };
        };
        fbAsyncInit: () => void;
    }
}

export default useFacebookSDK;
