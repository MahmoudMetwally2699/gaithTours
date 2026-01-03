
import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { StarIcon } from '@heroicons/react/24/solid';
import { Hotel } from '../services/api';

interface HotelCardProps {
  hotel: Hotel & {
    price?: number;
    currency?: string;
    reviewCount?: number;
    reviewScoreWord?: string;
  };
  onBook: () => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onBook }) => {
  const { t } = useTranslation();

  // Helper to format currency
  const formatPrice = (price?: number, currency?: string) => {
    if (!price || price <= 0) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Helper for score word
  const getScoreWord = (rating?: number) => {
    if (!rating) return '';
    if (rating >= 9) return 'Wonderful';
    if (rating >= 8) return 'Very Good';
    if (rating >= 7) return 'Good';
    return 'Pleasant';
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col h-full group cursor-pointer"
      onClick={onBook}
    >
      {/* Image Container */}
      <div className="relative h-64 w-full bg-gray-100">
        <img
          src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
          alt={hotel.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Rating Badge (Overlapping) */}
        {hotel.rating && (
          <div className="absolute -bottom-6 right-6 bg-[#FF8C00] text-white rounded-xl w-14 h-14 flex flex-col items-center justify-center shadow-md z-10">
            <span className="text-xl font-bold leading-none">{hotel.rating}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-8 pb-6 px-6 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          {/* Title and Reviews (Desktop Layout fix) */}
          <div className="flex-1 min-w-0">
             <div className="flex justify-end mb-1">
                {/* Review Info aligned with badge */}
                 <div className="text-right text-xs text-gray-500 w-full flex flex-col items-end mr-1">
                    {hotel.reviewCount && <span>{hotel.reviewCount} reviews</span>}
                    <span className="font-medium">{getScoreWord(hotel.rating)}</span>
                 </div>
             </div>

            <h3 className="text-xl font-bold text-[#FF8C00] truncate pr-2">
              {hotel.name}
            </h3>

            {/* Stars */}
            <div className="flex items-center mt-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-5 w-5 ${i < (hotel.rating ? Math.round(hotel.rating / 2) : 0) ? 'text-[#eec85a]' : 'text-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Address */}
        <p className="text-gray-400 text-sm mt-2 line-clamp-2 mb-4">
          {hotel.address || hotel.city}
        </p>

        {/* Price Section */}
        <div className="mt-auto flex justify-end items-baseline pt-4 border-t border-gray-50">
           {hotel.price && hotel.price > 0 && formatPrice(hotel.price, hotel.currency) ? (
             <>
               <span className="text-gray-400 text-sm mr-2">{t('hotels.from', 'From')}</span>
               <span className="text-2xl font-bold text-gray-800">
                 {formatPrice(hotel.price, hotel.currency)}
               </span>
             </>
           ) : (
             <span className="text-primary-600 font-medium text-sm">
               {t('hotels.viewDetails', 'View Details')}
             </span>
           )}
        </div>
      </div>
    </motion.div>
  );
};
