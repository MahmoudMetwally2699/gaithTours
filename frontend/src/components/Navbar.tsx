import React, { useState, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { motion } from 'framer-motion';
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
      setScrolled(window.scrollY > 50);
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
      gradient: 'from-orange-400 to-amber-400'
    },
    ...(user ? [{
      name: t('nav.hotels'),
      href: '/hotels',
      icon: BuildingOfficeIcon,
      gradient: 'from-amber-400 to-yellow-400'
    }] : []),
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl shadow-2xl border-b border-orange-100/50'
          : 'backdrop-blur-sm'      }`}
      style={{
        backgroundImage: 'linear-gradient(to bottom, #00d0f9, #4ce0e3, #8ceccb, #c4f4bd, #f6f9be)'
      }}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-yellow-500/10 opacity-0 hover:opacity-100 transition-opacity duration-500"></div>

      {/* Floating pattern overlay */}
      <div className="absolute inset-0 opacity-10"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
           }}></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">        <div className="flex justify-between items-center h-20">          {/* Logo Section - Enhanced with proper event isolation */}
          <motion.div
            className="relative z-50"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Link
              to="/"
              className="group relative block focus:outline-none focus:ring-4 focus:ring-orange-300/50 rounded-3xl"
              style={{ pointerEvents: 'auto' }}
            >
              <motion.div
                className="flex items-center relative z-10"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center">                  <div className="relative">
                    {/* Logo image container */}
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 3 }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                      className="w-24 h-24 flex items-center justify-center relative z-20"
                    >
                      {/* Logo image with styling */}
                      <motion.img
                        src="/Group.svg"
                        alt="Gaith Tours Logo"
                        className="w-20 h-20 object-contain relative z-30"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        draggable={false}
                      />
                    </motion.div>

                    {/* Enhanced sparkle effects - positioned outside interactive area */}
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 1, 0.5]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50 pointer-events-none"
                    ></motion.div>
                    <motion.div
                      animate={{
                        scale: [1, 1.3, 1],
                        opacity: [0.3, 0.8, 0.3]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 0.5
                      }}
                      className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50 pointer-events-none"
                    ></motion.div>
                    <motion.div
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.6, 0.3]
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: 1
                      }}
                      className="absolute bottom-2 -right-1 w-2 h-2 bg-amber-300 rounded-full shadow-lg shadow-amber-300/50 pointer-events-none"
                    ></motion.div>
                  </div>                  <div className={`${isRTL ? 'mr-4' : 'ml-4'} relative z-20`}>
                    <motion.h1
                      className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent group-hover:from-orange-700 group-hover:via-amber-700 group-hover:to-yellow-700 transition-all duration-300 select-none"
                      style={{ fontFamily: 'TIDO, serif' }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {t('brand.name', 'Gaith Tours')}
                    </motion.h1>
                    <p className="text-xs text-gray-600 font-medium opacity-80 group-hover:opacity-100 transition-opacity duration-300 select-none">
                      Premium Travel Experience
                    </p>
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>          {/* Desktop Navigation - Premium Design with proper RTL spacing */}
          <div className={`hidden md:flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-6 relative z-40`}>
            {navigationItems.map((item, index) => {
              const IconComponent = item.icon;
              return (
                <motion.div
                  key={item.name}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative z-40"
                >
                  <Link
                    to={item.href}
                    className={`group relative flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300/50`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <IconComponent className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                      {item.name}
                    </span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400/10 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </Link>
                </motion.div>
              );
            })}            {/* Language Toggle - Consistent Style with proper RTL isolation */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative z-40"
            >
              <button
                onClick={toggleLanguage}
                className={`group relative flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300/50`}
              >
                <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <LanguageIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-300">
                  {i18n.language === 'en' ? 'العربية' : 'English'}
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400/10 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
            </motion.div>{/* User Menu - Premium Design with proper isolation */}
            {user ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className="relative z-40"
              >                <motion.button
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`group relative flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300/50`}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                  <div className={`text-${isRTL ? 'right' : 'left'}`}>
                    <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors duration-300 truncate max-w-[120px]">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors duration-300">
                      {user.role === 'admin' ? 'Administrator' : 'Traveler'}
                    </p>
                  </div>
                  <ChevronDownIcon className={`h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-all duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-400/10 to-amber-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </motion.button>

                {/* Profile Dropdown with highest z-index */}
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute ${isRTL ? 'left-0' : 'right-0'} mt-3 w-64 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-orange-100/50 overflow-hidden z-50`}
                  >                    <div className="bg-gradient-to-r from-orange-400 to-amber-400 px-6 py-4">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <UserIcon className="h-6 w-6 text-white" />
                          </div>
                          <div className="truncate max-w-[160px]">
                            <p className="font-bold text-white text-lg truncate">{user.name}</p>
                            <p className="text-white/80 text-sm truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-2">
                        <Link
                          to="/profile"
                          className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 px-4 py-3 rounded-2xl hover:bg-orange-50 transition-all duration-200 group`}
                          onClick={() => setIsProfileMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-200">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-gray-700 font-medium group-hover:text-gray-900">{t('nav.profile')}</span>
                        </Link>

                        {user.role === 'admin' && (
                          <Link
                            to="/admin/dashboard"
                            className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 px-4 py-3 rounded-2xl hover:bg-purple-50 transition-all duration-200 group`}
                            onClick={() => setIsProfileMenuOpen(false)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-400 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-200">
                              <SparklesIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-gray-700 font-medium group-hover:text-gray-900">Admin Dashboard</span>
                          </Link>
                        )}

                        <div className="border-t border-gray-100 my-2"></div>

                        <button
                          onClick={handleLogout}
                          className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 px-4 py-3 rounded-2xl hover:bg-red-50 transition-all duration-200 group w-full`}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-400 rounded-xl flex items-center justify-center group-hover:shadow-lg transition-shadow duration-200">
                            <ArrowRightOnRectangleIcon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-gray-700 font-medium group-hover:text-red-600">{t('nav.logout')}</span>                        </button>
                      </div>
                    </motion.div>
                  )}              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
                className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative z-50"
                >
                  <Link
                    to="/login"
                    className={`group relative flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300/50`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <UserIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                      {t('nav.login')}
                    </span>
                  </Link>
                </motion.div>                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="relative z-50"
                >
                  <Link
                    to="/register"
                    className={`group relative flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 border border-orange-300 transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-300/50`}
                  >
                    <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <UserIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-white font-semibold transition-colors duration-300">
                      {t('nav.register')}
                    </span>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </div>          {/* Mobile menu button - Enhanced with proper isolation */}
          <div className="md:hidden flex items-center relative z-40">
            <motion.button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-orange-300/50"
            >
              <motion.div
                animate={{ rotate: isMenuOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {isMenuOpen ? (
                  <XMarkIcon className="h-6 w-6 text-white" />
                ) : (
                  <Bars3Icon className="h-6 w-6 text-white" />
                )}
              </motion.div>

              <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </motion.button>
          </div>
        </div>        {/* Mobile Navigation - Stunning Design */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
          >
              <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl m-4 p-6 shadow-2xl border border-orange-100/50">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 via-amber-50/50 to-yellow-50/50 rounded-3xl"></div>

                <div className="relative space-y-3">
                  {navigationItems.map((item, index) => {
                    const IconComponent = item.icon;
                    return (
                      <motion.div
                        key={item.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >                        <Link
                          to={item.href}
                          className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <IconComponent className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                            {item.name}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}                  <div className="border-t border-gray-200 my-4"></div>

                  {/* Language Toggle Mobile */}
                  <motion.button
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    onClick={toggleLanguage}
                    className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg w-full`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <LanguageIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                      {i18n.language === 'en' ? 'العربية' : 'English'}
                    </span>
                  </motion.button>

                  {user ? (
                    <>                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Link
                          to="/profile"
                          className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <div>
                            <p className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                              {t('nav.profile')}
                            </p>
                            <p className="text-sm text-gray-500">{user.name}</p>
                          </div>
                        </Link>
                      </motion.div>                      {user.role === 'admin' && (
                        <motion.div
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <Link
                            to="/admin/dashboard"
                            className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg`}
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                              <SparklesIcon className="h-4 w-4 text-white" />
                            </div>
                            <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                              Admin Dashboard
                            </span>
                          </Link>
                        </motion.div>
                      )}<motion.button
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 }}
                        onClick={handleLogout}
                        className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 border border-red-200/50 hover:border-red-300/50 transition-all duration-300 shadow-md hover:shadow-lg w-full`}
                      >
                        <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                          <ArrowRightOnRectangleIcon className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-700 font-semibold group-hover:text-red-600 transition-colors duration-300">
                          {t('nav.logout')}
                        </span>
                      </motion.button>
                    </>                  ) : (
                    <>
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                      >
                        <Link
                          to="/login"
                          className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 border border-orange-200/50 hover:border-orange-300/70 transition-all duration-300 shadow-md hover:shadow-lg`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-gray-700 font-semibold group-hover:text-gray-900 transition-colors duration-300">
                            {t('nav.login')}
                          </span>
                        </Link>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                      >
                        <Link
                          to="/register"
                          className={`group flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 p-4 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 border border-orange-300 transition-all duration-300 shadow-md hover:shadow-lg relative`}
                          onClick={() => setIsMenuOpen(false)}
                        >
                          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300">
                            <UserIcon className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-white font-semibold transition-colors duration-300">
                            {t('nav.register')}
                          </span>
                          <div className="absolute inset-0 rounded-2xl bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        </Link>
                      </motion.div>
                    </>
                  )}
                </div>
              </div>            </motion.div>
          )}
      </div>
    </motion.nav>
  );
};
