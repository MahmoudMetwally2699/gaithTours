
import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { StarIcon } from '@heroicons/react/24/solid';
import { Hotel } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

interface HotelCardProps {
  hotel: Hotel & {
    price?: number;
    pricePerNight?: number;
    nights?: number;
    currency?: string;
    total_taxes?: number;
    taxes_currency?: string;
    reviewCount?: number;
    reviewScoreWord?: string;
  };
  onBook: () => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onBook }) => {
  const { t } = useTranslation();
  const { currency: globalCurrency } = useCurrency();

  // Helper to format currency - use hotel currency if available, else global
  const formatPrice = (price?: number, currency?: string) => {
    if (!price || price <= 0) return null;
    const currencyToUse = currency || globalCurrency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyToUse,
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
      className="bg-white rounded-2xl md:rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col h-full group cursor-pointer"
      onClick={onBook}
    >
      {/* Image Container */}
      <div className="relative h-32 sm:h-36 md:h-40 w-full bg-gray-100">
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

        {/* Rating Badge */}
        {typeof hotel.rating === 'number' && hotel.rating > 0 && (
          <div className="absolute -bottom-4 md:-bottom-5 right-3 md:right-4 bg-[#FF8C00] text-white rounded-xl w-9 h-9 md:w-11 md:h-11 flex flex-col items-center justify-center shadow-md z-10">
            <span className="text-sm md:text-base font-bold leading-none">
              {Math.min(hotel.rating, 10).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-5 md:pt-6 pb-3 md:pb-4 px-3 md:px-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1 md:mb-2">
          <div className="flex-1 min-w-0">
             <div className="flex justify-end mb-1">
                <div className="text-right text-[10px] sm:text-xs text-gray-500 w-full flex flex-col items-end mr-0.5 md:mr-1">
                    {hotel.reviewCount && <span className="truncate">{hotel.reviewCount} reviews</span>}
                    <span className="font-medium truncate">{getScoreWord(hotel.rating)}</span>
                 </div>
             </div>

            <h3 className="text-sm sm:text-base font-bold text-[#FF8C00] truncate pr-1 md:pr-2">
              {hotel.name}
            </h3>

            {/* Stars */}
            <div className="flex items-center mt-0.5 md:mt-1">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`h-3 w-3 md:h-4 md:w-4 ${i < ((hotel as any).star_rating || Math.round((hotel.rating || 0) / 2)) ? 'text-[#eec85a]' : 'text-gray-200'}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Address */}
        <p className="text-gray-400 text-[10px] sm:text-xs mt-0.5 md:mt-1 line-clamp-2 mb-1 md:mb-2">
          {hotel.address || hotel.city}
        </p>

        {/* Price Section */}
        <div className="mt-auto flex justify-end items-baseline pt-2 md:pt-3 border-t border-gray-50">
           {(hotel.pricePerNight && hotel.pricePerNight > 0) ? (
             <>
               <span className="text-base sm:text-lg font-bold text-gray-800">
                 {formatPrice(hotel.pricePerNight, hotel.currency)}
               </span>
               <span className="text-gray-400 text-[10px] sm:text-xs ml-0.5 md:ml-1">{t('hotels.perNight', '/night')}</span>
             </>
           ) : (hotel.price && hotel.price > 0 && formatPrice(hotel.price, hotel.currency)) ? (
             <>
               <span className="text-gray-400 text-[10px] sm:text-xs mr-0.5 md:mr-1">{t('hotels.from', 'From')}</span>
               <span className="text-base sm:text-lg font-bold text-gray-800">
                 {formatPrice(hotel.price, hotel.currency)}
               </span>
             </>
           ) : (
             <span className="text-primary-600 font-medium text-xs sm:text-sm">
               {t('hotels.viewDetails', 'View Details')}
             </span>
           )}
        </div>
      </div>
    </motion.div>
  );
};
