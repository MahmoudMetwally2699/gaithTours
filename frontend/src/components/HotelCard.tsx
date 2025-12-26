import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StarIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { Hotel } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface HotelCardProps {
  hotel: Hotel;
  onBook: () => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onBook }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();

  const handleBookClick = () => {
    // Allow all users (guest and authenticated) to proceed with booking
    onBook();
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300"
    >
      {/* Hotel Image */}      <div className="relative h-56 overflow-hidden">        <img
          src={hotel.image || '/placeholder-hotel.jpg'}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>

      {/* Hotel Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-xl font-bold text-gray-900 flex-1 line-clamp-2">
            {hotel.name}
          </h3>
          <div className="flex items-center ml-2">
            <StarIcon className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-gray-600 ml-1">{hotel.rating}</span>
          </div>
        </div>        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPinIcon className="h-4 w-4 mr-1" />
          {hotel.address}, {hotel.city}
        </div>

        <p className="text-gray-600 mb-4 text-sm leading-relaxed line-clamp-2">
          {hotel.description || 'No description available'}
        </p>        {/* Book Button */}
        <div className="flex justify-end">
          <button
            onClick={handleBookClick}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
          >
            {t('hotels.bookNow')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};
