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
  GlobeAltIcon
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
    <section className="relative py-8 sm:py-16 lg:py-20 overflow-hidden">      {/* Modern Light Background */}
      <div className="absolute inset-0" style={{backgroundColor: '#E1FAFF'}}></div>{/* Subtle decorative elements for modern look */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-100/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-teal-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">        {/* Modern Search Form */}{/* Mobile: Unique Card Stack Design */}
        <div className="sm:hidden">
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4"
          >            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Modern Card 1: Destination */}
              <motion.div
                initial={{ x: -100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="relative group"
              >                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className={`flex items-center mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                    <span className={`text-gray-700 font-semibold text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.search.destination', 'Where to?')}</span>
                  </div><input
                    type="text"
                    value={searchParams.destination}
                    onChange={(e) => handleChange('destination', e.target.value)}
                    placeholder={t('hotels.search.destinationPlaceholder', 'City, hotel, or landmark...')}
                    className={`w-full p-4 bg-gray-50/70 rounded-2xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 font-medium transition-all duration-300 ${isRTL ? 'text-right' : 'text-left'} placeholder-gray-400`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    required
                  />
                </div>
              </motion.div>

              {/* Modern Card 2: Dates (Side by Side) */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="grid grid-cols-2 gap-4"
              >                {/* Check-in */}
                <div className="relative group">
                  <div className="relative bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">                    <div className={`flex items-center mb-3 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                      <div className={`w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'} shadow-md`}>
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className={`text-gray-700 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkIn', 'Check-in')}</span>
                    </div><input
                      type="date"
                      value={searchParams.checkIn}
                      min={today}
                      onChange={(e) => handleChange('checkIn', e.target.value)}
                      className="w-full p-3 bg-gray-50/70 rounded-xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 text-sm font-medium transition-all duration-300"
                      required
                    />
                  </div>
                </div>

                {/* Check-out */}
                <div className="relative group">
                  <div className="relative bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">                    <div className={`flex items-center mb-3 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                      <div className={`w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'} shadow-md`}>
                        <CalendarIcon className="h-5 w-5 text-white" />
                      </div>
                      <span className={`text-gray-700 font-semibold text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkOut', 'Check-out')}</span>
                    </div><input
                      type="date"
                      value={searchParams.checkOut}
                      min={searchParams.checkIn || tomorrowStr}
                      onChange={(e) => handleChange('checkOut', e.target.value)}
                      className="w-full p-3 bg-gray-50/70 rounded-xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 text-sm font-medium transition-all duration-300"
                      required
                    />
                  </div>
                </div>
              </motion.div>              {/* Modern Card 3: Guests */}
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="relative group"
              >                <div className="relative bg-white/90 backdrop-blur-md rounded-3xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className={`flex items-center mb-4 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                    <span className={`text-gray-700 font-semibold text-lg ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.guests', 'Guests & Rooms')}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.rooms', 'Rooms')}</label>                      <select
                        value={searchParams.rooms}
                        onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
                        className="w-full p-3 bg-gray-50/70 rounded-xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 font-medium text-sm transition-all duration-300"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.adults', 'Adults')}</label>                      <select
                        value={searchParams.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value))}
                        className="w-full p-3 bg-gray-50/70 rounded-xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 font-medium text-sm transition-all duration-300"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-center">
                      <label className={`text-xs font-semibold text-gray-600 mb-2 block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.children', 'Children')}</label>
                      <select
                        value={searchParams.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value))}
                        className="w-full p-3 bg-gray-50/70 rounded-xl border-2 border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-4 focus:ring-orange-100 text-gray-800 font-medium text-sm transition-all duration-300"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>              {/* Modern Search Button */}
              <motion.div
                initial={{ y: 50, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="pt-4"
              >                <button
                  type="submit"
                  className="relative w-full group overflow-hidden bg-[#F7871D] hover:bg-[#e67612] text-white py-4 px-6 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div className="relative flex items-center justify-center space-x-3">
                    <MagnifyingGlassIcon className="h-6 w-6" />
                    <span className="font-bold tracking-wide">{t('hotels.search.button', 'Search Hotels')}</span>
                    <SparklesIcon className="h-5 w-5 group-hover:animate-pulse" />
                  </div>
                </button>
              </motion.div>
            </form>
          </motion.div>
        </div>        {/* Desktop: Modern Design */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative hidden sm:block"
        >
          {/* Modern clean container */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 border border-gray-200/50 shadow-2xl hover:shadow-3xl transition-all duration-300">
            <form onSubmit={handleSubmit} className="relative space-y-8">
              {/* Destination Search */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-3"
              >                <label className={`flex items-center text-gray-700 font-semibold text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                  <GlobeAltIcon className={`h-6 w-6 text-blue-600 ${isRTL ? 'ml-6 sm:ml-4' : 'mr-6 sm:mr-4'}`} />
                  <span
                    className={`${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('hotels.search.destination', 'Where would you like to stay?')}
                  </span>
                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-red-500`}>*</span>
                </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 overflow-hidden focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <MapPinIcon className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#F7871D]`} />                    <input
                      type="text"
                      value={searchParams.destination}
                      onChange={(e) => handleChange('destination', e.target.value)}
                      placeholder={t('hotels.search.destinationPlaceholder', 'Enter city, hotel name, or landmark...')}
                      className={`w-full ${isRTL ? 'pr-16 pl-6 text-right' : 'pl-16 pr-6 text-left'} py-5 bg-transparent text-gray-800 placeholder-gray-400 text-lg font-medium focus:outline-none border-none`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      required
                    />
                  </div>
                </div>
              </motion.div>              {/* Date Selection */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-2 gap-6"
              >
                {/* Check-in Date */}
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <CalendarIcon className={`h-5 w-5 text-green-600 ${isRTL ? 'ml-4 sm:ml-3' : 'mr-4 sm:mr-3'}`} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.checkIn', 'Check-in')}</span>
                    <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-red-500`}>*</span>
                  </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <CalendarIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#F7871D]`} />                      <input
                        type="date"
                        value={searchParams.checkIn}
                        min={today}
                        onChange={(e) => handleChange('checkIn', e.target.value)}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-transparent text-gray-800 text-base font-medium focus:outline-none border-none`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>
                  </div>
                </div>                {/* Check-out Date */}
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <CalendarIcon className={`h-5 w-5 text-pink-600 ${isRTL ? 'ml-4 sm:ml-3' : 'mr-4 sm:mr-3'}`} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.checkOut', 'Check-out')}</span>
                    <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-red-500`}>*</span>
                  </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <CalendarIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#F7871D]`} />                      <input
                        type="date"
                        value={searchParams.checkOut}
                        min={searchParams.checkIn || tomorrowStr}
                        onChange={(e) => handleChange('checkOut', e.target.value)}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-transparent text-gray-800 text-base font-medium focus:outline-none border-none`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />
                    </div>
                  </div>
                </div>
              </motion.div>              {/* Guest Configuration */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                {/* Rooms */}
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <HomeIcon className={`h-5 w-5 text-amber-600 ${isRTL ? 'ml-4 sm:ml-3' : 'mr-4 sm:mr-3'}`} />
                    <span className={isRTL ? 'text-right' : 'text-left'}>{t('hotels.rooms', 'Rooms')}</span>
                  </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <HomeIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#F7871D]`} />                      <select
                        value={searchParams.rooms}
                        onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-transparent text-gray-800 text-base font-medium focus:outline-none appearance-none cursor-pointer border-none`}
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <UserIcon className={`h-5 w-5 text-blue-600 ${isRTL ? 'ml-6 sm:ml-4' : 'mr-6 sm:mr-4'}`} />
                    <span className={`${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.adults', 'Adults')}</span>
                  </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <UserIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#F7871D]`} />                      <select
                        value={searchParams.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-transparent text-gray-800 text-base font-medium focus:outline-none appearance-none cursor-pointer border-none`}
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`}>
                    <UserIcon className={`h-5 w-5 text-purple-600 ${isRTL ? 'ml-6 sm:ml-4' : 'mr-6 sm:mr-4'}`} />
                    <span className={`${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.children', 'Children')}</span>
                  </label><div className="relative group">
                    <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                      <UserIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#F7871D]`} />                      <select
                        value={searchParams.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value))}
                        className={`w-full ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 bg-transparent text-gray-800 text-base font-medium focus:outline-none appearance-none cursor-pointer border-none`}
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
                className="pt-6"
              >                <button
                  type="submit"
                  className="group relative w-full overflow-hidden bg-[#F7871D] hover:bg-[#e67612] text-white py-5 px-8 rounded-2xl font-semibold text-xl transition-all duration-500 shadow-xl hover:shadow-2xl transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {/* Animated background overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                  <div className="relative flex items-center justify-center space-x-4">
                    <MagnifyingGlassIcon className="h-7 w-7 group-hover:rotate-12 transition-transform duration-300" />
                    <span className="text-xl font-bold tracking-wide">
                      {t('hotels.search.button', 'Search Amazing Hotels')}
                    </span>
                    <SparklesIcon className="h-6 w-6 group-hover:scale-125 transition-transform duration-300" />
                  </div>
                </button>
              </motion.div>
            </form>
          </div>        </motion.div>
      </div>
    </section>
  );
};
