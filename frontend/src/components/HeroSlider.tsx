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
  };  return (
    <div className="relative h-screen overflow-hidden">
      {/* Background Image with Enhanced Overlay */}
      <motion.div
        key={currentSlide}
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 1 }}
        className="absolute inset-0"
      >
        <div
          className="w-full h-full bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${slides[currentSlide].image})` }}
        >
          {/* Multi-layered gradient overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60" />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
            style={{
              background: `linear-gradient(to top, rgba(0,0,0,0.6), rgba(253, 202, 120, 0.1) 50%, rgba(255, 121, 2, 0.1))`
            }}
          />
        </div>

        {/* Animated gradient elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '100%', opacity: 0.3 }}
            transition={{ duration: 8, repeat: Infinity, repeatType: 'loop' }}
            className="absolute top-1/4 w-96 h-96 rounded-full blur-3xl"
            style={{ background: `linear-gradient(45deg, #FDCA78, #FF7902)` }}
          />
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: '-100%', opacity: 0.2 }}
            transition={{ duration: 12, repeat: Infinity, repeatType: 'loop', delay: 2 }}
            className="absolute bottom-1/4 right-0 w-80 h-80 rounded-full blur-3xl"
            style={{ background: `linear-gradient(45deg, #F2932C, #F98F34)` }}
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex items-center justify-center min-h-full">
            {/* Content */}
            <motion.div
              key={`content-${currentSlide}`}
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-white text-center max-w-5xl mx-auto"
            >
              {/* Enhanced Location Badge */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="inline-flex items-center bg-white/10 backdrop-blur-xl rounded-full px-6 py-3 mb-8 border border-white/20 shadow-2xl"
                style={{
                  background: `linear-gradient(135deg, rgba(253, 202, 120, 0.2), rgba(255, 121, 2, 0.1))`
                }}
              >
                <div
                  className="w-2 h-2 rounded-full mr-3 animate-pulse"
                  style={{ backgroundColor: '#FDCA78' }}
                />
                <span className="text-base font-semibold tracking-wide">{slides[currentSlide].location || t('hero.location')}</span>
              </motion.div>

              {/* Enhanced Title with Gradient */}
              <motion.h1
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-tight"
                style={{
                  background: `linear-gradient(135deg, #FDCA78, #FF7902, #F2932C, #F98F34)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: '0 0 30px rgba(253, 202, 120, 0.3)'
                }}
              >
                {t(slides[currentSlide].titleKey)}
              </motion.h1>

              {/* Enhanced Subtitle */}
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
                className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-12 leading-relaxed max-w-4xl mx-auto text-white/90 font-light"
              >
                {t(slides[currentSlide].subtitleKey)}
              </motion.p>

              {/* Enhanced Action Buttons */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.8 }}
                className="flex flex-col sm:flex-row gap-6 justify-center items-center"
              >
                <motion.button
                  onClick={handleBookNow}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative overflow-hidden text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-500 shadow-2xl hover:shadow-3xl transform"
                  style={{
                    background: `linear-gradient(135deg, #FDCA78, #FF7902, #F2932C, #F98F34)`,
                    boxShadow: '0 20px 40px rgba(253, 202, 120, 0.4)'
                  }}
                >
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                  <span className="relative z-10 tracking-wide">{t('hero.bookNow')}</span>
                </motion.button>

                <motion.button
                  onClick={handleExploreMore}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group relative border-2 border-white/40 text-white px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-500 backdrop-blur-xl hover:backdrop-blur-sm overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(253, 202, 120, 0.1))`,
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {/* Hover background effect */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, #FDCA78, #FF7902)`
                    }}
                  />
                  <span className="relative z-10 tracking-wide group-hover:text-white transition-colors duration-300">{t('hero.exploreMore')}</span>
                </motion.button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>      {/* Enhanced Navigation Arrows */}
      <motion.button
        onClick={prevSlide}
        whileHover={{ scale: 1.1, x: isRTL ? 5 : -5 }}
        whileTap={{ scale: 0.9 }}
        className={`absolute top-1/2 ${isRTL ? 'right-6' : 'left-6'} transform -translate-y-1/2 z-20 group overflow-hidden p-4 rounded-full transition-all duration-500 shadow-2xl hover:shadow-3xl`}
        style={{
          background: `linear-gradient(135deg, rgba(253, 202, 120, 0.2), rgba(255, 121, 2, 0.2))`,
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(135deg, #FDCA78, #FF7902)` }}
        />
        {isRTL ? (
          <ChevronRightIcon className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <ChevronLeftIcon className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
        )}
      </motion.button>

      <motion.button
        onClick={nextSlide}
        whileHover={{ scale: 1.1, x: isRTL ? -5 : 5 }}
        whileTap={{ scale: 0.9 }}
        className={`absolute top-1/2 ${isRTL ? 'left-6' : 'right-6'} transform -translate-y-1/2 z-20 group overflow-hidden p-4 rounded-full transition-all duration-500 shadow-2xl hover:shadow-3xl`}
        style={{
          background: `linear-gradient(135deg, rgba(242, 147, 44, 0.2), rgba(249, 143, 52, 0.2))`,
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(135deg, #F2932C, #F98F34)` }}
        />
        {isRTL ? (
          <ChevronLeftIcon className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
        ) : (
          <ChevronRightIcon className="h-7 w-7 text-white relative z-10 group-hover:scale-110 transition-transform duration-300" />
        )}
      </motion.button>

      {/* Enhanced Dots Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-20">
        <div
          className="flex space-x-4 bg-white/10 backdrop-blur-xl rounded-full p-3 border border-white/20"
          style={{
            background: `linear-gradient(135deg, rgba(253, 202, 120, 0.1), rgba(255, 121, 2, 0.1))`
          }}
        >
          {slides.map((_, index) => (
            <motion.button
              key={index}
              onClick={() => goToSlide(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              className={`relative w-4 h-4 rounded-full transition-all duration-500 overflow-hidden ${
                index === currentSlide ? 'scale-125' : 'hover:scale-110'
              }`}
              style={{
                background: index === currentSlide
                  ? `linear-gradient(135deg, #FDCA78, #FF7902)`
                  : 'rgba(255, 255, 255, 0.4)',
                boxShadow: index === currentSlide
                  ? '0 0 20px rgba(253, 202, 120, 0.6)'
                  : 'none'
              }}
            >
              {index === currentSlide && (
                <div
                  className="absolute inset-0 animate-pulse"
                  style={{ background: `linear-gradient(135deg, #FDCA78, #FF7902)` }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};
