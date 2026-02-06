import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { authAPI } from '../services/api';

interface PhoneNumberModalProps {
  isOpen: boolean;
  onSubmit: (phone: string) => Promise<void>;
  onClose?: () => void;
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

type Step = 'phone' | 'otp';

export const PhoneNumberModal: React.FC<PhoneNumberModalProps> = ({
  isOpen,
  onSubmit,
  onClose,
  userName
}) => {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+966');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // OTP state
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const selectedCountry = countryCodes.find(c => c.code === countryCode);

  // Format phone number: strip leading 0 from local numbers (e.g., 01211477551 -> 1211477551)
  const formatPhoneNumber = (localPhone: string, code: string): string => {
    let cleaned = localPhone.replace(/[\s-]/g, '');
    // If local number starts with 0, remove it (e.g., Egyptian 01211477551 -> 1211477551)
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `${code}${cleaned}`;
  };

  const fullPhone = formatPhoneNumber(phone, countryCode);

  // Cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Auto-focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp' && otpInputRefs.current[0]) {
      otpInputRefs.current[0].focus();
    }
  }, [step]);

  const validatePhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/[\s-]/g, '');
    return /^\d{6,14}$/.test(cleaned);
  };

  // Handle sending verification code
  const handleSendCode = async () => {
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
      const language = i18n.language || 'ar';
      await authAPI.sendPhoneVerificationCode(fullPhone, language);
      setStep('otp');
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || t('auth.sendCodeFailed', 'Failed to send verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OTP input change
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last digit
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5 && otpInputRefs.current[index + 1]) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every(digit => digit !== '') && newOtp.join('').length === 6) {
      handleVerifyCode(newOtp.join(''));
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      handleVerifyCode(pastedData);
    }
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Handle code verification
  const handleVerifyCode = async (code: string) => {
    setIsLoading(true);
    setError('');

    try {
      await authAPI.verifyPhoneCode(fullPhone, code);
      // Successfully verified - call the parent's onSubmit
      await onSubmit(fullPhone);
    } catch (err: any) {
      setError(err.message || t('auth.invalidCode', 'Invalid verification code'));
      setOtp(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);
    setError('');

    try {
      const language = i18n.language || 'ar';
      await authAPI.sendPhoneVerificationCode(fullPhone, language);
      setResendCooldown(60);
      setOtp(['', '', '', '', '', '']);
    } catch (err: any) {
      setError(err.message || t('auth.sendCodeFailed', 'Failed to send verification code'));
    } finally {
      setIsLoading(false);
    }
  };

  // Go back to phone step
  const handleBack = () => {
    setStep('phone');
    setOtp(['', '', '', '', '', '']);
    setError('');
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
        {/* Close Button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white"
            aria-label={t('common.close', 'Close')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-6 sm:px-8 sm:py-8 text-white text-center relative">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            {step === 'phone' ? (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            ) : (
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {step === 'phone'
              ? t('auth.oneLastStep', 'One Last Step!')
              : t('auth.verifyPhone', 'Verify Your Phone')
            }
          </h2>
          {userName && step === 'phone' && (
            <p className="text-orange-100 text-sm">
              {t('auth.welcomeUser', 'Welcome, {{name}}!', { name: userName })}
            </p>
          )}
          {step === 'otp' && (
            <p className="text-orange-100 text-sm">
              {t('auth.codeSentTo', 'Code sent to {{phone}}', { phone: fullPhone })}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-8">
          {step === 'phone' ? (
            <>
              <p className="text-gray-600 text-center mb-6">
                {t('auth.phoneModalDescription', 'To complete your registration and receive booking confirmations, please provide your phone number.')}
              </p>

              {/* Phone Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.phoneNumber', 'Phone Number')}
                </label>
                <div className="flex items-center gap-2">
                  {/* Country Code Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                      className="flex items-center gap-2 px-3 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 hover:border-orange-300 transition-colors min-w-[100px]"
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
                    className={`flex-1 px-3 sm:px-4 py-3 border-2 rounded-xl transition-colors focus:outline-none focus:ring-0 ${
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
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                        <path d="M12 2C6.478 2 2 6.478 2 12c0 1.89.525 3.66 1.438 5.168L2.546 22l4.985-.873A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                      </svg>
                    </div>
                    <span>{t('auth.verifyViaWhatsApp', 'Verification via WhatsApp')}</span>
                  </div>
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
                    <span>{t('auth.benefit3', '24/7 travel support')}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="button"
                onClick={handleSendCode}
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.sendingCode', 'Sending code...')}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                      <path d="M12 2C6.478 2 2 6.478 2 12c0 1.89.525 3.66 1.438 5.168L2.546 22l4.985-.873A9.953 9.953 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                    </svg>
                    <span>{t('auth.sendCodeViaWhatsApp', 'Send Code via WhatsApp')}</span>
                  </div>
                )}
              </motion.button>
            </>
          ) : (
            <>
              {/* OTP Step */}
              <p className="text-gray-600 text-center mb-6">
                {t('auth.enterVerificationCode', 'Enter the 6-digit code we sent to your WhatsApp')}
              </p>

              {/* OTP Input */}
              <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => otpInputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl transition-colors focus:outline-none focus:ring-0 ${
                      error
                        ? 'border-red-300 focus:border-red-500'
                        : 'border-gray-200 focus:border-orange-500'
                    }`}
                    disabled={isLoading}
                  />
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center mb-4 text-sm text-red-500"
                >
                  {error}
                </motion.p>
              )}

              {/* Resend Code */}
              <div className="text-center mb-6">
                {resendCooldown > 0 ? (
                  <p className="text-gray-500 text-sm">
                    {t('auth.resendIn', 'Resend code in {{seconds}}s', { seconds: resendCooldown })}
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isLoading}
                    className="text-orange-600 hover:text-orange-700 font-medium text-sm"
                  >
                    {t('auth.resendCode', "Didn't receive code? Resend")}
                  </button>
                )}
              </div>

              {/* Verify Button */}
              <motion.button
                type="button"
                onClick={() => handleVerifyCode(otp.join(''))}
                disabled={isLoading || otp.some(d => !d)}
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-3"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('auth.verifying', 'Verifying...')}</span>
                  </div>
                ) : (
                  t('auth.verifyAndContinue', 'Verify & Continue')
                )}
              </motion.button>

              {/* Back Button */}
              <button
                type="button"
                onClick={handleBack}
                className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors"
              >
                {t('auth.changePhoneNumber', '← Change phone number')}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default PhoneNumberModal;
