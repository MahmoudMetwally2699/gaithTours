import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';

import arCommon from './locales/ar/common.json';
import arHome from './locales/ar/home.json';
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
        searchResults: enSearchResults,
        hotelDetails: enHotelDetails,
        booking: enBooking
    },
    ar: {
        common: arCommon,
        home: arHome,
        searchResults: arSearchResults,
        hotelDetails: arHotelDetails,
        booking: arBooking
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common', 'home', 'searchResults', 'hotelDetails', 'booking'],

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
updateDirection(i18n.language || 'en');

// Listen for language changes
i18n.on('languageChanged', (lng) => {
    updateDirection(lng);
});

export default i18n;
