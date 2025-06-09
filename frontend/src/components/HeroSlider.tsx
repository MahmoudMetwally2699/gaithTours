import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

const slides = [
  {
    id: 1,
    image: '/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp',
    titleKey: 'hero.riyadh.title',
    subtitleKey: 'hero.riyadh.subtitle',
    location: 'Riyadh, Saudi Arabia'
  },
  {
    id: 2,
    image: '/hero/Djeddah.jpg',
    titleKey: 'hero.jeddah.title',
    subtitleKey: 'hero.jeddah.subtitle',
    location: 'Jeddah, Saudi Arabia'
  },
  {
    id: 3,
    image: '/hero/2158333.jpg',
    titleKey: 'hero.diriyah.title',
    subtitleKey: 'hero.diriyah.subtitle',
    location: 'Diriyah, Saudi Arabia'
  },
  {
    id: 4,
    image: '/hero/al-ul-old-town.jpeg',
    titleKey: 'hero.alula.title',
    subtitleKey: 'hero.alula.subtitle',
    location: 'AlUla, Saudi Arabia'
  },
  {
    id: 5,
    image: '/hero/98.jpg',
    titleKey: 'hero.heritage.title',
    subtitleKey: 'hero.heritage.subtitle',
    location: 'Saudi Arabia'
  }
];

export const HeroSlider: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const history = useHistory();
  const [currentSlide, setCurrentSlide] = useState(0);
  const isRTL = i18n.language === 'ar';

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };
  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const handleBookNow = () => {
    if (isAuthenticated) {
      history.push('/hotels');
    } else {
      history.push('/login');
    }
  };

  const handleExploreMore = () => {
    if (isAuthenticated) {
      history.push('/hotels');
    } else {
      history.push('/login');
    }
  };return (
    <div className="relative h-screen overflow-hidden">
      <motion.div
        key={currentSlide}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        className="absolute inset-0"
      >        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-40" />
        </div>
      </motion.div>      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">          <div className="flex items-center justify-center min-h-full">
            {/* Content */}
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-white text-center max-w-4xl mx-auto"
            >
              {/* Location Badge */}
              <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
                <span className="text-sm font-medium">{slides[currentSlide].location || t('hero.location')}</span>
              </div>              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight whitespace-nowrap">
                {t(slides[currentSlide].titleKey)}
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-8 opacity-90 leading-relaxed max-w-3xl mx-auto">
                {t(slides[currentSlide].subtitleKey)}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <motion.button
                  onClick={handleBookNow}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-primary-700 hover:to-primary-800 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  {t('hero.bookNow')}
                </motion.button>
                <motion.button
                  onClick={handleExploreMore}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-gray-900 transition-all duration-300 backdrop-blur-sm"
                >
                  {t('hero.exploreMore')}
                </motion.button>
              </div></motion.div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className={`absolute top-1/2 ${isRTL ? 'right-4' : 'left-4'} transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-300`}
      >
        {isRTL ? (
          <ChevronRightIcon className="h-6 w-6" />
        ) : (
          <ChevronLeftIcon className="h-6 w-6" />
        )}
      </button>
      <button
        onClick={nextSlide}
        className={`absolute top-1/2 ${isRTL ? 'left-4' : 'right-4'} transform -translate-y-1/2 z-20 bg-white bg-opacity-20 hover:bg-opacity-30 text-white p-3 rounded-full transition-all duration-300`}
      >
        {isRTL ? (
          <ChevronLeftIcon className="h-6 w-6" />
        ) : (
          <ChevronRightIcon className="h-6 w-6" />
        )}
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex space-x-3">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide
                  ? 'bg-white scale-125'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
