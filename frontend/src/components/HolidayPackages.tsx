import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { StarIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const packages = [
  {
    id: 1,
    image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp',
    titleKey: 'packages.riyadh.title',
    descriptionKey: 'packages.riyadh.description',
    price: 899,
    duration: '4 Days',
    location: 'Riyadh, Saudi Arabia',
    rating: 4.8,
    featured: true
  },
  {
    id: 2,
    image: '/hero/Djeddah.jpg',
    titleKey: 'packages.jeddah.title',
    descriptionKey: 'packages.jeddah.description',
    price: 1099,
    duration: '5 Days',
    location: 'Jeddah, Saudi Arabia',
    rating: 4.9,
    featured: false
  },
  {
    id: 3,
    image: '/hero/al-ul-old-town.jpeg',
    titleKey: 'packages.alula.title',
    descriptionKey: 'packages.alula.description',
    price: 1299,
    duration: '3 Days',
    location: 'AlUla, Saudi Arabia',
    rating: 4.7,
    featured: true
  },
  {
    id: 4,
    image: '/hero/98.jpg',
    titleKey: 'packages.taif.title',
    descriptionKey: 'packages.taif.description',
    price: 799,
    duration: '3 Days',
    location: 'Taif, Saudi Arabia',
    rating: 4.6,
    featured: false
  },
  {
    id: 5,
    image: '/hero/shutterstock_1882829362_LR.jpg',
    titleKey: 'packages.abha.title',
    descriptionKey: 'packages.abha.description',
    price: 999,
    duration: '4 Days',
    location: 'Abha, Saudi Arabia',
    rating: 4.8,
    featured: false
  },
  {
    id: 6,
    image: '/hero/2158333.jpg',
    titleKey: 'packages.khobar.title',
    descriptionKey: 'packages.khobar.description',
    price: 699,
    duration: '3 Days',
    location: 'Khobar, Saudi Arabia',
    rating: 4.5,
    featured: false
  }
];

export const HolidayPackages: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';

  const handlePackageAction = (action: 'book' | 'details') => {
    if (isAuthenticated) {
      // For authenticated users, redirect to hotels page
      history.push('/hotels');
    } else {
      // For unauthenticated users, redirect to login with current location
      history.push('/login', { from: location });
    }
  };

  const handleViewAllPackages = () => {
    if (isAuthenticated) {
      // For authenticated users, redirect to hotels page
      history.push('/hotels');
    } else {
      // For unauthenticated users, redirect to login with current location
      history.push('/login', { from: location });
    }
  };

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
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">        {/* Section Header */}
        <div
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('packages.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('packages.subtitle')}
          </p>
        </div>

        {/* Packages Grid */}        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {/* Package Image */}
              <div className="relative h-48 overflow-hidden">
                <img
                  src={pkg.image}
                  alt={t(pkg.titleKey)}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
                {pkg.featured && (
                  <div className={`absolute top-4 ${isRTL ? 'left-4' : 'right-4'} bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-semibold`}>
                    {t('packages.featured')}
                  </div>
                )}
                <div className={`absolute top-4 ${isRTL ? 'right-4' : 'left-4'} bg-white bg-opacity-90 text-gray-900 px-3 py-1 rounded-full text-sm font-bold`}>
                  ${pkg.price}
                </div>
              </div>

              {/* Package Content */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {t(pkg.titleKey)}
                  </h3>
                  <div className="flex items-center">
                    <StarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-600 ml-1">{pkg.rating}</span>
                  </div>
                </div>

                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {t(pkg.descriptionKey)}
                </p>

                {/* Package Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2" />
                    {pkg.duration}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {pkg.location}
                  </div>
                </div>                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handlePackageAction('book')}
                    className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
                  >
                    {t('packages.bookPackage')}
                  </button>
                  <button
                    onClick={() => handlePackageAction('details')}
                    className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors duration-200"
                  >
                    {t('packages.viewDetails')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>        {/* View All Packages Button */}
        <div
          className="text-center mt-12"
        >
          <button
            onClick={handleViewAllPackages}
            className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {t('packages.viewAll')}
          </button>
        </div>
      </div>
    </section>
  );
};
