import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  BuildingOffice2Icon,
  MapIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  TruckIcon,
  CameraIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const services = [
  {
    id: 1,
    icon: BuildingOffice2Icon,
    titleKey: 'services.accommodation.title',
    descriptionKey: 'services.accommodation.description',
    features: [
      'services.accommodation.feature1',
      'services.accommodation.feature2',
      'services.accommodation.feature3'
    ],
    gradient: 'from-blue-500 to-purple-600',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-500'
  },
  {
    id: 2,
    icon: MapIcon,
    titleKey: 'services.tours.title',
    descriptionKey: 'services.tours.description',
    features: [
      'services.tours.feature1',
      'services.tours.feature2',
      'services.tours.feature3'
    ],
    gradient: 'from-green-500 to-teal-600',
    bgColor: 'bg-green-50',
    iconBg: 'bg-green-500'
  },
  {
    id: 3,
    icon: CalendarDaysIcon,
    titleKey: 'services.planning.title',
    descriptionKey: 'services.planning.description',
    features: [
      'services.planning.feature1',
      'services.planning.feature2',
      'services.planning.feature3'
    ],
    gradient: 'from-orange-500 to-red-600',
    bgColor: 'bg-orange-50',
    iconBg: 'bg-orange-500'
  },
  {
    id: 4,
    icon: TruckIcon,
    titleKey: 'services.transport.title',
    descriptionKey: 'services.transport.description',
    features: [
      'services.transport.feature1',
      'services.transport.feature2',
      'services.transport.feature3'
    ],
    gradient: 'from-indigo-500 to-blue-600',
    bgColor: 'bg-indigo-50',
    iconBg: 'bg-indigo-500'
  },
  {
    id: 5,
    icon: UserGroupIcon,
    titleKey: 'services.guides.title',
    descriptionKey: 'services.guides.description',
    features: [
      'services.guides.feature1',
      'services.guides.feature2',
      'services.guides.feature3'
    ],
    gradient: 'from-pink-500 to-rose-600',
    bgColor: 'bg-pink-50',
    iconBg: 'bg-pink-500'
  },
  {
    id: 6,
    icon: CameraIcon,
    titleKey: 'services.photography.title',
    descriptionKey: 'services.photography.description',
    features: [
      'services.photography.feature1',
      'services.photography.feature2',
      'services.photography.feature3'
    ],
    gradient: 'from-purple-500 to-violet-600',
    bgColor: 'bg-purple-50',
    iconBg: 'bg-purple-500'
  }
];

export const OurServicesSimple: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

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
    <section className="py-20 bg-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute inset-0 bg-gray-900 opacity-90"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
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
            className="inline-block text-primary-400 font-semibold text-lg mb-4 tracking-wide uppercase"
          >
            {t('services.sectionTitle')}
          </motion.span>          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight whitespace-nowrap text-center">
            {t('services.title')}
          </h2>

          <p className="text-xl text-gray-300 leading-relaxed">
            {t('services.description')}
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {services.map((service, index) => (
            <motion.div
              key={service.id}
              variants={itemVariants}
              whileHover={{ y: -10 }}
              className="group"
            >
              <div className="bg-gray-800 rounded-3xl p-8 h-full border border-gray-700 hover:border-gray-600 transition-all duration-300 relative overflow-hidden">
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>

                <div className="relative z-10">
                  {/* Icon */}
                  <div className={`w-16 h-16 ${service.iconBg} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <service.icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Content */}
                  <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-primary-400 transition-colors duration-300">
                    {t(service.titleKey)}
                  </h3>

                  <p className="text-gray-400 mb-6 leading-relaxed">
                    {t(service.descriptionKey)}
                  </p>

                  {/* Features List */}
                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-gray-300">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span className="text-sm">{t(feature)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Learn More Button */}
                  <div className="flex items-center text-primary-400 group-hover:text-primary-300 transition-colors duration-300 cursor-pointer">
                    <span className="font-semibold mr-2">{t('services.learnMore')}</span>
                    <ArrowRightIcon className={`w-4 h-4 transition-transform duration-300 group-hover:translate-x-1 ${isRTL ? 'rotate-180' : ''}`} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-20 text-center"
        >
          <div className="bg-gradient-to-r from-primary-600 to-blue-600 rounded-3xl p-12">
            <h3 className="text-3xl md:text-4xl font-bold text-white mb-6">
              {t('services.cta.title')}
            </h3>
            <p className="text-xl text-white opacity-90 mb-8 max-w-3xl mx-auto">
              {t('services.cta.description')}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-white text-primary-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition-colors duration-300 shadow-lg"
            >
              {t('services.cta.button')}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
