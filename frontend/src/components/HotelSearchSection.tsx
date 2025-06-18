import React, { useState, useEffect, useCallback } from 'react';
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
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { useDirection } from '../hooks/useDirection';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../types/hotel';

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

  // Autocomplete state
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(false);
  // Hotel search function for autocomplete
  const searchHotelsAsync = useCallback(async (query: string) => {
    if (query.length < 2) {
      setHotels([]);
      setShowSuggestions(false);
      return;
    }
//    Start loading state
    setLoadingHotels(true);
    try {
      const response = await searchHotels(query, 1, 8); // Limit to 8 suggestions
      if (response?.hotels) {
        setHotels(response.hotels);
        setShowSuggestions(true);
      } else {
        setHotels([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Error searching hotels:', err);
      setHotels([]);
      setShowSuggestions(false);
    } finally {
      setLoadingHotels(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (searchParams.destination.length >= 2) {
      const delayedSearch = setTimeout(() => {
        searchHotelsAsync(searchParams.destination);
      }, 300);
      return () => clearTimeout(delayedSearch);
    } else {
      setHotels([]);
      setShowSuggestions(false);
    }
  }, [searchParams.destination, searchHotelsAsync]);

  const handleChange = (field: string, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));

    // Close suggestions when changing other fields
    if (field !== 'destination') {
      setShowSuggestions(false);
    }
  };

  const handleHotelSelect = (hotel: Hotel) => {
    setSearchParams(prev => ({
      ...prev,
      destination: `${hotel.name}, ${hotel.city}, ${hotel.country}`
    }));
    setShowSuggestions(false);
    setHotels([]);
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
    <section className="relative py-4 sm:py-16 lg:py-20 overflow-hidden">      {/* Modern Light Background */}
      <div className="absolute inset-0" style={{backgroundColor: '#E1FAFF'}}></div>{/* Subtle decorative elements for modern look */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-4 -left-4 w-72 h-72 bg-blue-100/20 rounded-full blur-3xl"></div>
        <div className="absolute top-20 right-10 w-96 h-96 bg-cyan-100/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-teal-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">        {/* Modern Search Form */}{/* Mobile: Compact Stacked Design */}
        <div className="sm:hidden">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Single Compact Card */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="relative group"
              >
                <div className="relative bg-white/90 backdrop-blur-md rounded-2xl p-4 border-2 border-[#F7871D] shadow-md hover:shadow-lg transition-all duration-300">

                  {/* Destination Field */}
                  <div className="space-y-2 mb-3 relative">
                    <label className={`text-gray-700 font-medium text-sm ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                      {t('hotels.search.destination', 'Where to?')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={searchParams.destination}
                        onChange={(e) => handleChange('destination', e.target.value)}
                        onFocus={() => searchParams.destination.length >= 2 && setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        placeholder={t('hotels.search.destinationPlaceholder', 'City, hotel, or landmark...')}
                        className={`w-full p-2.5 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 font-medium text-sm transition-all duration-300 ${isRTL ? 'text-right' : 'text-left'} placeholder-gray-400`}
                        dir={isRTL ? 'rtl' : 'ltr'}
                        required
                      />

                      {/* Loading indicator */}
                      {loadingHotels && (
                        <div className={`absolute ${isRTL ? 'left-3' : 'right-3'} top-1/2 transform -translate-y-1/2`}>
                          <div className="w-4 h-4 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>                    {/* Autocomplete Dropdown */}
                    {showSuggestions && hotels.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
                      >
                        {hotels.map((hotel, index) => (
                          <motion.div
                            key={hotel.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => handleHotelSelect(hotel)}
                            className="flex items-start p-3 hover:bg-orange-50 cursor-pointer transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                          >                            <div className={`w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center ${isRTL ? 'ml-3' : 'mr-3'} flex-shrink-0 mt-0.5`}>
                              <BuildingOfficeIcon className="h-4 w-4 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 text-xs leading-tight break-words">{hotel.name}</div>
                              <div className="text-xs text-gray-500 mt-1 break-words">{hotel.city}, {hotel.country}</div>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="space-y-1">                      <label className={`text-gray-700 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                        {t('hotels.checkIn', 'Check-in')}
                      </label>
                      <input
                        type="date"
                        value={searchParams.checkIn}
                        min={today}
                        onChange={(e) => handleChange('checkIn', e.target.value)}
                        className="w-full p-2 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 text-xs font-medium transition-all duration-300"
                        required
                      />
                    </div>
                    <div className="space-y-1">                      <label className={`text-gray-700 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                        {t('hotels.checkOut', 'Check-out')}
                      </label>
                      <input
                        type="date"
                        value={searchParams.checkOut}
                        min={searchParams.checkIn || tomorrowStr}
                        onChange={(e) => handleChange('checkOut', e.target.value)}
                        className="w-full p-2 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 text-xs font-medium transition-all duration-300"
                        required
                      />
                    </div>
                  </div>

                  {/* Guests Row */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">                      <label className={`text-gray-600 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                        {t('hotels.rooms', 'Rooms')}
                      </label>
                      <select
                        value={searchParams.rooms}
                        onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 font-medium text-xs transition-all duration-300"
                      >
                        {[1, 2, 3, 4, 5].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">                      <label className={`text-gray-600 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                        {t('hotels.adults', 'Adults')}
                      </label>
                      <select
                        value={searchParams.adults}
                        onChange={(e) => handleChange('adults', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 font-medium text-xs transition-all duration-300"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">                      <label className={`text-gray-600 font-medium text-xs ${isRTL ? 'text-right' : 'text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                        {t('hotels.children', 'Children')}
                      </label>
                      <select
                        value={searchParams.children}
                        onChange={(e) => handleChange('children', parseInt(e.target.value))}
                        className="w-full p-2 bg-gray-50/70 rounded-lg border border-gray-200 focus:border-[#F7871D] focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-100 text-gray-800 font-medium text-xs transition-all duration-300"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Compact Search Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  className="relative w-full group overflow-hidden bg-[#F7871D] hover:bg-[#e67612] text-white py-3 px-6 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div className="relative flex items-center justify-center space-x-2">
                    <MagnifyingGlassIcon className="h-5 w-5" />
                    <span className="font-bold">{t('hotels.search.button', 'Search Hotels')}</span>
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
        >          {/* Modern clean container */}
          <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 border-2 border-[#F7871D] shadow-2xl hover:shadow-3xl transition-all duration-300">
            <form onSubmit={handleSubmit} className="relative space-y-8">
              {/* Destination Search */}
              <motion.div
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="space-y-3 relative"
              >
                <label className={`flex items-center text-gray-700 font-semibold text-lg ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
                  <GlobeAltIcon className={`h-6 w-6 text-blue-600 ${isRTL ? 'ml-6 sm:ml-4' : 'mr-6 sm:mr-4'}`} />
                  <span
                    className={`${isRTL ? 'text-right' : 'text-left'}`}
                  >
                    {t('hotels.search.destination', 'Where would you like to stay?')}
                  </span>
                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-red-500`}>*</span>
                </label>

                <div className="relative group">
                  <div className="relative bg-gray-50/70 rounded-2xl border-2 border-gray-200 hover:border-[#F7871D] transition-all duration-300 overflow-hidden focus-within:border-[#F7871D] focus-within:ring-4 focus-within:ring-orange-100">
                    <MapPinIcon className={`absolute ${isRTL ? 'right-6' : 'left-6'} top-1/2 transform -translate-y-1/2 h-6 w-6 text-[#F7871D]`} />
                    <input
                      type="text"
                      value={searchParams.destination}
                      onChange={(e) => handleChange('destination', e.target.value)}
                      onFocus={() => searchParams.destination.length >= 2 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      placeholder={t('hotels.search.destinationPlaceholder', 'Enter city, hotel name, or landmark...')}
                      className={`w-full ${isRTL ? 'pr-16 pl-6 text-right' : 'pl-16 pr-6 text-left'} py-5 bg-transparent text-gray-800 placeholder-gray-400 text-lg font-medium focus:outline-none border-none`}
                      dir={isRTL ? 'rtl' : 'ltr'}
                      required
                    />

                    {/* Loading indicator */}
                    {loadingHotels && (
                      <div className={`absolute ${isRTL ? 'left-6' : 'right-6'} top-1/2 transform -translate-y-1/2`}>
                        <div className="w-5 h-5 border-2 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Desktop Autocomplete Dropdown */}
                {showSuggestions && hotels.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border-2 border-gray-200 rounded-2xl shadow-xl max-h-80 overflow-y-auto"
                  >
                    {hotels.map((hotel, index) => (
                      <motion.div
                        key={hotel.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleHotelSelect(hotel)}
                        className="flex items-center p-4 hover:bg-orange-50 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0 group"
                      >
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                          <BuildingOfficeIcon className="h-6 w-6 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-base truncate group-hover:text-orange-600 transition-colors duration-200">{hotel.name}</div>
                          <div className="text-sm text-gray-500 truncate flex items-center mt-1">
                            <MapPinIcon className="h-4 w-4 mr-1 text-gray-400" />
                            {hotel.city}, {hotel.country}
                          </div>
                          {hotel.rating && (
                            <div className="flex items-center mt-1">
                              <div className="flex text-yellow-400">
                                {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                                  <span key={i} className="text-xs">★</span>
                                ))}
                              </div>
                              <span className="text-xs text-gray-500 ml-1">{hotel.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          →
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </motion.div>              {/* Date Selection */}
              <motion.div
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="grid grid-cols-2 gap-6"
              >
                {/* Check-in Date */}
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
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
                <div className="space-y-3">                  <label className={`flex items-center text-gray-700 font-semibold text-base ${isRTL ? 'flex-row-reverse justify-end text-right' : 'flex-row justify-start text-left'}`} style={{ fontFamily: 'SFArabic-Regular, sans-serif' }}>
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
