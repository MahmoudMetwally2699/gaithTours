import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheckIcon,
  CurrencyDollarIcon,
  ClockIcon,
  UserGroupIcon,
  GlobeAltIcon,
  HeartIcon,
  StarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const features = [
  {
    icon: ShieldCheckIcon,
    titleKey: 'whyChooseUs.secure.title',
    descriptionKey: 'whyChooseUs.secure.description',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    icon: CurrencyDollarIcon,
    titleKey: 'whyChooseUs.bestPrice.title',
    descriptionKey: 'whyChooseUs.bestPrice.description',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    icon: ClockIcon,
    titleKey: 'whyChooseUs.support.title',
    descriptionKey: 'whyChooseUs.support.description',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    icon: UserGroupIcon,
    titleKey: 'whyChooseUs.expert.title',
    descriptionKey: 'whyChooseUs.expert.description',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  },
  {
    icon: GlobeAltIcon,
    titleKey: 'whyChooseUs.destinations.title',
    descriptionKey: 'whyChooseUs.destinations.description',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50'
  },
  {
    icon: HeartIcon,
    titleKey: 'whyChooseUs.personalized.title',
    descriptionKey: 'whyChooseUs.personalized.description',
    color: 'text-pink-600',
    bgColor: 'bg-pink-50'
  }
];

const stats = [
  {
    value: '10,000+',
    labelKey: 'whyChooseUs.stats.happyCustomers',
    icon: CheckCircleIcon
  },
  {
    value: '50+',
    labelKey: 'whyChooseUs.stats.destinations',
    icon: GlobeAltIcon
  },
  {
    value: '4.9/5',
    labelKey: 'whyChooseUs.stats.rating',
    icon: StarIcon
  },
  {
    value: '15+',
    labelKey: 'whyChooseUs.stats.experience',
    icon: HeartIcon
  }
];

export const WhyChooseUsModern: React.FC = () => {
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
    <section className="py-20 bg-gradient-to-br from-gray-50 via-white to-blue-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 opacity-10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div
          className="text-center mb-16"
        >
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full text-sm font-medium text-blue-800 mb-6">
            <StarIcon className="h-4 w-4 mr-2" />
            {t('whyChooseUs.sectionTitle')}
          </div>

          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t('whyChooseUs.title')}
          </h2>

          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('whyChooseUs.description')}
          </p>
        </div>

        {/* Features Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div
                key={index}
                className="group relative"
              >
                <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
                  {/* Icon */}
                  <div className={`w-16 h-16 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <IconComponent className={`h-8 w-8 ${feature.color}`} />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {t(feature.titleKey)}
                  </h3>

                  <p className="text-gray-600 leading-relaxed">
                    {t(feature.descriptionKey)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div
          className="bg-primary-600 rounded-3xl p-12 text-white mb-16"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => {
              const IconComponent = stat.icon;
              return (
                <div key={index} className="group">
                  <div className="flex justify-center mb-4">
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                  </div>

                  <div className="text-3xl font-bold mb-2">
                    {stat.value}
                  </div>

                  <div className="text-primary-100">
                    {t(stat.labelKey)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA Section */}
        <div
          className="text-center"
        >
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100">
            <h3 className="text-3xl font-bold text-gray-900 mb-6">
              {t('whyChooseUs.cta.title')}
            </h3>

            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              {t('whyChooseUs.cta.description')}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                className="px-8 py-4 bg-primary-600 text-white font-semibold rounded-xl shadow-lg hover:bg-primary-700 transition-colors duration-300"
              >
                {t('whyChooseUs.cta.primaryButton')}
              </button>

              <button
                className="px-8 py-4 bg-white text-gray-900 font-semibold rounded-xl border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all duration-300"
              >
                {t('whyChooseUs.cta.secondaryButton')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
