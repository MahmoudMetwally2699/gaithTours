import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  PhoneIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { SocialLoginButtons } from '../components/SocialLoginButtons';
import ReactCountryDropdown from 'react-country-dropdown';

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; requirements: { [key: string]: boolean } } => {
  const requirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[@$!%*?&]/.test(password)
  };

  const score = Object.values(requirements).filter(Boolean).length;
  return { score, requirements };
};

const getStrengthColor = (score: number) => {
  if (score <= 1) return 'bg-red-500';
  if (score <= 2) return 'bg-orange-500';
  if (score <= 3) return 'bg-yellow-500';
  if (score <= 4) return 'bg-lime-500';
  return 'bg-green-500';
};

const getStrengthText = (score: number) => {
  if (score <= 1) return 'Weak';
  if (score <= 2) return 'Fair';
  if (score <= 3) return 'Good';
  if (score <= 4) return 'Strong';
  return 'Excellent';
};

export const Register: React.FC = () => {
  const { t } = useTranslation();
  const { register, socialLogin } = useAuth();
  const history = useHistory();
  const { isRTL } = useDirection();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneCountryCode: '+966',
    nationality: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = calculatePasswordStrength(formData.password);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
    if (error) setError('');
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.passwordMismatch', 'Passwords do not match'));
      return false;
    }
    if (formData.password.length < 8) {
      setError(t('auth.register.passwordLength', 'Password must be at least 8 characters'));
      return false;
    }
    if (!formData.agreeToTerms) {
      setError(t('auth.register.agreeTerms', 'Please agree to the terms'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');

    try {
      const fullPhoneNumber = formData.phoneCountryCode + formData.phone;
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: fullPhoneNumber,
        nationality: formData.nationality
      });
      setSuccess(true);
      setTimeout(() => {
        history.push('/');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('auth.register.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (accessToken: string, userInfo: any) => {
    try {
      setIsLoading(true);
      setError('');
      await socialLogin('google', accessToken, userInfo);
      history.push('/');
    } catch (err: any) {
      setError(err.message || 'Google signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFacebookSuccess = async (accessToken: string, userInfo: any) => {
    try {
      setIsLoading(true);
      setError('');
      await socialLogin('facebook', accessToken, userInfo);
      history.push('/');
    } catch (err: any) {
      setError(err.message || 'Facebook signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Floating particles
  const particles = Array.from({ length: 15 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 20 + 10,
    delay: Math.random() * 5
  }));

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-12 text-center max-w-md w-full"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-3xl flex items-center justify-center"
          >
            <CheckIcon className="h-10 w-10 text-white" />
          </motion.div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {t('auth.register.success.title', 'Account Created!')}
          </h2>
          <p className="text-gray-600 text-lg mb-2">
            {t('auth.register.success.message', 'Welcome to Gaith Tours!')}
          </p>
          <p className="text-sm text-gray-500">
            {t('auth.register.success.redirect', 'Redirecting you...')}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <motion.div
        className="hidden lg:flex lg:w-5/12 relative bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 overflow-hidden sticky top-0 h-screen"
      >
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-600/90 via-amber-500/80 to-yellow-400/70" />
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute rounded-full bg-white/20"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0.2, 0.5, 0.2],
              }}
              transition={{
                duration: particle.duration,
                delay: particle.delay,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -top-20 -left-20 w-80 h-80 rounded-full border-[30px] border-white/10"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2, delay: 0.8 }}
            className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full border-[50px] border-white/10"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white text-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
            className="mb-8"
          >
            <div className="w-40 h-40 flex items-center justify-center p-6">
              <img src="/Group.svg" alt="Gaith Tours" className="w-full h-full object-contain" />
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-3xl font-bold mb-4"
          >
            Join Gaith Tours
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl text-white/90 mb-8 max-w-sm"
          >
            Start your journey to discovering amazing destinations
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            {[
              'Access exclusive deals',
              'Save your favorite hotels',
              'Quick booking process'
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-3 text-white/90"
              >
                <CheckCircleIcon className="h-5 w-5" />
                <span>{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-7/12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-orange-50/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.05),transparent_50%)]" />
        </div>

        <div className="relative z-10 min-h-screen flex items-center justify-center py-8 px-6 sm:px-10 lg:px-14">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-lg"
          >
            {/* Mobile Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="lg:hidden flex justify-center mb-6"
            >
              <div className="w-32 h-32 flex items-center justify-center p-4">
                <img src="/Group.svg" alt="Gaith Tours" className="w-full h-full object-contain" />
              </div>
            </motion.div>

            {/* Back to Home Button */}
            <div className="absolute top-6 right-6 z-20">
              <Link
                to="/"
                className="group flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:bg-white transition-all duration-300"
              >
                {isRTL ? (
                  <ArrowRightIcon className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
                ) : (
                  <ArrowLeftIcon className="w-4 h-4 text-gray-600 group-hover:text-orange-500 transition-colors" />
                )}
                <span className="text-sm font-medium text-gray-600 group-hover:text-orange-500 transition-colors">
                  {t('nav.home', 'Home')}
                </span>
              </Link>
            </div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-6"
            >
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {t('auth.register.title', 'Create Account')}
              </h1>
              <p className="text-gray-600">
                {t('auth.register.subtitle', 'Join thousands of happy travelers')}
              </p>
            </motion.div>

            {/* Social Login */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mb-5"
            >
              <SocialLoginButtons
                onGoogleSuccess={handleGoogleSuccess}
                onFacebookSuccess={handleFacebookSuccess}
                isLoading={isLoading}
                mode="register"
              />
            </motion.div>

            {/* Divider */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="relative my-5"
            >
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">
                  {t('auth.or', 'or register with email')}
                </span>
              </div>
            </motion.div>

            {/* Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}

              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.fullName', 'Full Name')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                    placeholder={t('auth.fullNamePlaceholder', 'Enter your full name')}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.email', 'Email Address')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                    placeholder={t('auth.emailPlaceholder', 'Enter your email')}
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.phone', 'Phone Number')}
                </label>
                <div className="flex gap-3">
                  <div className="w-28">
                    <ReactCountryDropdown
                      defaultCountry="SA"
                      onSelect={(country) => {
                        setFormData({
                          ...formData,
                          phoneCountryCode: `+${country.callingCodes[0]}`
                        });
                      }}
                    />
                  </div>
                  <div className="flex-1 relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <PhoneIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                    </div>
                    <input
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                      placeholder="123456789"
                    />
                  </div>
                </div>
              </div>

              {/* Nationality Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.nationality', 'Nationality')}
                </label>
                <ReactCountryDropdown
                  defaultCountry="SA"
                  onSelect={(country) => {
                    setFormData({
                      ...formData,
                      nationality: country.citizen
                    });
                  }}
                />
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.password', 'Password')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                    placeholder={t('auth.passwordPlaceholder', 'Create a password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                          className={`h-full ${getStrengthColor(passwordStrength.score)} transition-all`}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-500' :
                        passwordStrength.score <= 3 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {getStrengthText(passwordStrength.score)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      {Object.entries(passwordStrength.requirements).map(([key, met]) => (
                        <div key={key} className={`flex items-center gap-1 ${met ? 'text-green-600' : 'text-gray-400'}`}>
                          {met ? <CheckCircleIcon className="h-3.5 w-3.5" /> : <XCircleIcon className="h-3.5 w-3.5" />}
                          <span>
                            {key === 'minLength' && '8+ characters'}
                            {key === 'hasUppercase' && 'Uppercase'}
                            {key === 'hasLowercase' && 'Lowercase'}
                            {key === 'hasNumber' && 'Number'}
                            {key === 'hasSpecial' && 'Special char'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('auth.confirmPassword', 'Confirm Password')}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-orange-500 transition-colors" />
                  </div>
                  <input
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 transition-all"
                    placeholder={t('auth.confirmPasswordPlaceholder', 'Confirm your password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                  >
                    {showConfirmPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-orange-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Terms Checkbox */}
              <div className="flex items-start gap-3">
                <input
                  name="agreeToTerms"
                  type="checkbox"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-orange-500 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-600">
                  {t('auth.agreeToTerms', 'I agree to the')}{' '}
                  <Link to="/terms" className="text-orange-600 hover:text-orange-500 font-medium">
                    {t('auth.termsOfService', 'Terms of Service')}
                  </Link>{' '}
                  {t('auth.and', 'and')}{' '}
                  <Link to="/privacy" className="text-orange-600 hover:text-orange-500 font-medium">
                    {t('auth.privacyPolicy', 'Privacy Policy')}
                  </Link>
                </label>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.99 }}
                className="w-full flex justify-center items-center py-3.5 px-6 rounded-xl text-base font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>{t('common.loading', 'Creating account...')}</span>
                  </div>
                ) : (
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-2`}>
                    <span>{t('auth.register.button', 'Create Account')}</span>
                    <ArrowRightIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </motion.button>
            </motion.form>

            {/* Login Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-6 text-center"
            >
              <p className="text-gray-600">
                {t('auth.haveAccount', 'Already have an account?')}{' '}
                <Link to="/login" className="font-semibold text-orange-600 hover:text-orange-500 transition-colors">
                  {t('auth.login.title', 'Sign In')}
                </Link>
              </p>
            </motion.div>

            {/* Security Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500"
            >
              <div className="flex items-center gap-2">
                <ShieldCheckIcon className="h-5 w-5 text-green-500" />
                <span>Secure</span>
              </div>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-amber-500" />
                <span>Premium</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
