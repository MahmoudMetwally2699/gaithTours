import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const REFERRAL_CODE_KEY = 'gaith_referral_code';
const REFERRAL_EXPIRY_KEY = 'gaith_referral_expiry';

// Referral code expires after 30 days
const REFERRAL_EXPIRY_DAYS = 30;

/**
 * Hook to capture and manage referral codes from URL parameters.
 * When a user visits the site with ?ref=CODE, the code is stored in localStorage
 * and will be automatically applied at checkout.
 */
export const useReferralCapture = () => {
    const location = useLocation();

    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const refCode = searchParams.get('ref');

        if (refCode) {
            // Store the referral code
            localStorage.setItem(REFERRAL_CODE_KEY, refCode.toUpperCase());

            // Set expiry date (30 days from now)
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + REFERRAL_EXPIRY_DAYS);
            localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());

            console.log(`Referral code captured: ${refCode.toUpperCase()}`);
        }
    }, [location.search]);
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

export default useReferralCapture;
