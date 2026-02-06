import { useEffect } from 'react';
import { useLocation, useHistory } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const REFERRAL_CODE_KEY = 'gaith_referral_code';
const REFERRAL_EXPIRY_KEY = 'gaith_referral_expiry';
const PROMO_REDIRECT_KEY = 'gaith_promo_redirect';

// Referral code expires after 30 days
const REFERRAL_EXPIRY_DAYS = 30;

/**
 * Hook to capture and manage referral codes from URL parameters.
 * When a user visits the site with ?ref=CODE, the code is stored in localStorage
 * and will be automatically applied at checkout.
 *
 * If the user is not logged in, they will be redirected to the login page
 * with a message prompting them to sign in to use the promo code.
 */
export const useReferralCapture = () => {
    const location = useLocation();
    const history = useHistory();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const refCode = searchParams.get('ref');

        if (refCode) {
            // Store the referral code regardless of auth status
            localStorage.setItem(REFERRAL_CODE_KEY, refCode.toUpperCase());

            // Set expiry date (30 days from now)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + REFERRAL_EXPIRY_DAYS);
            localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());

            console.log(`Referral code captured: ${refCode.toUpperCase()}`);

            // Check if user is logged in
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            const isLoggedIn = !!(token && user);

            if (!isLoggedIn) {
                // Store the current URL to return to after login
                const returnUrl = location.pathname + location.search;
                localStorage.setItem(PROMO_REDIRECT_KEY, returnUrl);

                // Show toast message
                toast.error('Please sign in to use the promo code', {
                    duration: 5000,
                    icon: '🔐',
                });

                // Redirect to login page
                history.push('/login?promo=true');
            }
        }
    }, [location.search, location.pathname, history]);
};

/**
 * Get the stored referral code if it exists and hasn't expired
 */
export const getStoredReferralCode = (): string | null => {
    const code = localStorage.getItem(REFERRAL_CODE_KEY);
    const expiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);

    if (!code || !expiry) {
        return null;
    }

    // Check if expired
    if (new Date(expiry) < new Date()) {
        clearReferralCode();
        return null;
    }

    return code;
};

/**
 * Clear the stored referral code
 */
export const clearReferralCode = () => {
    localStorage.removeItem(REFERRAL_CODE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
};

/**
 * Get the stored promo redirect URL (where user was when they scanned the promo code)
 */
export const getPromoRedirectUrl = (): string | null => {
    return localStorage.getItem(PROMO_REDIRECT_KEY);
};

/**
 * Clear the stored promo redirect URL
 */
export const clearPromoRedirect = () => {
    localStorage.removeItem(PROMO_REDIRECT_KEY);
};

export default useReferralCapture;
