import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon
} from '@heroicons/react/24/solid';
import {
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { HotelSearchSection } from './HotelSearchSection';

export const MainSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'accommodation' | 'flights'>('accommodation');
  const { t } = useTranslation();

  return (    <div className="bg-gray-50 py-16 pt-24">{/* Added pt-24 to account for fixed navbar */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">{/* Main and Sub Taglines */}
        <div className="text-center mb-16 relative">
          {/* Background decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-4 -left-4 w-32 h-32 bg-orange-100 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute top-10 right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl opacity-30"></div>
            <div className="absolute bottom-5 left-1/3 w-28 h-28 bg-purple-100 rounded-full blur-3xl opacity-30"></div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="relative z-10"
          >            {/* Main Heading with gradient and animations */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 leading-tight sm:whitespace-nowrap whitespace-normal"
              style={{ fontFamily: 'TIDO, sans-serif' }}
            >
              <span className="bg-gradient-to-r from-[#F7871D] via-[#FF6B35] to-[#1976D2] bg-clip-text text-transparent">
                {t('main.tagline')}
              </span>
            </h1>

            {/* Decorative line */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-1 bg-gradient-to-r from-orange-400 to-blue-400 rounded-full"></div>
            </div>            {/* Subtitle with enhanced styling */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-gray-700 font-medium max-w-4xl mx-auto leading-relaxed px-2 sm:px-4"
              style={{ fontFamily: 'TIDO, sans-serif' }}
            >
              <span className="relative">
                {t('main.subtitle')}
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-orange-300 to-transparent opacity-50"></span>
              </span>            </motion.p>
          </motion.div>
        </div>        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex justify-center mb-8 px-2"
        >
          <div className="flex gap-1 sm:gap-2 p-1 bg-white rounded-full shadow-lg max-w-full">            {/* Accommodation Tab */}
            <button
              onClick={() => setActiveTab('accommodation')}
              className={`
                flex items-center gap-3 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3 rounded-full transition-all duration-300 text-base sm:text-base
                ${activeTab === 'accommodation'
                  ? 'bg-white border-2 border-orange-500 text-orange-500 shadow-md'
                  : 'bg-sky-200 border-2 border-sky-300 text-white hover:bg-sky-300'
                }
              `}
              style={{ fontFamily: 'Cairo, sans-serif' }}
            >
              <div className={`
                w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center
                ${activeTab === 'accommodation' ? 'bg-sky-200' : 'bg-sky-400'}
              `}>
                <HomeIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="font-medium">{t('main.accommodation')}</span>
            </button>            {/* Flights Tab (Disabled) */}
            <div className="relative group">
              <button
                disabled
                className="
                  flex items-center gap-3 sm:gap-3 px-4 sm:px-6 py-3 sm:py-3 rounded-full text-base sm:text-base
                  bg-sky-200 border-2 border-sky-300 text-black
                  opacity-60 cursor-not-allowed
                "
                style={{ fontFamily: 'Cairo, sans-serif' }}
              >                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center bg-sky-400">
                  <PaperAirplaneIcon className="w-5 h-5 sm:w-5 sm:h-5 text-white rotate-45" />
                </div>
                <span className="font-medium">{t('main.flights')}</span>
              </button>

              {/* Tooltip */}
              <div className="
                absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                px-3 py-2 bg-gray-800 text-white text-sm rounded-lg
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
                pointer-events-none whitespace-nowrap
              ">
                <span style={{ fontFamily: 'Cairo, sans-serif' }}>{t('main.comingSoon')}</span>
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Hotel Search Section */}
        {activeTab === 'accommodation' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <HotelSearchSection />
          </motion.div>
        )}
      </div>
    </div>
  );
};
