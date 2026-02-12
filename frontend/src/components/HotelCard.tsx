
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/24/solid';
import { Hotel } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { TripAdvisorRating } from '../services/tripadvisorService';

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
  taRating?: TripAdvisorRating | null;
  onBook: () => void;
}

export const HotelCard: React.FC<HotelCardProps> = React.memo(({ hotel, taRating, onBook }) => {
  const { t, i18n } = useTranslation();
  const { currency: globalCurrency } = useCurrency();
  const isRTL = i18n.language === 'ar';

  // Helper to format currency - use Arabic locale when in Arabic mode
  const formatPrice = (price?: number, currency?: string) => {
    if (!price || price <= 0) return null;
    const currencyToUse = currency || globalCurrency || 'USD';
    const locale = isRTL ? 'ar-EG' : 'en-US';
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyToUse,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Use TripAdvisor rating if available, fallback to hotel.rating
  const displayRating = taRating?.rating ? taRating.rating : hotel.rating;
  const displayReviewCount = taRating?.num_reviews ? Number(taRating.num_reviews) : hotel.reviewCount;

  // Helper for score word - translated (TripAdvisor uses 1-5, hotel uses 1-10)
  const getScoreWord = (rating?: number) => {
    if (!rating) return '';
    // TripAdvisor scale (1-5)
    if (taRating?.rating) {
      // TA rating already converted to 10-point scale
      if (rating >= 9) return t('hotels.wonderful', 'Wonderful');
      if (rating >= 8) return t('hotels.veryGood', 'Very Good');
      if (rating >= 7) return t('hotels.good', 'Good');
      return t('hotels.pleasant', 'Pleasant');
    }
    // Original scale (1-10)
    if (rating >= 9) return t('hotels.wonderful', 'Wonderful');
    if (rating >= 8) return t('hotels.veryGood', 'Very Good');
    if (rating >= 7) return t('hotels.good', 'Good');
    return t('hotels.pleasant', 'Pleasant');
  };

  return (
    <div
      className="bg-white rounded-2xl md:rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 flex flex-col h-full group cursor-pointer hover:-translate-y-1"
      onClick={onBook}
    >
      {/* Image Container */}
      <div className="relative h-32 sm:h-36 md:h-40 w-full bg-gray-100">
        <img
          src={hotel.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'}
          alt={hotel.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
          }}
        />

        {/* Rating Badge - uses TripAdvisor rating when available */}
        {typeof displayRating === 'number' && displayRating > 0 && (
          <div className="absolute -bottom-4 md:-bottom-5 right-3 md:right-4 bg-[#FF8C00] text-white rounded-xl w-9 h-9 md:w-11 md:h-11 flex flex-col items-center justify-center shadow-md z-10">
            <span className="text-sm md:text-base font-bold leading-none">
              {taRating?.rating
                ? (taRating.rating * 2).toFixed(1)
                : Math.min(hotel.rating || 0, 10).toFixed(1)
              }
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="pt-5 md:pt-6 pb-3 md:pb-4 px-3 md:px-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1 md:mb-2">
          <div className="flex-1 min-w-0">
             {/* Review info - positioned for LTR always to stay near rating badge */}
             <div className="flex justify-end mb-1">
                <div className="text-[10px] sm:text-xs text-gray-500 flex flex-col items-end ltr:mr-0.5 ltr:md:mr-1 rtl:ml-0.5 rtl:md:ml-1" style={{ direction: 'ltr', textAlign: 'right' }}>
                    {displayReviewCount && <span className="truncate">{t('hotels.reviewCount', '{{count}} reviews', { count: displayReviewCount })}</span>}
                    <span className="font-medium truncate">{getScoreWord(displayRating)}</span>
                 </div>
             </div>

            {/* Hotel name - fix RTL truncation */}
            <h3
              className="text-sm sm:text-base font-bold text-[#FF8C00] truncate pr-1 md:pr-2"
              style={{ direction: 'ltr', textAlign: 'start' }}
            >
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
        <div className="mt-auto flex flex-col pt-2 md:pt-3 border-t border-gray-50">
          <div className="flex justify-end items-baseline">
           {(hotel.pricePerNight && hotel.pricePerNight > 0) ? (
             <>
               <span className="text-base sm:text-lg font-bold text-gray-800 font-price">
                 {formatPrice(hotel.pricePerNight, hotel.currency)}
               </span>
               <span className="text-gray-400 text-[10px] sm:text-xs ml-0.5 md:ml-1">{t('hotels.perNight', '/night')}</span>
             </>
           ) : (hotel.price && hotel.price > 0 && formatPrice(hotel.price, hotel.currency)) ? (
             <>
               <span className="text-gray-400 text-[10px] sm:text-xs ltr:mr-1 ltr:md:mr-1.5 rtl:ml-1 rtl:md:ml-1.5">{t('hotels.from', 'From')}</span>
               <span className="text-base sm:text-lg font-bold text-gray-800 font-price">
                 {formatPrice(hotel.price, hotel.currency)}
               </span>
             </>
           ) : (
             <span className="text-primary-600 font-medium text-xs sm:text-sm">
               {t('hotels.viewDetails', 'View Details')}
             </span>
           )}
          </div>
          {/* Taxes Display */}
          {hotel.total_taxes && hotel.total_taxes > 0 && (
            <div className="flex justify-end mt-0.5">
              <span className="text-gray-400 text-[9px] sm:text-[10px]">
                + {formatPrice(hotel.total_taxes, hotel.taxes_currency || hotel.currency)} {t('hotels.taxesAndFees', 'taxes and fees')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
