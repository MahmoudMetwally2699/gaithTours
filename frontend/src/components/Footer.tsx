import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  PhoneIcon,
  AtSymbolIcon,
  HeartIcon
} from '@heroicons/react/24/outline';
import {
  FaFacebook,
  FaInstagram,
  FaTwitter,
  FaWhatsapp,
  FaLinkedin,
  FaYoutube
} from 'react-icons/fa';

export const Footer: React.FC = () => {
  const { t } = useTranslation();  const socialLinks: Array<{
    name: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    hoverColor: string;
  }> = [
    {
      name: 'Facebook',
      href: '#',
      icon: FaFacebook as React.ComponentType<{ className?: string }>,
      color: 'from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    {
      name: 'Instagram',
      href: '#',
      icon: FaInstagram as React.ComponentType<{ className?: string }>,
      color: 'from-pink-500 to-purple-600',
      hoverColor: 'hover:from-pink-600 hover:to-purple-700'
    },
    {
      name: 'Twitter',
      href: '#',
      icon: FaTwitter as React.ComponentType<{ className?: string }>,
      color: 'from-cyan-400 to-blue-500',
      hoverColor: 'hover:from-cyan-500 hover:to-blue-600'
    },
    {
      name: 'WhatsApp',
      href: '#',
      icon: FaWhatsapp as React.ComponentType<{ className?: string }>,
      color: 'from-green-500 to-green-600',
      hoverColor: 'hover:from-green-600 hover:to-green-700'
    },
    {
      name: 'LinkedIn',
      href: '#',
      icon: FaLinkedin as React.ComponentType<{ className?: string }>,
      color: 'from-blue-600 to-blue-700',
      hoverColor: 'hover:from-blue-700 hover:to-blue-800'
    },
    {
      name: 'YouTube',
      href: '#',
      icon: FaYoutube as React.ComponentType<{ className?: string }>,
      color: 'from-red-500 to-red-600',
      hoverColor: 'hover:from-red-600 hover:to-red-700'    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6
      }
    }
  };  return (
    <footer className="relative overflow-hidden" style={{backgroundColor: '#2BD9EC'}}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-white/5"></div>

        {/* Floating elements */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
            opacity: [0.3, 0.6, 0.3]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-10 left-10 w-32 h-32 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [360, 180, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
          className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{
            x: [-100, 100, -100],
            y: [-50, 50, -50],
            opacity: [0.1, 0.3, 0.1]
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 w-60 h-60 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-full blur-2xl"
        />
      </div>

      <div className="relative">
        {/* Main Footer Content */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Company Info - Enhanced */}
            <motion.div
              variants={itemVariants}
              className="space-y-6"
            >              {/* Logo Section - Enhanced with actual logo and RTL support */}
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="relative">                  {/* Modern logo container with actual logo image */}
                  <div className="w-16 h-16 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 rounded-2xl flex items-center justify-center shadow-2xl border-2 border-white/20 overflow-hidden">
                    {/* Logo image with styling */}
                    <img
                      src="/logo-no-background.png"
                      alt="Gaith Tours Logo"
                      className="w-12 h-12 object-contain drop-shadow-lg z-10"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-600/20 to-yellow-600/20 rounded-2xl animate-pulse"></div>
                  </div>

                  {/* Enhanced sparkle effects */}
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
                    className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full shadow-lg shadow-yellow-400/50"
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
                    className="absolute -bottom-1 -left-1 w-2 h-2 bg-orange-400 rounded-full shadow-lg shadow-orange-400/50"
                  ></motion.div>
                </div>                <div className="mr-6">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 bg-clip-text text-transparent tracking-wide" style={{ fontFamily: 'TIDO, serif' }}>
                    {t('brand.name', 'Gaith Tours')}
                  </h2>
                  <p className="text-orange-300 text-sm font-medium mt-1">Premium Travel Experience</p>
                </div>
              </div>

              <p className="text-gray-300 leading-relaxed">
                {t('footer.description', 'Discover the world with our premium travel services. We create unforgettable experiences that connect cultures and create lasting memories.')}
              </p>

              {/* Social Links - Premium Design */}
              <div className="space-y-4">
                <h4 className="text-white font-semibold text-lg">Follow Our Journey</h4>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((social, index) => {
                    const IconComponent = social.icon;
                    return (
                      <motion.a
                        key={social.name}
                        href={social.href}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{
                          duration: 0.3,
                          delay: index * 0.1
                        }}
                        className={`w-12 h-12 bg-gradient-to-r ${social.color} ${social.hoverColor} rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 group`}
                        aria-label={social.name}
                      >
                        <IconComponent className="h-5 w-5 text-white group-hover:scale-110 transition-transform duration-200" />
                      </motion.a>
                    );
                  })}
                </div>
              </div>            </motion.div>            {/* Contact Info - Horizontal Layout */}
            <motion.div
              variants={itemVariants}
              className="space-y-4"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-8 bg-gradient-to-b from-green-400 to-emerald-400 rounded-full"></div>
                <h3 className="text-xl font-bold text-white">{t('footer.contact')}</h3>
              </div>              {/* Contact Items - Minimal Gap Display */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-3"
              >                <div className="group flex items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 shrink-0">
                    <MapPinIcon className="h-4 w-4 text-white" />
                  </div>                  <p className="text-white font-medium text-sm mr-3" dir="rtl">
                    {t('footer.location', 'الرياض، المملكة العربية السعودية')}
                  </p>
                </div>                <div className="group flex items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 shrink-0">
                    <PhoneIcon className="h-4 w-4 text-white" />
                  </div>                  <p className="text-white font-medium text-sm font-mono mr-3" dir="ltr">
                    {t('footer.phoneNumber', '٩٦٦+ ١٢٣ ٤٥٦ ٧٨٩')}
                  </p>
                </div>                <div className="group flex items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-300">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 shrink-0">
                    <AtSymbolIcon className="h-4 w-4 text-white" />
                  </div>
                  <p className="text-white font-medium text-sm font-mono mr-3" dir="ltr">
                    {t('footer.emailAddress', 'info@gaithtours.com')}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          </div>        </motion.div>

        {/* Bottom Section - Enhanced */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="border-t border-gray-700/50 pt-8"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-2 text-gray-400">
                <HeartIcon className="h-5 w-5 text-red-400" />
                <span className="text-sm">
                  {t('footer.madeWith', 'Made with love in Saudi Arabia')}
                </span>
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  © 2024 {t('brand.name', 'Gaith Tours')}. {t('footer.allRightsReserved', 'All rights reserved.')}
                </p>
              </div>

              <div className="flex items-center space-x-6">
                <Link to="/privacy" className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-300 relative group">
                  {t('footer.privacy', 'Privacy Policy')}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link to="/terms" className="text-gray-400 hover:text-orange-400 text-sm transition-colors duration-300 relative group">
                  {t('footer.terms', 'Terms of Service')}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-400 group-hover:w-full transition-all duration-300"></span>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};
