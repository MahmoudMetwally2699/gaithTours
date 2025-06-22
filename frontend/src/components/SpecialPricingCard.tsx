import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useDirection } from '../hooks/useDirection';

export const SpecialPricingCard: React.FC = () => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();

  const scrollToHotelSearch = () => {
    const hotelSearchSection = document.getElementById('hotel-search-section');
    if (hotelSearchSection) {
      hotelSearchSection.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };
  return (
    <section className="py-8 lg:py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 border-[3px] border-blue-500 rounded-xl shadow-xl overflow-hidden"
        >
          <div className="flex flex-col lg:flex-row items-center lg:items-stretch min-h-[200px] lg:min-h-[280px]">
            {/* Image Section (Left Side) */}
            <div className="flex-shrink-0 flex items-center justify-center p-4 lg:p-8 lg:w-2/5">
              <div className="relative">
                <motion.div
                  className="absolute inset-0 bg-blue-200 rounded-full opacity-20 blur-2xl"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />                <motion.img
                  src="/order-section/key-room 1.png"
                  alt="Special Pricing"
                  className="relative z-10 w-24 h-24 lg:w-48 lg:h-48 xl:w-56 xl:h-56 object-contain transform -rotate-12 hover:rotate-0 transition-all duration-500 drop-shadow-lg"
                  whileHover={{ scale: 1.08, rotate: 0 }}
                  initial={{ rotate: -12 }}
                />
              </div>
            </div>            {/* Text and Button Section (Right Side) */}            <div className="flex-1 p-6 lg:p-8 lg:py-10 lg:w-3/5">
              <div className="h-full flex flex-col justify-center lg:justify-start lg:pt-4">{/* Main Heading */}                <motion.div
                  className="mb-4 lg:mb-6"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h2 className={`text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 leading-tight mb-2 text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'}`}>
                    {t('specialPricing.title')}
                  </h2>
                  <h3 className={`text-2xl lg:text-3xl xl:text-4xl font-bold text-blue-600 leading-tight text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'}`}>
                    {t('specialPricing.subtitle')}
                  </h3></motion.div>                {/* Sub-text */}                <motion.div
                  className="mb-6 lg:mb-8 flex justify-center"
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <p
                    className="text-base lg:text-lg xl:text-xl text-gray-700 font-medium"
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    {t('specialPricing.description')}
                  </p>
                </motion.div>{/* Call to Action Button */}
                <motion.div
                  className={`text-center ${isRTL ? 'lg:text-right' : 'lg:text-left'}`}
                  initial={{ x: 30, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.6 }}
                >                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={scrollToHotelSearch}
                    className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold text-base lg:text-lg px-8 lg:px-10 py-3 lg:py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 min-w-[180px] lg:min-w-[220px] border-2 border-orange-400 hover:border-orange-500"
                  >
                    {t('specialPricing.requestNow')}
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
