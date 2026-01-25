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
        fallbackLng: 'en', // Set English as fallback language

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
