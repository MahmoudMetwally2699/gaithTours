import React, { useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  EyeIcon,
  EyeSlashIcon,
  EnvelopeIcon,
  LockClosedIcon,
  ArrowRightIcon,
  UsersIcon,
  ChartBarIcon,
  QrCodeIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';

export const PartnerLogin: React.FC = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const history = useHistory();
  const { isRTL } = useDirection();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      // Check if user is a partner and redirect accordingly
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        if (user.role === 'partner') {
          history.push('/partner/dashboard');
        } else {
          setError('This login is for partners only. Please use the main login page.');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    { icon: ChartBarIcon, title: 'Track Earnings', desc: 'View your commission in real-time' },
    { icon: UsersIcon, title: 'Monitor Referrals', desc: 'See how many customers used your code' },
    { icon: QrCodeIcon, title: 'Your QR Code', desc: 'Access your unique referral QR code' }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Partner Branding */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 overflow-hidden sticky top-0 h-screen"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-700/90 via-teal-600/80 to-cyan-500/70" />

          {/* Decorative Circles */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            transition={{ duration: 2, delay: 0.5 }}
            className="absolute -top-20 -left-20 w-96 h-96 rounded-full border-[40px] border-white/20"
          />
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.1 }}
            transition={{ duration: 2, delay: 0.8 }}
            className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full border-[60px] border-white/10"
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-white text-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
            className="mb-8"
          >
            <div className="w-32 h-32 flex items-center justify-center p-4 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20">
              <img src="/Group.svg" alt="Gaith Tours" className="w-full h-full object-contain" />
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-4xl font-bold mb-2"
          >
            Partner Portal
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-xl text-white/90 mb-8 max-w-md"
          >
            Grow your business with Gaith Tours
          </motion.p>

          {/* Features List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-4 w-full max-w-sm"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }}
                className="flex items-center gap-4 p-4 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10"
              >
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-sm text-white/70">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-emerald-50/30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_50%)]" />
        </div>

        {/* Form Container */}
        <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-6 sm:px-12 lg:px-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-md"
          >
            {/* Mobile Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="lg:hidden flex flex-col items-center mb-8"
            >
              <div className="w-24 h-24 flex items-center justify-center p-3 bg-emerald-100 rounded-2xl mb-4">
                <img src="/Group.svg" alt="Gaith Tours" className="w-full h-full object-contain" />
              </div>
              <span className="text-emerald-600 font-semibold text-lg">Partner Portal</span>
            </motion.div>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome Back, Partner 👋
              </h1>
              <p className="text-gray-600">
                Sign in to access your dashboard
              </p>
            </motion.div>

            {/* Login Form */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3"
                >
                  <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-gray-900"
                    placeholder="partner@example.com"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-300 text-gray-900"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      {showPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-emerald-500 transition-colors" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400 hover:text-emerald-500 transition-colors" />
                      )}
                    </motion.div>
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: isLoading ? 1 : 1.01 }}
                whileTap={{ scale: isLoading ? 1 : 0.99 }}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''} gap-2`}>
                    <span>Sign In</span>
                    <ArrowRightIcon className={`h-5 w-5 transform group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                )}
              </motion.button>
            </motion.form>

            {/* Customer Login Link */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 text-center"
            >
              <p className="text-gray-600">
                Not a partner?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  Customer Login
                </Link>
              </p>
            </motion.div>

            {/* Contact Admin */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center"
            >
              <p className="text-sm text-emerald-700">
                Need partner access? Contact our team at{' '}
                <a href="mailto:partners@gaithtours.com" className="font-semibold hover:underline">
                  partners@gaithtours.com
                </a>
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PartnerLogin;
