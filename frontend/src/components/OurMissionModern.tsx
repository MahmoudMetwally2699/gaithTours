import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  GlobeAltIcon,
  HeartIcon,
  StarIcon,
  UserGroupIcon,
  SparklesIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const missionFeatures = [
  {
    icon: GlobeAltIcon,
    titleKey: 'mission.discovery.title',
    descriptionKey: 'mission.discovery.description',
    gradient: 'from-cyan-500 to-blue-600',
    iconBg: 'from-cyan-400 to-blue-500',
    textColor: 'text-cyan-600'
  },
  {
    icon: HeartIcon,
    titleKey: 'mission.experiences.title',
    descriptionKey: 'mission.experiences.description',
    gradient: 'from-pink-500 to-rose-600',
    iconBg: 'from-pink-400 to-rose-500',
    textColor: 'text-pink-600'
  },
  {
    icon: StarIcon,
    titleKey: 'mission.excellence.title',
    descriptionKey: 'mission.excellence.description',
    gradient: 'from-amber-500 to-orange-600',
    iconBg: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-600'
  },
  {
    icon: UserGroupIcon,
    titleKey: 'mission.community.title',
    descriptionKey: 'mission.community.description',
    gradient: 'from-emerald-500 to-teal-600',
    iconBg: 'from-emerald-400 to-teal-500',
    textColor: 'text-emerald-600'
  }
];

export const OurMissionModern: React.FC = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: {
      y: 60,
      opacity: 0,
      scale: 0.8
    },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  const heroVariants = {
    hidden: {
      opacity: 0,
      y: 40,
      scale: 0.95
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 1,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };
  return (
    <section className="relative py-16 sm:py-24 lg:py-32 overflow-hidden">
      {/* Mobile: Unique Dynamic Background */}
      <div className="absolute inset-0 sm:hidden">
        {/* Mobile gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50"></div>

        {/* Mobile floating shapes */}
        <div className="absolute top-10 left-4 w-16 h-16 bg-gradient-to-br from-blue-400/30 to-cyan-400/30 rounded-2xl rotate-12 animate-pulse"></div>
        <div className="absolute top-32 right-6 w-12 h-12 bg-gradient-to-br from-purple-400/25 to-pink-400/25 rounded-full animate-bounce"></div>
        <div className="absolute bottom-20 left-8 w-10 h-10 bg-gradient-to-br from-emerald-400/30 to-teal-400/30 rounded-xl rotate-45 animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 right-4 w-14 h-14 bg-gradient-to-br from-amber-400/25 to-orange-400/25 rounded-2xl rotate-45 animate-pulse delay-500"></div>

        {/* Mobile wave patterns */}
        <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-transparent via-blue-200/10 to-transparent transform -skew-y-1"></div>
        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-r from-transparent via-purple-200/10 to-transparent transform skew-y-1"></div>
      </div>

      {/* Desktop: Original Background */}
      <div className="absolute inset-0 hidden sm:block">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50"></div>

        {/* Animated background elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-400/15 to-pink-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse delay-2000"></div>

        {/* Geometric patterns */}
        <div className="absolute top-20 right-20 w-32 h-32 border border-blue-200/30 rounded-full animate-spin-slow"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 border border-purple-200/30 rounded-square rotate-45 animate-pulse"></div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.5) 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        ></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8">
        {/* Mobile: Unique Header Design */}
        <div className="sm:hidden text-center mb-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500/15 to-purple-500/15 backdrop-blur-sm border border-blue-200/40 rounded-full mb-6"
          >
            <SparklesIcon className="w-4 h-4 text-blue-600 animate-pulse" />
            <span className="text-blue-700 font-bold text-xs tracking-widest uppercase">
              {t('mission.sectionTitle')}
            </span>
          </motion.div>

          {/* Mobile: Stacked title with unique typography */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-2"
          >
            <h2 className="text-3xl font-black text-gray-900 leading-none">
              Creating
            </h2>
            <h2 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent leading-none">
              Unforgettable
            </h2>
            <h2 className="text-3xl font-black text-gray-900 leading-none">
              Journeys
            </h2>
          </motion.div>

          {/* Mobile: Compact description */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-sm text-gray-600 leading-relaxed max-w-xs mx-auto mt-4"
          >
            Crafting extraordinary travel experiences that connect you with Saudi Arabia's magic
          </motion.p>
        </div>

        {/* Desktop: Original Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="hidden sm:block text-center max-w-5xl mx-auto mb-20"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 backdrop-blur-sm border border-blue-200/30 rounded-full mb-8"
          >
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            <span className="text-blue-700 font-semibold text-sm tracking-wide uppercase">
              {t('mission.sectionTitle')}
            </span>
          </motion.div>

          {/* Main Title */}
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight text-center"
          >
            <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent whitespace-nowrap">
              {t('mission.title')}
            </span>
          </motion.h2>          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto"
          >
            {t('mission.description')}
          </motion.p>
        </motion.div>

        {/* Mobile: Unique Card Stack Design for Mission Statement */}
        <div className="sm:hidden mb-12">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative"
          >
            {/* Background card with glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-purple-400/20 to-pink-400/20 rounded-2xl blur opacity-60"></div>

            <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-blue-100/50 shadow-xl">
              {/* Mobile floating icon */}
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <HeartIcon className="w-6 h-6 text-white" />
                </div>
              </div>

              <div className="pt-8 text-center">
                <h3 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
                  {t('mission.statement.title')}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {t('mission.statement.text')}
                </p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Desktop: Original Mission Statement Card */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="hidden sm:block mb-24"
        >
          <div className="relative group">
            {/* Card background with gradient border */}
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>

            <div className="relative bg-white/80 backdrop-blur-xl rounded-3xl p-8 lg:p-16 border border-white/20 shadow-2xl">
              {/* Floating icon */}
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl">
                  <HeartIcon className="w-8 h-8 text-white" />
                </div>
              </div>              <div className="text-center pt-8">                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  {t('mission.statement.title')}
                </h3>
                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  {t('mission.statement.text')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mobile: Unique Swipe-Style Features */}
        <div className="sm:hidden mb-12">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="space-y-4"
          >
            {missionFeatures.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ x: index % 2 === 0 ? -100 : 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 + index * 0.1 }}
                className="relative group"
              >
                {/* Background glow */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300`}></div>

                <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-gray-100/50 shadow-lg">
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 bg-gradient-to-r ${feature.iconBg} rounded-xl flex items-center justify-center shadow-md flex-shrink-0`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg font-bold text-gray-900 mb-2 leading-tight">
                        {t(feature.titleKey)}
                      </h4>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {t(feature.descriptionKey)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Desktop: Original Mission Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="hidden sm:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24"
        >
          {missionFeatures.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{
                y: -12,
                scale: 1.05,
                rotateY: 5
              }}
              className="group relative"
            >
              {/* Animated border */}
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${feature.gradient} rounded-2xl blur opacity-0 group-hover:opacity-30 transition duration-500`}></div>

              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-8 h-full border border-gray-100/50 shadow-lg group-hover:shadow-2xl transition-all duration-500">
                {/* Icon with floating effect */}
                <div className="relative mb-6">
                  <div className={`w-16 h-16 bg-gradient-to-r ${feature.iconBg} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-2xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Floating particles effect */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce"></div>
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-gradient-to-r from-pink-400 to-rose-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse delay-200"></div>
                </div>

                <div className="space-y-4">
                  <h4 className={`text-xl lg:text-2xl font-bold transition-colors duration-300 group-hover:${feature.textColor}`}>
                    {t(feature.titleKey)}
                  </h4>

                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
                    {t(feature.descriptionKey)}
                  </p>                  {/* Learn more indicator */}
                  <div className={`flex items-center gap-2 text-sm font-medium ${feature.textColor} opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0`}>
                    <span>Learn more</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile: Unique Vision Card */}
        <div className="sm:hidden">
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="relative"
          >
            {/* Mobile background with unique gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>

            <div className="relative p-6 text-white overflow-hidden rounded-2xl">
              {/* Mobile floating elements */}
              <div className="absolute top-4 right-4 w-8 h-8 border border-white/20 rounded-lg rotate-12 animate-pulse"></div>
              <div className="absolute bottom-4 left-4 w-6 h-6 bg-white/10 rounded-full animate-bounce"></div>

              <div className="relative z-10 text-center">
                <h3 className="text-2xl font-bold mb-4 leading-tight">
                  {t('mission.vision.title')}
                </h3>
                <p className="text-sm leading-relaxed opacity-95 mb-6">
                  {t('mission.vision.text')}
                </p>

                {/* Mobile CTA button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-300"
                >
                  {t('mission.vision.startJourney')}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Desktop: Original Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="hidden sm:block text-center"
        >
          <div className="relative group">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 rounded-3xl"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-3xl blur-xl"></div>            {/* Content */}
            <div className="relative rounded-3xl p-12 lg:p-20 text-white overflow-hidden">
              {/* Floating elements */}
              <div className="absolute top-10 right-10 w-20 h-20 border border-white/10 rounded-full animate-spin-slow"></div>
              <div className="absolute bottom-10 left-10 w-16 h-16 bg-white/5 rounded-2xl rotate-45 animate-pulse"></div>              <div className="relative z-10">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-8 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent leading-tight">
                  {t('mission.vision.title')}
                </h3>
                <p className="text-xl lg:text-2xl leading-relaxed max-w-5xl mx-auto text-gray-100">
                  {t('mission.vision.text')}
                </p>                {/* CTA Button */}
                <motion.button
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="mt-10 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl shadow-2xl hover:shadow-blue-500/25 transition-all duration-300"
                >
                  {t('mission.vision.startJourney')}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>      </div>

      {/* Custom CSS for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 20s linear infinite;
          }
          .rounded-square {
            border-radius: 20%;
          }
        `
      }} />
    </section>
  );
};
