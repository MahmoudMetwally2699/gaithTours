import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { EyeIcon, EyeSlashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import ReactCountryDropdown from 'react-country-dropdown';

export const Register: React.FC = () => {  const { t } = useTranslation();
  const { register } = useAuth();
  const history = useHistory();  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    phoneCountryCode: '+966', // Default to Saudi Arabia
    nationality: '',
    agreeToTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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
      setError(t('auth.register.passwordMismatch'));
      return false;
    }
    if (formData.password.length < 6) {
      setError(t('auth.register.passwordLength'));
      return false;
    }
    if (!formData.agreeToTerms) {
      setError(t('auth.register.agreeTerms'));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    setError('');    try {
      // Combine country code with phone number
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
        history.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || t('auth.register.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="sm:mx-auto sm:w-full sm:max-w-md"
        >
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckIcon className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t('auth.register.success.title')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('auth.register.success.message')}
            </p>
            <p className="text-sm text-gray-500">
              {t('auth.register.success.redirect')}
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="sm:mx-auto sm:w-full sm:max-w-md"
      >
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-gray-600">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('auth.fullName')}
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.fullNamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.email')}
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.emailPlaceholder')}
                />
              </div>
            </div>            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                {t('auth.phone')}
              </label>
              <div className="mt-1 flex space-x-2">
                {/* Country Code Dropdown */}
                <div className="w-32">                  <ReactCountryDropdown
                    defaultCountry="SA"
                    onSelect={(country) => {
                      setFormData({
                        ...formData,
                        phoneCountryCode: `+${country.callingCodes[0]}`
                      });
                    }}
                  />
                </div>
                {/* Phone Number Input */}
                <div className="flex-1">
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    placeholder="123456789"
                  />
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                {t('validation.phoneHint', { example: formData.phoneCountryCode })}
              </p>
            </div>            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">
                {t('auth.nationality')}
              </label>
              <div className="mt-1">                <ReactCountryDropdown
                  defaultCountry="SA"
                  onSelect={(country) => {
                    setFormData({
                      ...formData,
                      nationality: country.citizen
                    });
                  }}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.passwordPlaceholder')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.confirmPassword')}
              </label>
              <div className="mt-1 relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                required
                checked={formData.agreeToTerms}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                {t('auth.agreeToTerms')}{' '}
                <Link to="/terms" className="text-primary-600 hover:text-primary-500">
                  {t('auth.termsOfService')}
                </Link>{' '}
                {t('auth.and')}{' '}
                <Link to="/privacy" className="text-primary-600 hover:text-primary-500">
                  {t('auth.privacyPolicy')}
                </Link>
              </label>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  t('auth.register.button')
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t('auth.or')}
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {t('auth.haveAccount')}{' '}
                <Link
                  to="/login"
                  className="font-medium text-primary-600 hover:text-primary-500"
                >
                  {t('auth.login.title')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
