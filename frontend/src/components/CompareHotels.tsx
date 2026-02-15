import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatTextWithNumbers } from '../utils/numberFormatter';
import {
  XMarkIcon,
  CheckIcon,
  MapPinIcon,
  StarIcon as StarOutline,
  WifiIcon,
  BuildingOffice2Icon,
  SparklesIcon,
  TrashIcon,
  CurrencyDollarIcon,
  HandThumbUpIcon
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import { Hotel } from '../types/hotel';

interface CompareHotelsProps {
  hotels: Hotel[];
  onClose: () => void;
  onRemove: (hotelId: string) => void;
  currencySymbol: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}

export const CompareHotels: React.FC<CompareHotelsProps> = ({
  hotels,
  onClose,
  onRemove,
  currencySymbol,
  checkIn,
  checkOut,
  adults,
  children = 0
}) => {
  const { t, i18n } = useTranslation();

  // Features to compare
  const features = [
    { key: 'price', label: t('compare.pricePerNight', 'Price/Night'), icon: CurrencyDollarIcon },
    { key: 'rating', label: t('compare.guestRating', 'Guest Rating'), icon: HandThumbUpIcon },
    { key: 'stars', label: t('compare.starRating', 'Star Rating'), icon: StarOutline },
    { key: 'location', label: t('compare.location', 'Location'), icon: MapPinIcon },
    // Amenities handled separately at the bottom usually for better spacing
  ];

  const renderStars = (count: number) => {
    return [...Array(5)].map((_, i) => (
      <StarIcon
        key={i}
        className={`w-4 h-4 ${i < count ? 'text-yellow-400' : 'text-gray-200'}`}
      />
    ));
  };

  const getFeatureValue = (hotel: Hotel, key: string) => {
    switch (key) {
      case 'price':
        return hotel.price ? (
          <div className="flex flex-col items-center w-full min-w-0">
            <span className="text-xl md:text-2xl font-bold text-orange-600 truncate max-w-full">{currencySymbol}{hotel.price.toFixed(0)}</span>
            <span className="text-[10px] md:text-xs text-gray-500">{t('compare.perNight', 'per night')}</span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">{t('compare.checkAvailability', 'Check Availability')}</span>
        );
      case 'rating':
        return hotel.reviewScore ? (
          <div className="flex flex-col items-center w-full min-w-0">
            <span className={`text-base md:text-lg font-bold px-2 py-0.5 md:px-3 md:py-1 rounded ${
              hotel.reviewScore >= 9 ? 'bg-green-100 text-green-700' :
              hotel.reviewScore >= 8 ? 'bg-blue-100 text-blue-700' :
              hotel.reviewScore >= 7 ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {formatNumber(hotel.reviewScore, i18n.language === 'ar')}
            </span>
            <span className="text-[10px] md:text-xs text-gray-500 mt-1 truncate max-w-full">
              {formatTextWithNumbers(`${hotel.reviewCount} ${t('compare.reviews', 'reviews')}`, i18n.language === 'ar')}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 text-sm">{t('compare.noReviews', 'No reviews')}</span>
        );
      case 'stars':
        return (
          <div className="flex items-center justify-center gap-0.5">
            {renderStars(hotel.star_rating || hotel.rating || 0)}
          </div>
        );
      case 'location':
        return (
          <div className="flex flex-col items-center w-full min-w-0">
             <span className="text-xs md:text-sm text-gray-700 text-center line-clamp-2 md:line-clamp-3" title={hotel.address || hotel.city || ''}>
                {hotel.address || hotel.city || '-'}
             </span>
          </div>
        );
      default:
        return '-';
    }
  };

  // Find best value for comparison highlighting
  const getBestValue = (key: string) => {
    const validHotels = hotels.filter(h => {
      if (key === 'price') return h.price && h.price > 0;
      if (key === 'rating') return h.reviewScore && h.reviewScore > 0;
      // For stars, we just compare usually
      return true;
    });

    if (validHotels.length === 0) return null;

    switch (key) {
      case 'price':
        return Math.min(...validHotels.map(h => h.price || Infinity));
      case 'rating':
        return Math.max(...validHotels.map(h => h.reviewScore || 0));
      case 'stars':
        return Math.max(...validHotels.map(h => h.star_rating || h.rating || 0));
      default:
        return null;
    }
  };

  const isBestValue = (hotel: Hotel, key: string) => {
    const best = getBestValue(key);
    if (best === null) return false;

    switch (key) {
      case 'price':
        return hotel.price === best;
      case 'rating':
        return hotel.reviewScore === best;
      case 'stars':
        return (hotel.star_rating || hotel.rating || 0) === best;
      default:
        return false;
    }
  };

  if (hotels.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white z-20">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BuildingOffice2Icon className="w-6 h-6 text-orange-600" />
              {t('compare.compareHotels', 'Compare Hotels')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{hotels.length} {t('compare.hotelsSelected', 'hotels selected')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content Container - Scrollable */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50">
          <div className="p-4 sm:p-6 pb-24 sm:pb-6">

             {/* Grid Layout Container */}
             <div className="min-w-0">

                {/* Header Row (Images & Names) */}
                 <div className="md:grid flex gap-4 md:gap-0" style={{ gridTemplateColumns: `200px repeat(${hotels.length}, 1fr)` }}>
                    {/* Desktop Spacer */}
                    <div className="hidden md:block p-4"></div>

                    {/* Hotel Headers */}
                    {hotels.map((hotel) => (
                      <div key={hotel.id || hotel.hid} className="flex-1 min-w-0 p-2 md:p-4 text-center relative group/card">

                          {/* Remove Button */}
                          <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(hotel.id || String(hotel.hid));
                            }}
                            className="absolute top-4 right-4 z-10 p-1.5 bg-white/90 text-gray-500 hover:text-red-500 hover:bg-white rounded-full shadow-sm transition-colors opacity-100 md:opacity-0 group-hover/card:opacity-100"
                            title={t('compare.remove', 'Remove')}
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>

                          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 shadow-sm mb-3">
                             <img
                                src={hotel.image || hotel.images?.[0] || '/placeholder-hotel.jpg'}
                                alt={hotel.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/placeholder-hotel.jpg';
                                }}
                             />
                             {isBestValue(hotel, 'price') && (
                                <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg uppercase tracking-wider">
                                  {t('common:hotels.bestPrice', 'Best Price')}
                                </div>
                             )}
                          </div>
                          <h3 className="font-bold text-gray-900 text-sm md:text-lg leading-snug line-clamp-2 md:line-clamp-none mb-1" title={hotel.name}>
                            {hotel.name}
                          </h3>
                      </div>
                    ))}
                 </div>

                {/* Feature Rows */}
                <div className="divide-y divide-gray-100">
                  {features.map((feature) => (
                    <div
                      key={feature.key}
                      className="flex flex-col md:grid py-3 md:py-0 transition-colors hover:bg-gray-50/50"
                      style={{ gridTemplateColumns: `200px repeat(${hotels.length}, 1fr)` }}
                    >
                      {/* Label */}
                      <div className="flex items-center gap-2 px-2 md:p-4 md:border-r border-transparent md:border-gray-50 mb-2 md:mb-0">
                         {feature.icon && <feature.icon className="w-5 h-5 text-gray-400 shrink-0" />}
                         <span className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">{feature.label}</span>
                      </div>

                      {/* Values */}
                      <div
                        className="grid md:contents gap-4 md:gap-0 px-2 md:px-0"
                        style={{ gridTemplateColumns: `repeat(${hotels.length}, 1fr)` }}
                      >
                          {hotels.map((hotel) => (
                            <div
                              key={`${hotel.id || hotel.hid}-${feature.key}`}
                              className={`md:p-4 text-center flex items-center justify-center md:border-l border-transparent md:border-gray-50 ${
                                 isBestValue(hotel, feature.key) && feature.key === 'price' ? 'relative' : ''
                              }`}
                            >
                               {getFeatureValue(hotel, feature.key)}
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}

                   {/* Amenities Row */}
                   <div className="flex flex-col md:grid py-3 md:py-0" style={{ gridTemplateColumns: `200px repeat(${hotels.length}, 1fr)` }}>
                      <div className="flex items-center gap-2 px-2 md:p-4 md:border-r border-transparent md:border-gray-50 mb-2 md:mb-0">
                          <WifiIcon className="w-5 h-5 text-gray-400 shrink-0" />
                          <span className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide">{t('compare.topAmenities', 'Top Amenities')}</span>
                      </div>
                      <div
                        className="grid md:contents gap-4 md:gap-0 px-2 md:px-0"
                        style={{ gridTemplateColumns: `repeat(${hotels.length}, 1fr)` }}
                      >
                         {hotels.map((hotel) => (
                           <div key={`amenities-${hotel.id || hotel.hid}`} className="md:p-4 md:border-l border-transparent md:border-gray-50 flex justify-center">
                             <div className="flex flex-wrap gap-1.5 content-start justify-center">
                                {(hotel.amenities?.slice(0, 4) || []).map((amenity, i) => (
                                   <span key={i} className="text-[10px] md:text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md border border-gray-200 truncate max-w-full">
                                     {amenity}
                                   </span>
                                ))}
                                {!hotel.amenities?.length && <span className="text-gray-400 text-xs">-</span>}
                             </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Action Buttons Row */}
                   <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 z-10 md:static md:p-0 md:border-t-0 md:bg-transparent">
                      <div className="md:grid flex gap-4 md:gap-0" style={{ gridTemplateColumns: `200px repeat(${hotels.length}, 1fr)` }}>
                         <div className="hidden md:block"></div>
                         {hotels.map((hotel) => (
                            <div key={`action-${hotel.id || hotel.hid}`} className="flex-1 md:p-4 md:border-l border-transparent md:border-gray-50 min-w-0">
                               <Link
                                  to={`/hotels/details/${hotel.hid || hotel.id}?destination=${encodeURIComponent(hotel.city || '')}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`}
                                  className="w-full py-3 px-2 bg-gray-900 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform active:scale-95 flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 text-sm md:text-base truncate"
                                >
                                  <span>{t('compare.viewDetails', 'View')}</span>
                                  {hotel.price && (
                                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px] md:text-xs">
                                       {currencySymbol}{hotel.price.toFixed(0)}
                                    </span>
                                  )}
                               </Link>
                            </div>
                         ))}
                      </div>
                   </div>

                </div>
             </div>

          </div>
        </div>
      </div>
    </div>
  );
};

// Floating comparison bar component
export const CompareBar: React.FC<{
  count: number;
  onCompare: () => void;
  onClear: () => void;
}> = ({ count, onCompare, onClear }) => {
  const { t } = useTranslation();

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom duration-300 border border-white/10">
      <div className="flex items-center gap-3">
         <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-xs font-bold">
           {count}
         </span>
         <span className="font-medium text-sm">
           {t('compare.hotelsSelected', 'hotels selected')}
         </span>
      </div>

      <div className="h-4 w-px bg-white/20"></div>

      <div className="flex items-center gap-3">
        <button
          onClick={onCompare}
          disabled={count < 2}
          className={`font-semibold text-sm transition-colors ${count >= 2 ? 'text-orange-400 hover:text-orange-300' : 'text-gray-500 cursor-not-allowed'}`}
        >
          {t('compare.compare', 'Compare Now')}
        </button>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          {t('compare.clear', 'Clear')}
        </button>
      </div>
    </div>
  );
};
