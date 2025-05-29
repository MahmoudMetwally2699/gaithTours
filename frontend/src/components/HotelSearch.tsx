import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface SearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface HotelSearchProps {
  onSearch: (params: SearchParams) => void;
}

export const HotelSearch: React.FC<HotelSearchProps> = ({ onSearch }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useState<SearchParams>({
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchParams);
  };

  const handleChange = (field: keyof SearchParams, value: string | number) => {
    setSearchParams(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Get tomorrow's date for checkout
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="bg-white rounded-xl shadow-lg p-6"
    >
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-0 md:flex md:items-end md:space-x-4">
        {/* Destination */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('hotels.search.destination')}
          </label>
          <div className="relative">
            <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchParams.destination}
              onChange={(e) => handleChange('destination', e.target.value)}
              placeholder={t('hotels.search.destinationPlaceholder')}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Check-in */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('hotels.checkIn')}
          </label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={searchParams.checkIn}
              min={today}
              onChange={(e) => handleChange('checkIn', e.target.value)}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Check-out */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('hotels.checkOut')}
          </label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              value={searchParams.checkOut}
              min={searchParams.checkIn || tomorrowStr}
              onChange={(e) => handleChange('checkOut', e.target.value)}
              className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        {/* Guests & Rooms */}
        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('hotels.guests')}
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={searchParams.guests}
                onChange={(e) => handleChange('guests', parseInt(e.target.value))}
                className="w-full pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <option key={num} value={num}>
                    {num} {num === 1 ? t('hotels.guest') : t('hotels.guests')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('hotels.rooms')}
            </label>
            <select
              value={searchParams.rooms}
              onChange={(e) => handleChange('rooms', parseInt(e.target.value))}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            >
              {[1, 2, 3, 4].map(num => (
                <option key={num} value={num}>
                  {num} {num === 1 ? t('hotels.room') : t('hotels.rooms')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <div>
          <button
            type="submit"
            className="w-full md:w-auto px-8 py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center space-x-2"
          >
            <MagnifyingGlassIcon className="h-5 w-5" />
            <span>{t('hotels.search.button')}</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
};
