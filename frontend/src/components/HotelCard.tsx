
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon } from '@heroicons/react/24/solid';
import { Hotel } from '../services/api';
import { TripAdvisorRating } from '../services/tripadvisorService';

interface HotelCardProps {
  hotel: Hotel & {
    reviewCount?: number;
    reviewScoreWord?: string;
  };
  taRating?: TripAdvisorRating | null;
  onBook: () => void;
}

export const HotelCard: React.FC<HotelCardProps> = React.memo(({ hotel, taRating, onBook }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

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

            {/* Hotel name */}
            <h3
              className="text-sm sm:text-base font-bold text-[#FF8C00] pr-1 md:pr-2 overflow-hidden"
              style={{
                direction: isRTL && (hotel as any).nameAr ? 'rtl' : 'ltr',
                textAlign: isRTL && (hotel as any).nameAr ? 'right' : 'left',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                lineHeight: '1.3',
                maxHeight: '2.6em',
              }}
              title={(isRTL && (hotel as any).nameAr) ? (hotel as any).nameAr : hotel.name}
            >
              {(isRTL && (hotel as any).nameAr) ? (hotel as any).nameAr : hotel.name}
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

        {/* CTA Section - No prices, just a call to action */}
        <div className="mt-auto flex flex-col pt-2 md:pt-3 border-t border-gray-50">
          <div className="flex justify-end items-center">
            <span className="text-[#FF8C00] font-semibold text-xs sm:text-sm group-hover:underline">
              {t('hotels.viewPrices', 'View Prices')}
            </span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FF8C00] ltr:ml-1 rtl:mr-1 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});
