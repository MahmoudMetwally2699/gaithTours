import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  LanguageIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  HomeIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

export const Navbar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isRTL } = useDirection();
  const history = useHistory();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleLogout = () => {
    logout();
    history.push('/');
    setIsProfileMenuOpen(false);
  };

  const navigationItems = [
    {
      name: t('nav.home'),
      href: '/',
      icon: HomeIcon,
    },

  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white/50 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-20">
          {/* Logo Section */}
          <motion.div
            className="flex-shrink-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link to="/" className="flex items-center">
              <img
                src="/Group.svg"
                alt="Gaith Tours Logo"
                className="h-12 w-auto object-contain"
              />
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className={`hidden md:flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-8`}>
            {navigationItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="group flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors duration-200"
                >
                  <span className="font-medium text-base">{item.name}</span>
                </Link>
              );
            })}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="group flex items-center space-x-1 text-gray-600 hover:text-orange-600 transition-colors duration-200"
            >
              <LanguageIcon className="h-5 w-5" />
              <span className="font-medium text-sm">
                {i18n.language === 'en' ? 'العربية' : 'English'}
              </span>
            </button>



            {/* User Menu / Auth Buttons */}
            {user ? (
              <div className={`relative ${isRTL ? 'mr-4' : 'ml-4'}`}>
                <div className="flex items-center bg-gray-50 rounded-full border border-gray-200 hover:border-orange-200 transition-colors">
                  <Link
                    to="/profile"
                    className={`flex items-center gap-2 pl-1 pr-3 py-1 hover:bg-orange-50 ${isRTL ? 'rounded-r-full' : 'rounded-l-full'} transition-all duration-200 group`}
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
                      <UserIcon className="h-5 w-5" />
                    </div>
                    <span className="text-gray-700 font-medium max-w-[100px] truncate group-hover:text-orange-700">{user.name}</span>
                  </Link>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <button
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className={`px-2 py-2.5 hover:bg-orange-50 ${isRTL ? 'rounded-l-full' : 'rounded-r-full'} transition-colors`}
                  >
                    <ChevronDownIcon className={`h-4 w-4 text-gray-400 hover:text-orange-500 transition-transform duration-200 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>

                {/* @ts-ignore */}
                <AnimatePresence>
                  {isProfileMenuOpen ? (
                    <motion.div
                      key="profile-menu"
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-1 z-50`}
                    >
                      <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>

                      <div className="p-1">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-xl transition-colors"
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <UserIcon className="h-4 w-4 mr-3" />
                          {t('nav.profile')}
                        </Link>

                        {user.role === 'admin' && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 rounded-xl transition-colors"
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <SparklesIcon className="h-4 w-4 mr-3" />
                            Admin Dashboard
                          </Link>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        >
                          <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
                          {t('nav.logout')}
                        </button>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            ) : (
              <div className={`flex items-center space-x-4 ${isRTL ? 'space-x-reverse mr-4' : 'ml-4'}`}>
                <Link
                  to="/login"
                  className="text-gray-600 hover:text-orange-600 font-medium transition-colors duration-200"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/40 transition-all duration-200 transform hover:-translate-y-0.5"
                >
                  {t('nav.register')}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-xl bg-gray-50 text-gray-600 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {/* @ts-ignore */}
      <AnimatePresence>
        {isMenuOpen ? (
          <motion.div
            key="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white/95 backdrop-blur-xl border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              ))}

              <button
                onClick={toggleLanguage}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors"
              >
                <LanguageIcon className="h-5 w-5" />
                <span className="font-medium">
                  {i18n.language === 'en' ? 'العربية' : 'English'}
                </span>
              </button>

              <div className="border-t border-gray-100 my-2 pt-2">
                {user ? (
                  <>
                    <div className="px-4 py-2 mb-2">
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <UserIcon className="h-5 w-5" />
                      <span className="font-medium">{t('nav.profile')}</span>
                    </Link>
                    {user.role === 'admin' && (
                      <Link
                        to="/admin/dashboard"
                        className="flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-orange-50 text-gray-600 hover:text-orange-600 transition-colors"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <SparklesIcon className="h-5 w-5" />
                        <span className="font-medium">Admin Dashboard</span>
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5" />
                      <span className="font-medium">{t('nav.logout')}</span>
                    </button>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-3 px-4 mt-4">
                    <Link
                      to="/login"
                      className="flex justify-center items-center px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('nav.login')}
                    </Link>
                    <Link
                      to="/register"
                      className="flex justify-center items-center px-4 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 shadow-lg shadow-orange-500/30 transition-all"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {t('nav.register')}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

    </motion.nav>
  );
};
