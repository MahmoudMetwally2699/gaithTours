import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  SparklesIcon,
  GlobeAltIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { useDirection } from '../hooks/useDirection';

interface HotelSearchSectionProps {
  onSearch?: (params: any) => void;
}

export const HotelSearchSection: React.FC<HotelSearchSectionProps> = ({ onSearch }) => {
  const { t } = useTranslation();
  const { direction } = useDirection();
  const history = useHistory();
  const isRTL = direction === 'rtl';

  const [searchParams, setSearchParams] = useState({
    destination: '',
    checkIn: '',
    checkOut: '',
    rooms: 1,
    adults: 2,
    children: 0
  });

  const handleChange = (field: string, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!searchParams.destination || !searchParams.checkIn || !searchParams.checkOut) {
      alert(t('hotels.search.fillRequired', 'Please fill in all required fields'));
      return;
    }

    // Validate dates
    const checkInDate = new Date(searchParams.checkIn);
    const checkOutDate = new Date(searchParams.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (checkInDate < today) {
      alert(t('hotels.search.invalidCheckIn', 'Check-in date cannot be in the past'));
      return;
    }

    if (checkOutDate <= checkInDate) {
      alert(t('hotels.search.invalidCheckOut', 'Check-out date must be after check-in date'));
      return;
    }

    // Navigate to search results page
    const queryParams = new URLSearchParams({
      destination: searchParams.destination,
      checkIn: searchParams.checkIn,
      checkOut: searchParams.checkOut,
      rooms: searchParams.rooms.toString(),
      adults: searchParams.adults.toString(),
      children: searchParams.children.toString()
    });

    history.push(`/hotels/search?${queryParams.toString()}`);
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get tomorrow's date for checkout minimum
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];  return (
    <section className="relative py-8 sm:py-16 lg:py-20 overflow-hidden">
      {/* Mobile-First Unique Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-orange-900 to-yellow-900 sm:bg-gradient-to-br sm:from-amber-900 sm:via-orange-900 sm:to-yellow-900"></div>

      {/* Mobile: Diagonal waves pattern */}
      <div className="absolute inset-0 sm:hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-1"></div>
        <div className="absolute top-16 left-0 w-full h-40 bg-gradient-to-r from-transparent via-orange-500/10 to-transparent transform skew-y-2"></div>
        <div className="absolute bottom-0 left-0 w-full h-28 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent transform skew-y-1"></div>
      </div>

      {/* Desktop: Original animated elements */}
      <div className="absolute inset-0 overflow-hidden hidden sm:block">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-yellow-500/10 rounded-full blur-3xl animate-pulse" style={{backgroundColor: '#FDCA78'}}></div>
        <div className="absolute top-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" style={{backgroundColor: '#FF7902'}}></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-2000" style={{backgroundColor: '#F2932C'}}></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Mobile Unique Header Design */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-8 sm:mb-12"
        >
          {/* Mobile: Floating badge with animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-md rounded-full border border-white/30 mb-4 sm:mb-6 shadow-lg"
          >
            <SparklesIcon className="h-4 w-4 mr-2 animate-pulse" style={{color: '#FDCA78'}} />
            <span className="text-white font-semibold text-sm tracking-wide">Premium Hotel Search</span>
          </motion.div>          {/* Mobile: Stacked title with unique styling */}
          <div className="sm:hidden mb-6">
            <motion.h2
              initial={{ x: isRTL ? 50 : -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-4xl font-black text-white tracking-tight text-center leading-tight"
              style={{
                lineHeight: isRTL ? '1.4' : '1.2',
                marginBottom: isRTL ? '24px' : '12px'
              }}
            >
              {t('hotels.title', 'Find Your')}
            </motion.h2>
            <motion.div
              initial={{ x: isRTL ? -50 : 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative"
            >
              <h2
                className="text-4xl font-black bg-gradient-to-r from-amber-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent text-center leading-tight"
                style={{
                  lineHeight: isRTL ? '1.4' : '1.2',
                  marginBottom: isRTL ? '16px' : '8px',
                  paddingBottom: isRTL ? '8px' : '4px'
                }}
              >
                {t('hotels.perfectStay', 'Perfect Hotel')}
              </h2>
              <div className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transform scale-x-0 animate-pulse"></div>
            </motion.div>
          </div>          {/* Desktop: Original title */}
          <h2
            className="hidden sm:block text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 lg:mb-6 text-center"
            style={{
              lineHeight: isRTL ? '1.4' : '1.1',
              marginBottom: isRTL ? '2rem' : '1.5rem'
            }}
          >
            <span
              className="block"
              style={{
                marginBottom: isRTL ? '1rem' : '0.5rem'
              }}
            >
              {t('hotels.title', 'Find Your')}
            </span>
            <span
              className="block bg-gradient-to-r bg-clip-text text-transparent"
              style={{
                backgroundImage: `linear-gradient(to right, #FDCA78, #FF7902, #F2932C)`,
                lineHeight: isRTL ? '1.4' : '1.1'
              }}
            >
              {t('hotels.perfectStay', 'Perfect Hotel')}
            </span>
          </h2>{/* Mobile: Compact subtitle */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-sm sm:text-lg lg:text-xl text-white/90 max-w-xs sm:max-w-2xl lg:max-w-3xl mx-auto leading-relaxed font-medium text-center"
          >
            <span className="sm:hidden">{t('hotels.subtitle', 'Discover amazing stays worldwide')}</span>
            <span className="hidden sm:inline">{t('hotels.search.subtitle', 'Discover extraordinary stays worldwide with our intelligent search. Compare thousands of hotels and unlock exclusive deals.')}</span>
          </motion.p>
        </motion.div>        {/* Mobile: Unique Card Stack Design */}
        <div className="sm:hidden">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mobile Card 1: Destination */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-xl">                  <div className={`flex items-center mb-3 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                    <div className={`w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'}`}>
                      <GlobeAltIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-gray-800 font-bold text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.search.destination', 'Where to?')}</span>
                  </div>
                  <input
                    type="text"
                    value={searchParams.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                    placeholder={t('hotels.search.destinationPlaceholder', 'City, hotel, or landmark...')}
                    className={`w-full p-4 bg-gray-50 rounded-xl border-2 border-gray-100 focus:border-orange-400 focus:outline-none text-gray-800 font-medium transition-colors duration-200 ${isRTL ? 'text-right' : 'text-left'}`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
              </motion.div>

              {/* Mobile Card 2: Dates (Side by Side) */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 gap-3"
              >
                {/* Check-in */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-lg">                    <div className={`flex items-center mb-2 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                      <div className={`w-8 h-8 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center ${isRTL ? 'ml-2' : 'mr-2'}`}>
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className={`text-gray-800 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkIn', 'Check-in')}</span>
                    </div>
                    <input
                      type="date"
                      value={searchParams.checkIn}
                      min={today}
                      onChange={(e) => handleChange('checkIn', e.target.value)}
                      className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 focus:border-orange-400 focus:outline-none text-gray-800 text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Check-out */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-pink-400 rounded-xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                  <div className="relative bg-white/95 backdrop-blur-sm rounded-xl p-4 border border-white/30 shadow-lg">                    <div className={`flex items-center mb-2 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                      <div className={`w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg flex items-center justify-center ${isRTL ? 'ml-2' : 'mr-2'}`}>
                        <CalendarIcon className="h-4 w-4 text-white" />
                      </div>
                      <span className={`text-gray-800 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkOut', 'Check-out')}</span>
                    </div>
                    <input
                      type="date"
                      value={searchParams.checkOut}
                      min={searchParams.checkIn || tomorrowStr}
                      onChange={(e) => handleChange('checkOut', e.target.value)}
                      className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 focus:border-red-400 focus:outline-none text-gray-800 text-sm font-medium"
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Mobile Card 3: Guests (Horizontal Pills) */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-5 border border-white/30 shadow-xl">                  <div className={`flex items-center mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                    <div className={`w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'}`}>
                      <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className={`text-gray-800 font-bold text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.guests', 'Guests & Rooms')}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.rooms', 'Rooms')}</label>
                      <select
                        value={searchParams.rooms}
                        onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 focus:border-yellow-400 focus:outline-none text-gray-800 font-medium text-sm"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.adults', 'Adults')}</label>
                      <select
                        value={searchParams.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 focus:border-yellow-400 focus:outline-none text-gray-800 font-medium text-sm"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-1 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.children', 'Children')}</label>
                      <select
                        value={searchParams.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50 rounded-lg border border-gray-100 focus:border-yellow-400 focus:outline-none text-gray-800 font-medium text-sm"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Mobile: Unique Search Button */}
              <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  className="relative w-full group overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white py-5 px-6 rounded-2xl font-bold text-lg shadow-2xl transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
                  style={{
                    boxShadow: '0 20px 40px rgba(245, 158, 11, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>                  <div className="relative flex items-center justify-center space-x-3">
                    <MagnifyingGlassIcon className="h-6 w-6" />
                    <span className="font-black tracking-wide">{t('hotels.search.button', 'Search Hotels')}</span>
                    <SparklesIcon className="h-5 w-5 group-hover:animate-spin" />
                  </div>
                </button>
              </motion.div>
            </form>
          </motion.div>
        </div>

        {/* Desktop: Original Design */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden sm:block"
        >          {/* Glass morphism container */}
          <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 xl:p-10 border border-white/20 shadow-2xl">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full blur-2xl" style={{background: `linear-gradient(to bottom right, #FDCA78, #FF7902)`}}></div>
            <div className="absolute bottom-0 right-0 w-28 h-28 sm:w-40 sm:h-40 rounded-full blur-2xl" style={{background: `linear-gradient(to bottom right, #F2932C, #F98F34)`}}></div>

            <form onSubmit={handleSubmit} className="relative space-y-4 sm:space-y-6 lg:space-y-8">
              {/* Destination Search */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-2 sm:space-y-3"
              >                <label className={`flex items-center text-white font-semibold text-base sm:text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                  <GlobeAltIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`} style={{color: '#FDCA78'}} />
                  <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.search.destination', 'Where would you like to stay?')}</span>
                  <span className={`${isRTL ? 'mr-1' : 'ml-1'}`} style={{color: '#FF7902'}}>*</span>
                </label>

                <div className="relative group">
                  <div className="absolute inset-0 rounded-xl sm:rounded-2xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #FDCA78, #FF7902)`}}></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/30 overflow-hidden">
                    <MapPinIcon className={`absolute ${isRTL ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6`} style={{color: '#FF7902'}} />
                    <input
                      type="text"
                      value={searchParams.destination}
                      onChange={(e) => handleChange('destination', e.target.value)}
                      placeholder={t('hotels.search.destinationPlaceholder', 'Enter city, hotel name, or landmark...')}
                      className={`w-full ${isRTL ? 'pr-12 sm:pr-16 pl-4 sm:pl-6 text-right' : 'pl-12 sm:pl-16 pr-4 sm:pr-6 text-left'} py-3 sm:py-5 bg-transparent text-gray-800 placeholder-gray-500 text-base sm:text-lg font-medium focus:outline-none`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      required
                    />
                  </div>
                </div>
              </motion.div>

              {/* Date Selection */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-2 gap-3 sm:gap-4"
              >
                {/* Check-in Date */}
                <div className="space-y-1.5 sm:space-y-2">                  <label className={`flex items-center text-white font-semibold text-sm sm:text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <CalendarIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRTL ? 'ml-1 sm:ml-1.5' : 'mr-1 sm:mr-1.5'}`} style={{color: '#F2932C'}} />
                    <span className={`${isRTL ? 'text-right' : 'text-left'} hidden sm:inline`}>{t('hotels.checkIn', 'Check-in')}</span>
                    <span className={`${isRTL ? 'text-right' : 'text-left'} sm:hidden`}>{t('hotels.checkIn', 'In')}</span>
                    <span className={`${isRTL ? 'mr-1' : 'ml-1'}`} style={{color: '#FF7902'}}>*</span>
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #F2932C, #F98F34)`}}></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 overflow-hidden">
                      <CalendarIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5`} style={{color: '#F2932C'}} />
                      <input
                        type="date"
                        value={searchParams.checkIn}
                        min={today}
                        onChange={(e) => handleChange('checkIn', e.target.value)}
                        className={`w-full ${isRTL ? 'pr-9 sm:pr-12 pl-2 sm:pl-4' : 'pl-9 sm:pl-12 pr-2 sm:pr-4'} py-2.5 sm:py-3 bg-transparent text-gray-800 text-sm sm:text-base font-medium focus:outline-none`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Check-out Date */}
                <div className="space-y-1.5 sm:space-y-2">                  <label className={`flex items-center text-white font-semibold text-sm sm:text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <CalendarIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isRTL ? 'ml-1 sm:ml-1.5' : 'mr-1 sm:mr-1.5'}`} style={{color: '#F98F34'}} />
                    <span className={`${isRTL ? 'text-right' : 'text-left'} hidden sm:inline`}>{t('hotels.checkOut', 'Check-out')}</span>
                    <span className={`${isRTL ? 'text-right' : 'text-left'} sm:hidden`}>{t('hotels.checkOut', 'Out')}</span>
                    <span className={`${isRTL ? 'mr-1' : 'ml-1'}`} style={{color: '#FF7902'}}>*</span>
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 rounded-lg sm:rounded-xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #F98F34, #FDCA78)`}}></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/30 overflow-hidden">
                      <CalendarIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5`} style={{color: '#F98F34'}} />
                      <input
                        type="date"
                        value={searchParams.checkOut}
                        min={searchParams.checkIn || tomorrowStr}
                        onChange={(e) => handleChange('checkOut', e.target.value)}
                        className={`w-full ${isRTL ? 'pr-9 sm:pr-12 pl-2 sm:pl-4' : 'pl-9 sm:pl-12 pr-2 sm:pr-4'} py-2.5 sm:py-3 bg-transparent text-gray-800 text-sm sm:text-base font-medium focus:outline-none`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Guest Configuration */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6"
              >
                {/* Rooms */}
                <div className="space-y-2 sm:space-y-3">                  <label className={`flex items-center text-white font-semibold text-base sm:text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <HomeIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`} style={{color: '#FDCA78'}} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.rooms', 'Rooms')}</span>
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #FDCA78, #F2932C)`}}></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/30 overflow-hidden">
                      <HomeIcon className={`absolute ${isRTL ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6`} style={{color: '#FDCA78'}} />
                      <select
                        value={searchParams.rooms}
                        onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 sm:pr-16 pl-4 sm:pl-6' : 'pl-12 sm:pl-16 pr-4 sm:pr-6'} py-3 sm:py-5 bg-transparent text-gray-800 text-base sm:text-lg font-medium focus:outline-none appearance-none cursor-pointer`}
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? t('hotels.room', 'Room') : t('hotels.rooms', 'Rooms')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Adults */}
                <div className="space-y-2 sm:space-y-3">                  <label className={`flex items-center text-white font-semibold text-base sm:text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <UserIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`} style={{color: '#FF7902'}} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.adults', 'Adults')}</span>
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #FF7902, #F98F34)`}}></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/30 overflow-hidden">
                      <UserIcon className={`absolute ${isRTL ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6`} style={{color: '#FF7902'}} />
                      <select
                        value={searchParams.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 sm:pr-16 pl-4 sm:pl-6' : 'pl-12 sm:pl-16 pr-4 sm:pr-6'} py-3 sm:py-5 bg-transparent text-gray-800 text-base sm:text-lg font-medium focus:outline-none appearance-none cursor-pointer`}
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>
                            {num} {num === 1 ? t('hotels.adult', 'Adult') : t('hotels.adults', 'Adults')}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Children */}
                <div className="space-y-2 sm:space-y-3">                  <label className={`flex items-center text-white font-semibold text-base sm:text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <UserIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'ml-1.5 sm:ml-2' : 'mr-1.5 sm:mr-2'}`} style={{color: '#F2932C'}} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.children', 'Children')}</span>
                  </label>

                  <div className="relative group">
                    <div className="absolute inset-0 rounded-xl sm:rounded-2xl blur group-hover:blur-md transition-all duration-300" style={{background: `linear-gradient(to right, #F2932C, #FDCA78)`}}></div>
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl border border-white/30 overflow-hidden">
                      <UserIcon className={`absolute ${isRTL ? 'right-4 sm:right-6' : 'left-4 sm:left-6'} top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6`} style={{color: '#F2932C'}} />
                      <select
                        value={searchParams.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 sm:pr-16 pl-4 sm:pl-6' : 'pl-12 sm:pl-16 pr-4 sm:pr-6'} py-3 sm:py-5 bg-transparent text-gray-800 text-base sm:text-lg font-medium focus:outline-none appearance-none cursor-pointer`}
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>
                            {num === 0 ? t('hotels.noChildren', 'No Children') : `${num} ${num === 1 ? t('hotels.child', 'Child') : t('hotels.children', 'Children')}`}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Search Button */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="pt-4 sm:pt-6"
              >
                <button
                  type="submit"
                  className="group relative w-full overflow-hidden text-white py-4 sm:py-6 px-6 sm:px-8 rounded-xl sm:rounded-2xl font-bold text-lg sm:text-xl transition-all duration-500 shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(to right, #FDCA78, #FF7902, #F2932C, #F98F34)`,
                    boxShadow: '0 20px 40px rgba(253, 202, 120, 0.3)'
                  }}
                >
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>                  <div className="relative flex items-center justify-center space-x-3 sm:space-x-4">
                    <MagnifyingGlassIcon className="h-6 w-6 sm:h-7 sm:w-7 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="text-lg sm:text-xl font-bold tracking-wide">
                      {t('hotels.search.button', 'Search Amazing Hotels')}
                    </span>
                    <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 group-hover:scale-125 transition-transform duration-300" />
                  </div>
                </button>
              </motion.div>
            </form>
          </div>
        </motion.div>        {/* Mobile: Compact Feature Pills */}
        <div className="sm:hidden mt-8">
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {[
              { icon: "⭐", text: "Best Prices", color: "#FDCA78" },
              { icon: "⚡", text: "Instant Booking", color: "#FF7902" },
              { icon: "🌍", text: "Global Hotels", color: "#F2932C" }
            ].map((feature, index) => (              <motion.div
                key={index}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 + index * 0.1 }}
                className={`flex items-center bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <span className={`text-lg ${isRTL ? 'ml-2' : 'mr-2'}`}>{feature.icon}</span>
                <span className="text-white font-semibold text-sm">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Desktop: Original Features Grid */}
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="hidden sm:grid mt-12 lg:mt-16 grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: <StarIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
              title: "Best Price Guarantee",
              description: "Find the lowest prices or we'll match them",
              gradient: "#FDCA78"
            },
            {
              icon: <SparklesIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
              title: "Instant Confirmation",
              description: "Book now and get confirmed instantly",
              gradient: "#FF7902"
            },
            {
              icon: <GlobeAltIcon className="h-6 w-6 sm:h-8 sm:w-8" />,
              title: "Global Selection",
              description: "Access to millions of properties worldwide",
              gradient: "#F2932C"
            }
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.9 + index * 0.1 }}
              className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300"
            >
              <div
                className="inline-flex p-3 rounded-xl text-white mb-4 group-hover:scale-110 transition-transform duration-300"
                style={{backgroundColor: feature.gradient}}
              >
                {feature.icon}
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{feature.title}</h3>
              <p className="text-white/80 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
