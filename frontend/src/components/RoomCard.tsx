import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserGroupIcon,
  WifiIcon,
  NoSymbolIcon,
  CheckIcon,
  InformationCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';

// Types from existing codebase or API
interface BedGroup {
  beds: Array<{
    type: string;
    count: number;
  }>;
}

interface TaxItem {
  name: string;
  amount: number;
  currency: string;
  included: boolean;
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  bed_groups?: BedGroup[];
  room_size?: number;
  max_occupancy?: number;
  room_amenities?: string[];
  meal?: string; // 'breakfast', 'nomeal', 'half-board', 'full-board', 'all-inclusive'
  meal_data?: {
    breakfast_included?: boolean;
    meal_type?: string;
  };
  price: number;
  original_price?: number;
  currency: string;
  total_taxes?: number; // Total taxes to display separately (Booking.com style)
  taxes_currency?: string; // Currency for taxes
  is_free_cancellation?: boolean;
  requires_prepayment?: boolean;
  requires_credit_card?: boolean;
  room_images?: string[];
  room_image_count?: number;
  taxes?: TaxItem[];
  tax_data?: {
    taxes?: TaxItem[];
  };
  cancellation_details?: any;
  daily_prices?: string[];
}

interface RoomCardProps {
  roomType: string;
  rates: RoomRate[];
  onSelectResult: (rate: RoomRate, count: number) => void;
  selectedRates: Map<string, number>; // match_hash -> count
}

export const RoomCard: React.FC<RoomCardProps> = ({
  roomType,
  rates,
  onSelectResult,
  selectedRates
}) => {
  const { t } = useTranslation();
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  // Base room details from the first rate (assuming consistent per room type)
  const baseRate = rates[0];

  // Helper to generate a unique key for rate distinct features
  const getRateFeaturesKey = (rate: RoomRate) => {
    return JSON.stringify({
      name: rate.room_name, // Include name so different bed types are distinct choices
      meal: rate.meal, // Use meal field for grouping
      cancellation: rate.is_free_cancellation,
      prepayment: rate.requires_prepayment,
    });
  };

  // Helper to get meal label and icon
  const getMealInfo = (meal?: string) => {
    if (!meal || meal === 'nomeal') {
      return { label: t('hotels.roomOnly', 'Room only'), icon: '⊘', color: 'text-gray-500' };
    }
    switch (meal.toLowerCase()) {
      case 'breakfast':
        return { label: t('hotels.breakfastIncluded', 'Breakfast included'), icon: '🍳', color: 'text-green-700' };
      case 'half-board':
        return { label: t('hotels.halfBoard', 'Half Board'), icon: '🍽️', color: 'text-green-700' };
      case 'full-board':
        return { label: t('hotels.fullBoard', 'Full Board'), icon: '🍽️', color: 'text-green-700' };
      case 'all-inclusive':
        return { label: t('hotels.allInclusive', 'All Inclusive'), icon: '🌟', color: 'text-green-700' };
      default:
        return { label: meal, icon: '🍽️', color: 'text-green-700' };
    }
  };

  // Filter rates to show only the lowest price for each unique set of features
  const uniqueRates = React.useMemo(() => {
    const groupedByFeatures = new Map<string, RoomRate>();

    rates.forEach(rate => {
      const key = getRateFeaturesKey(rate);
      const existing = groupedByFeatures.get(key);

      if (!existing || Number(rate.price) < Number(existing.price)) {
        groupedByFeatures.set(key, rate);
      }
    });

    return Array.from(groupedByFeatures.values());
  }, [rates]);

  // Sort rates by price (lowest first)
  const sortedRates = [...uniqueRates].sort((a, b) => Number(a.price) - Number(b.price));
  const bestPriceRate = sortedRates[0];

  // Helper to render bed info
  const renderBeds = () => {
    if (!baseRate.bed_groups || baseRate.bed_groups.length === 0) return null;
    return baseRate.bed_groups.map((group, i) => (
      <div key={i} className="flex items-center text-gray-700 text-sm mb-1">
        <span className="mr-2">🛏️</span>
        {group.beds.map((bed, j) => (
          <span key={j}>
            {bed.count} {bed.type}
            {j < group.beds.length - 1 ? ', ' : ''}
          </span>
        ))}
      </div>
    ));
  };

  // Helper for amenities icons
  const renderAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <WifiIcon className="w-4 h-4 mr-1" />;
    if (lower.includes('smoking')) return <NoSymbolIcon className="w-4 h-4 mr-1" />;
    if (lower.includes('condition')) return <span className="mr-1">❄️</span>;
    return <CheckIcon className="w-4 h-4 mr-1" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6 shadow-sm hover:shadow-md transition-shadow">
      {/* Room Name Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-xl font-bold text-gray-800">{roomType}</h3>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Left Side: Room Image & Details */}
        <div className="lg:w-1/3 p-4 border-r border-gray-100">
          <div
            className="relative h-48 rounded-lg overflow-hidden mb-4 bg-gray-100 cursor-pointer group"
            onClick={() => setShowDetailsModal(true)}
          >
            {baseRate.room_images && baseRate.room_images[0] ? (
              <img
                src={baseRate.room_images[0].replace('170x154', '640x400')}
                alt={roomType}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                onError={(e) => {
                   e.currentTarget.src = '/placeholder-room.jpg';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-4xl">🛏️</span>
              </div>
            )}
            <button className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
              {baseRate.room_images?.length || 0} {t('common.photos', 'photos')}
            </button>
          </div>

          <div className="space-y-2">
            {renderBeds()}

            {baseRate.room_size && (
              <div className="flex items-center text-gray-700 text-sm">
                <span className="mr-2">📐</span>
                {baseRate.room_size} m²
              </div>
            )}

            <div className="flex flex-wrap gap-2 mt-3 text-sm text-gray-600">
              {baseRate.room_amenities?.slice(0, 5).map((amenity, idx) => (
                <div key={idx} className="flex items-center">
                  {renderAmenityIcon(amenity)}
                  <span className="capitalize">{amenity}</span>
                </div>
              ))}
            </div>

            {/* Modal for Room Details */}
            {showDetailsModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}>
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn scale-105" onClick={e => e.stopPropagation()}>
                     <div className="relative h-64">
                         {baseRate.room_images && baseRate.room_images.length > 0 ? (
                           <>
                             <img
                               src={baseRate.room_images[currentImageIndex]?.replace('170x154', '640x400')}
                               alt={`${roomType} - Image ${currentImageIndex + 1}`}
                               className="w-full h-full object-cover"
                             />
                             {baseRate.room_images.length > 1 && (
                               <>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setCurrentImageIndex(prev => prev === 0 ? baseRate.room_images!.length - 1 : prev - 1);
                                   }}
                                   className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                                 >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                   </svg>
                                 </button>
                                 <button
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setCurrentImageIndex(prev => prev === baseRate.room_images!.length - 1 ? 0 : prev + 1);
                                   }}
                                   className="absolute right-12 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
                                 >
                                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                   </svg>
                                 </button>
                                 <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full z-10">
                                   {currentImageIndex + 1} / {baseRate.room_images.length}
                                 </div>
                               </>
                             )}
                           </>
                         ) : (
                           <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                             <span className="text-4xl">🛏️</span>
                           </div>
                         )}
                         <button
                           onClick={() => setShowDetailsModal(false)}
                           className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
                         >
                            <XMarkIcon className="w-6 h-6" />
                         </button>
                         <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                            <h3 className="text-xl font-bold text-white mb-1">{roomType}</h3>
                            <p className="text-white/80 text-sm">{baseRate.room_size} m²</p>
                         </div>
                     </div>

                     <div className="p-6">
                        <h4 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">{t('hotels.roomAmenities', 'Room Amenities')}</h4>
                        <div className="grid grid-cols-2 gap-4">
                           {baseRate.room_amenities?.map((amenity, idx) => (
                             <div key={idx} className="flex items-center text-gray-600 text-sm">
                               {renderAmenityIcon(amenity)}
                               <span className="ml-2 capitalize">{amenity}</span>
                             </div>
                           ))}
                        </div>

                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                           <button
                              onClick={() => setShowDetailsModal(false)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors"
                           >
                              {t('common.close', 'Close')}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}

            <button
              onClick={() => setShowDetailsModal(true)}
              className="text-orange-500 text-sm font-medium hover:underline mt-4 flex items-center"
            >
              <InformationCircleIcon className="w-4 h-4 mr-1" />
              {t('hotels.roomDetails', 'Room Details')}
            </button>
          </div>
        </div>

        {/* Right Side: Rate Options Table */}
        <div className="lg:w-2/3">
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-orange-500 text-white py-3 px-4 font-semibold text-sm">
              <div className="col-span-12 md:col-span-5">{t('hotels.yourChoices', 'Your choices')}</div>
              <div className="col-span-6 md:col-span-2 text-center">{t('hotels.sleeps', 'Sleeps')}</div>
              <div className="col-span-6 md:col-span-5 text-right">{t('hotels.pricePerNight', 'Price for 1 night')}</div>
            </div>

            {/* Rate Rows */}
            {sortedRates.map((rate, index) => {
              const isBestPrice = index === 0;
              const isSelected = selectedRates.get(rate.match_hash) || 0;
              const showSpecificName = rate.room_name !== roomType;

              return (
                <div key={rate.match_hash} className="grid grid-cols-12 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">

                  {/* Choices Column */}
                  <div className="col-span-12 md:col-span-5 p-4 border-r border-gray-100">
                    <div className="space-y-2">
                      {/* Show specific room variant name if different from group title */}
                      {showSpecificName && (
                        <div className="font-bold text-gray-800 text-sm mb-1">
                          {rate.room_name}
                        </div>
                      )}

                      {/* Meal info - now using actual meal field */}
                      {(() => {
                        const mealInfo = getMealInfo(rate.meal);
                        return (
                          <div className={`flex items-center font-medium text-sm ${mealInfo.color}`}>
                            <span className="mr-2">{mealInfo.icon}</span>
                            {mealInfo.label}
                          </div>
                        );
                      })()}

                      {rate.is_free_cancellation ? (
                        <div className="flex items-center text-green-700 font-medium text-sm">
                          <CheckIcon className="w-4 h-4 mr-2" />
                          {t('hotels.freeCancellation', 'Free cancellation')}
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600 text-sm">
                           <InformationCircleIcon className="w-4 h-4 mr-2" />
                           {t('hotels.nonRefundable', 'Non-refundable')}
                        </div>
                      )}

                      {!rate.requires_prepayment && (
                         <div className="flex items-center text-green-700 text-sm">
                           <CheckIcon className="w-4 h-4 mr-2" />
                           {t('hotels.payAtProperty', 'Pay at property')}
                         </div>
                      )}
                      {rate.requires_prepayment && (
                         <div className="flex items-center text-gray-600 text-sm">
                           <InformationCircleIcon className="w-4 h-4 mr-2" />
                           {t('hotels.payOnline', 'Pay online')}
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Sleeps Column */}
                  <div className="col-span-6 md:col-span-2 p-4 flex items-center justify-center border-r border-gray-100">
                     <div className="flex text-gray-700">
                        {[...Array(Math.min(rate.max_occupancy || 2, 4))].map((_, i) => (
                           <UserIcon key={i} className="w-5 h-5" />
                        ))}
                        {(rate.max_occupancy || 0) > 4 && <span className="text-sm ml-1">+{ (rate.max_occupancy || 0) - 4}</span>}
                     </div>
                  </div>

                  {/* Price & Action Column */}
                  <div className="col-span-6 md:col-span-5 p-4 relative">
                    {/* Best Price Badge */}
                    {isBestPrice && (
                       <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg shadow-sm">
                          {t('hotels.bestPrice', 'Best price!')}
                       </div>
                    )}

                    <div className="flex flex-col items-end h-full justify-between">
                      <div className="text-right mt-2">
                        {rate.original_price && Number(rate.price) < Number(rate.original_price) && (
                           <div className="text-xs text-red-500 line-through mb-1">
                              {rate.currency} {Number(rate.original_price).toFixed(0)}
                           </div>
                        )}
                        <div className="text-2xl font-bold text-gray-900 leading-none">
                           {rate.currency} {Number(rate.price).toFixed(0)}
                        </div>
                        {/* Tax display - Booking.com style: single line */}
                        {rate.total_taxes && rate.total_taxes > 0 ? (
                          <div className="text-xs text-gray-500 mt-1">
                            +{rate.taxes_currency || rate.currency} {rate.total_taxes} {t('hotels.taxesAndFees', 'taxes and fees')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">
                            {t('hotels.taxesIncluded', 'Taxes included')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-4 w-full justify-end">
                        <select
                           className="border border-gray-300 rounded px-2 py-2 text-sm focus:outline-none focus:border-orange-500"
                           value={isSelected}
                           onChange={(e) => onSelectResult(rate, parseInt(e.target.value))}
                        >
                           {[0, 1, 2, 3, 4, 5].map(num => (
                              <option key={num} value={num}>
                                 {num > 0 ? `${num} room${num > 1 ? 's' : ''}` : `${num} rooms`}
                                 {/* Using simple spacing for visually selecting 0 */}
                                  {num === 0 && ''}
                              </option>
                           ))}
                        </select>

                        {isSelected > 0 ? (
                           <button
                              onClick={() => { /* Navigation handled by parent state check or explicit button elsewhere */ }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors"
                           >
                              {t('common.selected', 'Selected')}
                           </button>
                        ) : (
                           <button
                              onClick={() => onSelectResult(rate, 1)}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded text-sm transition-colors shadow-sm"
                           >
                              {t('common.reserve', 'Reserve')}
                           </button>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
