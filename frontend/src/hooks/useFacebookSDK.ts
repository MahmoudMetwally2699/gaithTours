import { useEffect, useState } from 'react';

const FACEBOOK_APP_ID = process.env.REACT_APP_FACEBOOK_APP_ID || '';

/**
 * Hook to initialize Facebook SDK
 * Returns true when SDK is ready to use
 */
export const useFacebookSDK = (): boolean => {
    const [isReady, setIsReady] = useState(false);

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

    return isReady;
};

/**
 * Check if Facebook SDK is configured
 */
export const isFacebookConfigured = (): boolean => {
    return !!FACEBOOK_APP_ID;
};

export default useFacebookSDK;
