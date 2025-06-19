import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useDirection } from '../hooks/useDirection';

// Extended city data with cities from different countries
const cityData = [
  // Saudi Arabia
  { id: 'riyadh', arabicName: 'الرياض', englishName: 'Riyadh', country: 'Saudi Arabia', image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp' },
  { id: 'jeddah', arabicName: 'جدة', englishName: 'Jeddah', country: 'Saudi Arabia', image: '/hero/Jeddah Corniche.webp' },
  { id: 'alula', arabicName: 'العلا', englishName: 'AlUla', country: 'Saudi Arabia', image: '/hero/al-ul-old-town.jpeg' },
  { id: 'mecca', arabicName: 'مكة', englishName: 'Mecca', country: 'Saudi Arabia', image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp' },
  { id: 'medina', arabicName: 'المدينة', englishName: 'Medina', country: 'Saudi Arabia', image: '/hero/Riyadh-city-predictions_00_Adobe-Stock-1.jpg' },
  { id: 'dammam', arabicName: 'الدمام', englishName: 'Dammam', country: 'Saudi Arabia', image: '/hero/riyadh-1600x900.webp' },
  { id: 'abha', arabicName: 'أبها', englishName: 'Abha', country: 'Saudi Arabia', image: '/hero/10_Parks_river.jpg' },
  { id: 'taif', arabicName: 'الطائف', englishName: 'Taif', country: 'Saudi Arabia', image: '/hero/1034971-1524699631.jpg' },

  // UAE
  { id: 'dubai', arabicName: 'دبي', englishName: 'Dubai', country: 'UAE', image: '/hero/98.jpg' },
  { id: 'abudhabi', arabicName: 'أبو ظبي', englishName: 'Abu Dhabi', country: 'UAE', image: '/hero/2158333.jpg' },
  { id: 'sharjah', arabicName: 'الشارقة', englishName: 'Sharjah', country: 'UAE', image: '/hero/161652_7693.jpg' },
  { id: 'ajman', arabicName: 'عجمان', englishName: 'Ajman', country: 'UAE', image: '/hero/1deb1aec3cc3568b1ec867c18005532a.webp' },
  { id: 'rasalkhaimah', arabicName: 'رأس الخيمة', englishName: 'Ras Al Khaimah', country: 'UAE', image: '/hero/k7h4b0O.jpeg' },

  // Egypt
  { id: 'cairo', arabicName: 'القاهرة', englishName: 'Cairo', country: 'Egypt', image: '/hero/shutterstock_1882829362_LR.jpg' },
  { id: 'alexandria', arabicName: 'الإسكندرية', englishName: 'Alexandria', country: 'Egypt', image: '/hero/Things-To-Do-in-Jeddah.webp' },
  { id: 'luxor', arabicName: 'الأقصر', englishName: 'Luxor', country: 'Egypt', image: '/hero/Al-Taybat-International-City-Museum-building.jpg' },
  { id: 'aswan', arabicName: 'أسوان', englishName: 'Aswan', country: 'Egypt', image: '/hero/At-Turaif.webp' },
  { id: 'sharmelsheikh', arabicName: 'شرم الشيخ', englishName: 'Sharm El Sheikh', country: 'Egypt', image: '/hero/Djeddah.jpg' },
  { id: 'hurghada', arabicName: 'الغردقة', englishName: 'Hurghada', country: 'Egypt', image: '/hero/GettyImages-1226582429_8by10.avif' },

  // Kuwait
  { id: 'kuwait', arabicName: 'الكويت', englishName: 'Kuwait City', country: 'Kuwait', image: '/hero/jeddah-corniche-red-sea-saudi-arabia-p63d.avif' },
  { id: 'hawalli', arabicName: 'حولي', englishName: 'Hawalli', country: 'Kuwait', image: '/hero/salwa-palace-1024x768.jpg' },

  // Qatar
  { id: 'doha', arabicName: 'الدوحة', englishName: 'Doha', country: 'Qatar', image: '/hero/What-to-do-in-Jeddah-modern-things-to-see-Al-Rahma-Mosque.jpg' },
  { id: 'alrayyan', arabicName: 'الريان', englishName: 'Al Rayyan', country: 'Qatar', image: '/hero/Xe8JF2Zv-Riyadh-skyline2011-1200x800.jpg' },

  // Bahrain
  { id: 'manama', arabicName: 'المنامة', englishName: 'Manama', country: 'Bahrain', image: '/hero/230216140003-05-diriyah-gallery.jpg' },
  { id: 'muharraq', arabicName: 'المحرق', englishName: 'Muharraq', country: 'Bahrain', image: '/hero/1536x864_cmsv2_df295417-c41e-543d-a0ba-95a37a1efd16-9097266.webp' },

  // Oman
  { id: 'muscat', arabicName: 'مسقط', englishName: 'Muscat', country: 'Oman', image: '/hero/10_Parks_river.jpg' },
  { id: 'salalah', arabicName: 'صلالة', englishName: 'Salalah', country: 'Oman', image: '/hero/1034971-1524699631.jpg' },
  { id: 'nizwa', arabicName: 'نزوى', englishName: 'Nizwa', country: 'Oman', image: '/hero/98.jpg' },

  // Jordan
  { id: 'amman', arabicName: 'عمان', englishName: 'Amman', country: 'Jordan', image: '/hero/2158333.jpg' },
  { id: 'petra', arabicName: 'البتراء', englishName: 'Petra', country: 'Jordan', image: '/hero/161652_7693.jpg' },
  { id: 'aqaba', arabicName: 'العقبة', englishName: 'Aqaba', country: 'Jordan', image: '/hero/1deb1aec3cc3568b1ec867c18005532a.webp' },

  // Lebanon
  { id: 'beirut', arabicName: 'بيروت', englishName: 'Beirut', country: 'Lebanon', image: '/hero/k7h4b0O.jpeg' },
  { id: 'tripoli', arabicName: 'طرابلس', englishName: 'Tripoli', country: 'Lebanon', image: '/hero/shutterstock_1882829362_LR.jpg' },

  // Morocco
  { id: 'casablanca', arabicName: 'الدار البيضاء', englishName: 'Casablanca', country: 'Morocco', image: '/hero/Things-To-Do-in-Jeddah.webp' },
  { id: 'marrakech', arabicName: 'مراكش', englishName: 'Marrakech', country: 'Morocco', image: '/hero/Al-Taybat-International-City-Museum-building.jpg' },
  { id: 'rabat', arabicName: 'الرباط', englishName: 'Rabat', country: 'Morocco', image: '/hero/At-Turaif.webp' },
  { id: 'fez', arabicName: 'فاس', englishName: 'Fez', country: 'Morocco', image: '/hero/Djeddah.jpg' },

  // Tunisia
  { id: 'tunis', arabicName: 'تونس', englishName: 'Tunis', country: 'Tunisia', image: '/hero/GettyImages-1226582429_8by10.avif' },
  { id: 'sousse', arabicName: 'سوسة', englishName: 'Sousse', country: 'Tunisia', image: '/hero/jeddah-corniche-red-sea-saudi-arabia-p63d.avif' },

  // Turkey
  { id: 'istanbul', arabicName: 'إسطنبول', englishName: 'Istanbul', country: 'Turkey', image: '/hero/salwa-palace-1024x768.jpg' },
  { id: 'ankara', arabicName: 'أنقرة', englishName: 'Ankara', country: 'Turkey', image: '/hero/What-to-do-in-Jeddah-modern-things-to-see-Al-Rahma-Mosque.jpg' },
  { id: 'antalya', arabicName: 'أنطاليا', englishName: 'Antalya', country: 'Turkey', image: '/hero/Xe8JF2Zv-Riyadh-skyline2011-1200x800.jpg' },

  // Malaysia
  { id: 'kualalumpur', arabicName: 'كوالالمبور', englishName: 'Kuala Lumpur', country: 'Malaysia', image: '/hero/230216140003-05-diriyah-gallery.jpg' },
  { id: 'penang', arabicName: 'بينانغ', englishName: 'Penang', country: 'Malaysia', image: '/hero/1536x864_cmsv2_df295417-c41e-543d-a0ba-95a37a1efd16-9097266.webp' }
];

export const ExploreDestinations: React.FC = () => {
  const { i18n } = useTranslation();
  const { direction } = useDirection();
  const history = useHistory();  const isRTL = direction === 'rtl';
  const [currentIndex, setCurrentIndex] = useState(0);

  // Number of cards to show at once (responsive)
  const cardsPerView = 3; // Show 3 cards on both mobile and desktop
  const maxIndex = Math.max(0, cityData.length - cardsPerView);

  const handleCityClick = (city: typeof cityData[0]) => {
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
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(maxIndex, prev + 1));
  };

  const visibleCities = cityData.slice(currentIndex, currentIndex + cardsPerView);

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
              {isRTL ? 'استكشف وجهاتنا' : 'Explore Our Destinations'}
            </h2>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {isRTL ? 'المدن الأكثر شعبية للزيارة' : 'Discover popular cities to visit'}
            </p>
          </motion.div>
        </div>
      </div>

      {/* City Cards Content Area - Light Blue Background */}
      <div className="bg-cyan-50 py-12 sm:py-16 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-32 h-32 bg-blue-200 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-cyan-200 rounded-full blur-3xl"></div>
        </div>        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mobile Layout - 3 cards in a row */}
          <div className="block md:hidden">
            {/* City Cards for Mobile */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-3 gap-3 mb-6"
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
            </motion.div>

            {/* Navigation Arrows for Mobile */}
            <div className="flex items-center justify-center space-x-4">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={isRTL ? handleNext : handlePrevious}
                disabled={currentIndex === 0}
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
                onClick={isRTL ? handlePrevious : handleNext}
                disabled={currentIndex >= maxIndex}
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
          </div>

          {/* Desktop Layout - Inline */}
          <div className="hidden md:flex items-center justify-center">
            {/* Left Arrow */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={isRTL ? handleNext : handlePrevious}
              disabled={currentIndex === 0}
              className={`flex-shrink-0 w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRTL ? 'order-3 ml-4' : 'order-1 mr-4'}`}
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
              className={`flex-1 grid grid-cols-3 gap-8 max-w-4xl ${isRTL ? 'order-2' : 'order-2'}`}
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
            </motion.div>

            {/* Right Arrow */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={isRTL ? handlePrevious : handleNext}
              disabled={currentIndex >= maxIndex}
              className={`flex-shrink-0 w-12 h-12 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${isRTL ? 'order-1 mr-4' : 'order-3 ml-4'}`}
              aria-label={isRTL ? 'التالي' : 'Next'}
            >
              {isRTL ? (
                <ChevronLeftIcon className="w-6 h-6" />
              ) : (
                <ChevronRightIcon className="w-6 h-6" />
              )}
            </motion.button>
          </div>          {/* Carousel Indicators */}
          <div className="flex justify-center mt-8 space-x-2">
            {Array.from({ length: Math.ceil(cityData.length / cardsPerView) }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIndex(Math.min(i * cardsPerView, maxIndex))}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  Math.floor(currentIndex / cardsPerView) === i
                    ? 'bg-orange-500 scale-125'
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to page ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
