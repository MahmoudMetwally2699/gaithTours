import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enAdmin from './locales/en/admin.json';

import arCommon from './locales/ar/common.json';
import arHome from './locales/ar/home.json';
import arAdmin from './locales/ar/admin.json';
import enSearchResults from './locales/en/searchResults.json';
import arSearchResults from './locales/ar/searchResults.json';
import enHotelDetails from './locales/en/hotelDetails.json';
import arHotelDetails from './locales/ar/hotelDetails.json';
import enBooking from './locales/en/booking.json';
import arBooking from './locales/ar/booking.json';

// Translation resources with namespaces
const resources = {
    en: {
        common: enCommon,
        home: enHome,
        admin: enAdmin,
        searchResults: enSearchResults,
        hotelDetails: enHotelDetails,
        booking: enBooking
    },
    ar: {
        common: arCommon,
        home: arHome,
        admin: arAdmin,
        searchResults: arSearchResults,
        hotelDetails: arHotelDetails,
        booking: arBooking
    }
};

// Clean up any stale region-specific language codes from storage (e.g. "en-US" → "en")
['localStorage', 'sessionStorage'].forEach(storageType => {
    try {
        const storage = storageType === 'localStorage' ? localStorage : sessionStorage;
        const stored = storage.getItem('i18nextLng');
        if (stored && stored.includes('-')) {
            const clean = stored.split('-')[0];
            if (['en', 'ar'].includes(clean)) {
                storage.setItem('i18nextLng', clean);
            }
        }
    } catch { /* storage unavailable */ }
});

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        supportedLngs: ['en', 'ar'],
        load: 'languageOnly', // Always strip region: "en-US" → "en", "ar-SA" → "ar"
        nonExplicitSupportedLngs: true, // Maps "en-US", "en-GB" etc. → "en"
        cleanCode: true, // Normalize language codes (lowercase, strip region)
        defaultNS: 'common',
        ns: ['common', 'home', 'admin', 'searchResults', 'hotelDetails', 'booking'],

        debug: process.env.NODE_ENV === 'development',

        interpolation: {
            escapeValue: false,
        },

        detection: {
            order: ['localStorage', 'sessionStorage', 'navigator', 'htmlTag'],
            caches: ['localStorage', 'sessionStorage'],
        },

        react: {
            useSuspense: false,
        },
    });

// Set initial document direction based on detected language
const updateDirection = (lang: string) => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.dir = dir;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    // Add/remove font class for Arabic
    if (lang === 'ar') {
        document.body.classList.add('font-cairo');
        document.body.classList.remove('font-sans');
    } else {
        document.body.classList.add('font-sans');
        document.body.classList.remove('font-cairo');
    }
};

// Initialize direction based on current language
// Fix: strip region codes like "en-US" → "en" that the detector may pass through
const resolvedLang = (i18n.language || 'en').split('-')[0].split('_')[0];
if (resolvedLang !== i18n.language) {
    i18n.changeLanguage(resolvedLang);
}
updateDirection(resolvedLang);

// Listen for language changes
i18n.on('languageChanged', (lng) => {
    // Strip region codes (e.g. "en-US" → "en")
    const clean = lng.split('-')[0].split('_')[0];
    if (clean !== lng) {
        i18n.changeLanguage(clean);
        return; // Will re-trigger this callback with the clean code
    }
    updateDirection(lng);
});

export default i18n;
