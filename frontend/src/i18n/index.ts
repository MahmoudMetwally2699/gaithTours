import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { en } from './en';
import { ar } from './ar';

// Translation resources
const resources = {
    en: {
        translation: en
    },
    ar: {
        translation: ar
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // Set Arabic as default language
        fallbackLng: 'en', // Set Arabic as fallback language

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

// Set initial document direction based on default language
document.dir = 'rtl';
document.documentElement.lang = 'ar';

export default i18n;
