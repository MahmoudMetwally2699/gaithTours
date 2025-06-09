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
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0">
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
        {/* Hero Section */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={heroVariants}
          className="text-center max-w-5xl mx-auto mb-20"
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
          </motion.div>          {/* Main Title */}          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold mb-8 leading-tight text-center"
          >
            <span className="bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent whitespace-nowrap">
              {t('mission.title')}
            </span>
          </motion.h2>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl lg:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto"
          >
            {t('mission.description')}
          </motion.p>
        </motion.div>

        {/* Mission Statement Card - Modern Design */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mb-24"
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
              </div>              <div className="text-center pt-8">
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-6 leading-tight">
                  {t('mission.statement.title')}
                </h3>
                <p className="text-lg lg:text-xl text-gray-700 leading-relaxed max-w-4xl mx-auto">
                  {t('mission.statement.text')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Mission Features - Modern Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-24"
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
                  </p>

                  {/* Learn more indicator */}
                  <div className={`flex items-center gap-2 text-sm font-medium ${feature.textColor} opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0`}>
                    <span>Learn more</span>
                    <ArrowRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Vision Section - Redesigned */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="text-center"
        >
          <div className="relative group">
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 rounded-3xl"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-3xl blur-xl"></div>

            {/* Content */}
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
