import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Hook to handle RTL/LTR direction based on language
export const useDirection = () => {
    const { i18n } = useTranslation();

    useEffect(() => {
        const isRTL = i18n.language === 'ar';
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', i18n.language);

        // Update body class for styling
        if (isRTL) {
            document.body.classList.add('rtl');
            document.body.classList.remove('ltr');
        } else {
            document.body.classList.add('ltr');
            document.body.classList.remove('rtl');
        }
    }, [i18n.language]);

    return {
        isRTL: i18n.language === 'ar',
        direction: i18n.language === 'ar' ? 'rtl' : 'ltr',
    };
};
