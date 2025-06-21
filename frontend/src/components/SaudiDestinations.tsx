import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useDirection } from '../hooks/useDirection';

// Saudi Arabia cities data
const saudiCityData = [
  { id: 'riyadh', arabicName: 'الرياض', englishName: 'Riyadh', image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp' },
  { id: 'jeddah', arabicName: 'جدة', englishName: 'Jeddah', image: '/hero/Jeddah Corniche.webp' },
  { id: 'alula', arabicName: 'العلا', englishName: 'AlUla', image: '/hero/al-ul-old-town.jpeg' },
  { id: 'mecca', arabicName: 'مكة المكرمة', englishName: 'Mecca', image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp' },
  { id: 'medina', arabicName: 'المدينة المنورة', englishName: 'Medina', image: '/hero/Riyadh-city-predictions_00_Adobe-Stock-1.jpg' },
  { id: 'dammam', arabicName: 'الدمام', englishName: 'Dammam', image: '/hero/riyadh-1600x900.webp' },
  { id: 'khobar', arabicName: 'الخبر', englishName: 'Al Khobar', image: '/hero/98.jpg' },
  { id: 'abha', arabicName: 'أبها', englishName: 'Abha', image: '/hero/10_Parks_river.jpg' },
  { id: 'taif', arabicName: 'الطائف', englishName: 'Taif', image: '/hero/1034971-1524699631.jpg' },
  { id: 'tabuk', arabicName: 'تبوك', englishName: 'Tabuk', image: '/hero/2158333.jpg' },
  { id: 'buraidah', arabicName: 'بريدة', englishName: 'Buraidah', image: '/hero/161652_7693.jpg' },
  { id: 'khamismushait', arabicName: 'خميس مشيط', englishName: 'Khamis Mushait', image: '/hero/1deb1aec3cc3568b1ec867c18005532a.webp' },
  { id: 'hail', arabicName: 'حائل', englishName: 'Hail', image: '/hero/k7h4b0O.jpeg' },
  { id: 'najran', arabicName: 'نجران', englishName: 'Najran', image: '/hero/shutterstock_1882829362_LR.jpg' },
  { id: 'jubail', arabicName: 'الجبيل', englishName: 'Jubail', image: '/hero/Things-To-Do-in-Jeddah.webp' }
];

export const SaudiDestinations: React.FC = () => {
  const { i18n } = useTranslation();
  const { direction } = useDirection();
  const history = useHistory();
  const isRTL = direction === 'rtl';
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Number of cards to show at once
  const cardsPerView = 2; // Show 2 cards on both mobile and desktop
  const maxIndex = Math.max(0, saudiCityData.length - cardsPerView);

  // Touch handlers for swipe functionality
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;

    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      if (isRTL) {
        handlePrevious();
      } else {
        handleNext();
      }
    }

    if (isRightSwipe) {
      if (isRTL) {
        handleNext();
      } else {
        handlePrevious();
      }
    }
  };

  const handleCityClick = (city: typeof saudiCityData[0]) => {
    // Navigate to hotel search results with the selected city
    const cityName = i18n.language === 'ar' ? city.arabicName : city.englishName;

    // Generate default dates (tomorrow for check-in, day after for check-out)
    const today = new Date();
    const checkIn = new Date(today);
    checkIn.setDate(today.getDate() + 1);
    const checkOut = new Date(today);
    checkOut.setDate(today.getDate() + 2);

    const searchParams = new URLSearchParams({
      destination: cityName,
      checkIn: checkIn.toISOString().split('T')[0],
      checkOut: checkOut.toISOString().split('T')[0],
      rooms: '1',
      adults: '2',
      children: '0'
    });

    // Navigate and scroll to top
    history.push(`/hotels/search?${searchParams.toString()}`);
    // Scroll to top after a short delay to ensure navigation completes
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handlePrevious = () => {
    if (isRTL) {
      setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
    } else {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    }
  };

  const handleNext = () => {
    if (isRTL) {
      setCurrentIndex(prev => Math.max(0, prev - 1));
    } else {
      setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
    }
  };

  const visibleCities = saudiCityData.slice(currentIndex, currentIndex + cardsPerView);

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
    <section className="relative">
      {/* Heading Area - White/Light Neutral Background */}
      <div className="bg-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            {/* Main Title */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
              {isRTL ? 'استكشف المملكة العربية السعودية' : 'Explore Saudi Arabia'}
            </h2>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {isRTL ? 'اكتشف أجمل المدن السعودية وتراثها العريق' : 'Discover the most beautiful Saudi cities and their rich heritage'}
            </p>
          </motion.div>
        </div>
      </div>      {/* City Cards Content Area - Same color as ExploreDestinations */}
      <div className="py-12 sm:py-16 relative overflow-hidden" style={{ backgroundColor: '#FDEDE4' }}>        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-32 h-32 bg-orange-200 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-amber-200 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">          {/* Mobile Layout - 2 cards in a row with swipe */}
          <div className="block md:hidden">
            {/* City Cards for Mobile */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-4 mb-6"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {visibleCities.map((city, index) => (
                <motion.div
                  key={city.id}
                  variants={itemVariants}
                  whileHover={{ y: -5, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCityClick(city)}
                  className="group cursor-pointer"
                >
                  <div className="text-center">
                    {/* City Image */}
                    <div className="relative mb-2 overflow-hidden rounded-2xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <img
                        src={city.image}
                        alt={i18n.language === 'ar' ? city.arabicName : city.englishName}
                        className="w-full h-32 object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to a gradient background if image fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-32 bg-gradient-to-br from-orange-400 to-amber-500 rounded-2xl flex items-center justify-center">
                                <span class="text-white text-xs font-bold text-center px-1">${i18n.language === 'ar' ? city.arabicName : city.englishName}</span>
                              </div>
                            `;
                          }
                        }}
                      />

                      {/* Overlay for better text visibility */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-2xl"></div>

                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>
                    </div>

                    {/* City Name */}
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 leading-tight">
                      {i18n.language === 'ar' ? city.arabicName : city.englishName}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </motion.div>            {/* Navigation Arrows for Mobile - Visible along with swipe gestures */}
            <div className={`flex items-center justify-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handlePrevious}
                disabled={isRTL ? currentIndex >= maxIndex : currentIndex === 0}
                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300"
                aria-label={isRTL ? 'السابق' : 'Previous'}
              >
                {isRTL ? (
                  <ChevronRightIcon className="w-5 h-5" />
                ) : (
                  <ChevronLeftIcon className="w-5 h-5" />
                )}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleNext}
                disabled={isRTL ? currentIndex === 0 : currentIndex >= maxIndex}
                className="w-10 h-10 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300"
                aria-label={isRTL ? 'التالي' : 'Next'}
              >
                {isRTL ? (
                  <ChevronLeftIcon className="w-5 h-5" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5" />
                )}
              </motion.button>
            </div>
          </div>          {/* Desktop Layout - Inline */}
          <div className="hidden md:flex items-center justify-center">            {/* Left Arrow */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrevious}
              disabled={isRTL ? currentIndex >= maxIndex : currentIndex === 0}
              className={`flex-shrink-0 w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRTL ? 'order-3' : 'order-1'} ${isRTL ? 'ms-4' : 'me-4'}`}
              aria-label={isRTL ? 'السابق' : 'Previous'}
            >
              {isRTL ? (
                <ChevronRightIcon className="w-6 h-6" />
              ) : (
                <ChevronLeftIcon className="w-6 h-6" />
              )}
            </motion.button>

            {/* City Cards Row */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={`flex-1 grid grid-cols-2 gap-8 max-w-3xl ${isRTL ? 'order-2' : 'order-2'}`}
            >
              {visibleCities.map((city, index) => (
                <motion.div
                  key={city.id}
                  variants={itemVariants}
                  whileHover={{ y: -10, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCityClick(city)}
                  className="group cursor-pointer"
                >
                  <div className="text-center">
                    {/* City Image */}
                    <div className="relative mb-4 overflow-hidden rounded-3xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                      <img
                        src={city.image}
                        alt={i18n.language === 'ar' ? city.arabicName : city.englishName}
                        className="w-full h-64 sm:h-72 object-cover rounded-3xl group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to a gradient background if image fails to load
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            parent.innerHTML = `
                              <div class="w-full h-64 sm:h-72 bg-gradient-to-br from-orange-400 to-amber-500 rounded-3xl flex items-center justify-center">
                                <span class="text-white text-xl font-bold">${i18n.language === 'ar' ? city.arabicName : city.englishName}</span>
                              </div>
                            `;
                          }
                        }}
                      />

                      {/* Overlay for better text visibility */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300 rounded-3xl"></div>

                      {/* Hover Effect Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl"></div>
                    </div>

                    {/* City Name */}
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 mt-4">
                      {i18n.language === 'ar' ? city.arabicName : city.englishName}
                    </h3>
                  </div>
                </motion.div>
              ))}
            </motion.div>            {/* Right Arrow */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              disabled={isRTL ? currentIndex === 0 : currentIndex >= maxIndex}
              className={`flex-shrink-0 w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRTL ? 'order-1' : 'order-3'} ${isRTL ? 'me-4' : 'ms-4'}`}
              aria-label={isRTL ? 'التالي' : 'Next'}
            >
              {isRTL ? (
                <ChevronLeftIcon className="w-6 h-6" />
              ) : (
                <ChevronRightIcon className="w-6 h-6" />
              )}
            </motion.button>
          </div>        </div>
      </div>
    </section>
  );
};
