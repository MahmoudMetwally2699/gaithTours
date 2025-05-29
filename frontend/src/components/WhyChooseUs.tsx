import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  GlobeAltIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: ShieldCheckIcon,
    titleKey: 'whyChooseUs.secure.title',
    descriptionKey: 'whyChooseUs.secure.description'
  },
  {
    icon: CurrencyDollarIcon,
    titleKey: 'whyChooseUs.bestPrice.title',
    descriptionKey: 'whyChooseUs.bestPrice.description'
  },
  {
    icon: ClockIcon,
    titleKey: 'whyChooseUs.support.title',
    descriptionKey: 'whyChooseUs.support.description'
  },
  {
    icon: UserGroupIcon,
    titleKey: 'whyChooseUs.expert.title',
    descriptionKey: 'whyChooseUs.expert.description'
  },
  {
    icon: GlobeAltIcon,
    titleKey: 'whyChooseUs.destinations.title',
    descriptionKey: 'whyChooseUs.destinations.description'
  },
  {
    icon: HeartIcon,
    titleKey: 'whyChooseUs.personalized.title',
    descriptionKey: 'whyChooseUs.personalized.description'
  }
];

export const WhyChooseUs: React.FC = () => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
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
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">        {/* Section Header */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('whyChooseUs.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('whyChooseUs.subtitle')}
          </p>
        </motion.div>        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 text-center"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <IconComponent className="h-8 w-8 text-primary-600" />
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {t(feature.titleKey)}
                </h3>

                <p className="text-gray-600 leading-relaxed">
                  {t(feature.descriptionKey)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>        {/* Stats Section */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 bg-primary-600 rounded-2xl p-8 text-white"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">10K+</div>
              <div className="text-primary-100">{t('stats.happyCustomers')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">50+</div>
              <div className="text-primary-100">{t('stats.destinations')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">15+</div>
              <div className="text-primary-100">{t('stats.yearsExperience')}</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">24/7</div>
              <div className="text-primary-100">{t('stats.support')}</div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
