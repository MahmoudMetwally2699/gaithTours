import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  GlobeAltIcon,
  HeartIcon,
  StarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

const missionFeatures = [
  {
    icon: GlobeAltIcon,
    titleKey: 'mission.discovery.title',
    descriptionKey: 'mission.discovery.description'
  },
  {
    icon: HeartIcon,
    titleKey: 'mission.experiences.title',
    descriptionKey: 'mission.experiences.description'
  },
  {
    icon: StarIcon,
    titleKey: 'mission.excellence.title',
    descriptionKey: 'mission.excellence.description'
  },
  {
    icon: UserGroupIcon,
    titleKey: 'mission.community.title',
    descriptionKey: 'mission.community.description'
  }
];

export const OurMissionSimple: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-72 h-72 bg-primary-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute top-0 right-4 w-72 h-72 bg-blue-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-100 rounded-full mix-blend-multiply filter blur-xl opacity-70"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-block text-primary-600 font-semibold text-lg mb-4 tracking-wide uppercase"
          >
            {t('mission.sectionTitle')}
          </motion.span>

          <h2 className={`text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
            {t('mission.title')}
          </h2>

          <p className="text-xl text-gray-600 leading-relaxed">
            {t('mission.description')}
          </p>
        </motion.div>

        {/* Mission Statement Card */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="bg-white rounded-3xl shadow-xl p-8 md:p-12 mb-16 border border-gray-100 backdrop-blur-sm bg-opacity-90"
        >
          <div className="text-center">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
              {t('mission.statement.title')}
            </h3>
            <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto">
              {t('mission.statement.text')}
            </p>
          </div>
        </motion.div>

        {/* Mission Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {missionFeatures.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ y: -10, scale: 1.02 }}
              className="group"
            >
              <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 h-full">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>

                  <h4 className="text-xl font-bold text-gray-900 mb-4">
                    {t(feature.titleKey)}
                  </h4>

                  <p className="text-gray-600 leading-relaxed">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-3xl p-12 text-white">
            <h3 className="text-3xl md:text-4xl font-bold mb-6">
              {t('mission.vision.title')}
            </h3>
            <p className="text-xl leading-relaxed max-w-4xl mx-auto opacity-95">
              {t('mission.vision.text')}
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
