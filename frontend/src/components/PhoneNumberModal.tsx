import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PhoneNumberModalProps {
  isOpen: boolean;
  onSubmit: (phone: string) => Promise<void>;
  userName?: string;
}

// Popular country codes
const countryCodes = [
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+63', country: 'Philippines', flag: '🇵🇭' },
  { code: '+90', country: 'Turkey', flag: '🇹🇷' },
];

export const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({
  isOpen,
  onSubmit,
  userName
}) => {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const selectedCountry = countryCodes.find(c => c.code === countryCode);

  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    return /^\d{6,14}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError(t('auth.phoneRequired', 'Phone number is required'));
      return;
    }

    if (!validatePhone(phone)) {
      setError(t('auth.invalidPhone', 'Please enter a valid phone number'));
      return;
    }

    setIsLoading(true);
    try {
      const fullPhone = `${countryCode}${phone.replace(/[\s-]/g, '')}`;
      await onSubmit(fullPhone);
    } catch (err: any) {
      setError(err.message || t('auth.phoneUpdateFailed', 'Failed to save phone number'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {t('auth.oneLastStep', 'One Last Step!')}
          </h2>
          {userName && (
            <p className="text-orange-100 text-sm">
              {t('auth.welcomeUser', 'Welcome, {{name}}!', { name: userName })}
            </p>
          )}
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8">
          <p className="text-gray-600 text-center mb-6">
            {t('auth.phoneModalDescription', 'To complete your registration and receive booking confirmations, please provide your phone number.')}
          </p>

          {/* Phone Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.phoneNumber', 'Phone Number')}
            </label>
            <div className="flex gap-2">
              {/* Country Code Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                  className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 hover:border-orange-300 transition-colors min-w-[120px]"
                >
                  <span>{selectedCountry?.flag}</span>
                  <span className="font-medium">{countryCode}</span>
                  <svg className={`w-4 h-4 transition-transform ${showCountryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {showCountryDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 max-h-60 overflow-y-auto"
                  >
                    {countryCodes.map((country) => (
                      <button
                        key={country.code}
                        type="button"
                        onClick={() => {
                          setCountryCode(country.code);
                          setShowCountryDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-orange-50 transition-colors text-left ${
                          countryCode === country.code ? 'bg-orange-50 text-orange-600' : ''
                        }`}
                      >
                        <span>{country.flag}</span>
                        <span className="flex-1">{country.country}</span>
                        <span className="text-gray-500">{country.code}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Phone Number Input */}
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setError('');
                }}
                placeholder="5XXXXXXXX"
                className={`flex-1 px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none focus:ring-0 ${
                  error
                    ? 'border-red-300 focus:border-red-500'
                    : 'border-gray-200 focus:border-orange-500'
                }`}
                autoFocus
              />
            </div>

            {/* Error Message */}
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-sm text-red-500"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Benefits */}
          <div className="bg-orange-50 rounded-xl p-4 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.benefit1', 'Receive instant booking confirmations')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.benefit2', 'Get exclusive deals via WhatsApp')}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <div className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>{t('auth.benefit3', '24/7 travel support')}</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.02 }}
            whileTap={{ scale: isLoading ? 1 : 0.98 }}
            className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t('auth.saving', 'Saving...')}</span>
              </div>
            ) : (
              t('auth.continueToGaith', 'Continue to Gaith Tours')
            )}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default PhoneNumberModal;
