import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  UserGroupIcon,
  WifiIcon,
  NoSymbolIcon,
  CheckIcon,
  InformationCircleIcon,
  XMarkIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import { LazyImage } from './LazyImage';

/**
 * RoomCard Component - Displays hotel room information with rates
 *
 * FEATURES IMPLEMENTED FOR RATEHAWK CERTIFICATION:
 *
 * ✅ Point 6: Tax Data Display (Lines 415-447)
 *    - Shows total taxes and fees below price
 *    - Hover tooltip with detailed tax breakdown
 *    - Displays each tax item (name, amount, included/excluded status)
 *
 * ✅ Point 7: Cancellation Policy with Date/Time (Lines 343-357)
 *    - Shows "Free cancellation" badge for refundable rates
 *    - Hover tooltip displays exact cancellation deadline
 *    - Format: "Until [Date] [Time]" from free_cancellation_before field
 *    - Shows "Non-refundable" for non-refundable rates
 *
 * Additional Features:
 *    - Meal type indicators (breakfast, half-board, full-board, all-inclusive)
 *    - Payment type (prepayment required or pay at property)
 *    - Room amenities and bed configuration
 *    - Multiple rate options per room type
 */

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
  currency_code?: string; // Raw API field name (some responses use this instead of currency)
  included: boolean;
  included_by_supplier?: boolean; // True = paid at booking, False = pay at hotel
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
  nights?: number; // Number of nights for the stay
  adults?: number; // Number of adults for occupancy validation
  children?: number; // Number of children for occupancy validation
  onToggleCompare?: (rate: RoomRate) => void;
  comparedRates?: Set<string>; // Set of match_hashes
}

export const RoomCard: React.FC<RoomCardProps> = ({
  roomType,
  rates,
  onSelectResult,
  selectedRates,
  nights = 1,
  adults = 2,
  children = 0,
  onToggleCompare,
  comparedRates
}) => {
  const { t, i18n } = useTranslation();
  const { currency, currencySymbol } = useCurrency();
  const [showDetailsModal, setShowDetailsModal] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);

  // Helper to format price with correct locale and currency
  const formatPrice = (price: number, currencyCode?: string, fractionDigits = 0) => {
    try {
      const targetCurrency = currencyCode || currency || 'USD';
      return new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
        style: 'currency',
        currency: targetCurrency,
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      }).format(price);
    } catch (e) {
      return `${currencySymbol} ${price.toFixed(fractionDigits)}`;
    }
  };

  // Calculate total guests for occupancy validation
  const totalGuests = adults + children;

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
// ...

  // Helper to get meal label and icon
  const getMealInfo = (meal?: string) => {
    if (!meal || meal === 'nomeal') {
      return { label: t('common:hotels.roomOnly', 'Room only'), icon: '⊘', color: 'text-gray-500' };
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

  // Helper to calculate occupancy compatibility
  // Per RateHawk API: max_occupancy = "main bed places without extra beds/cots"
  // Children typically use cots/extra beds, so we only count adults against max_occupancy
  const getOccupancyInfo = (rate: RoomRate, selectedCount: number) => {
    const maxOccupancy = rate.max_occupancy || 2;

    // Only count adults against main bed capacity (children use cots/extra beds)
    const roomsNeededForAdults = Math.ceil(adults / maxOccupancy);

    if (adults <= maxOccupancy) {
      // Single room can fit all adults (children on cots)
      return {
        fits: true,
        message: null,
        badge: { text: t('common:hotels.fitsYourGroup', 'Fits your group'), color: 'bg-green-100 text-green-700' },
        roomsNeeded: 1
      };
    } else if (selectedCount >= roomsNeededForAdults) {
      // Selected enough rooms for all adults
      return {
        fits: true,
        message: null,
        badge: { text: `${roomsNeededForAdults}+ ${t('hotels.roomsNeeded', 'rooms needed')}`, color: 'bg-blue-100 text-blue-700' },
        roomsNeeded: roomsNeededForAdults
      };
    } else {
      // Not enough rooms selected
      return {
        fits: false,
        message: t('hotels.selectMoreRooms', 'Select at least {{count}} rooms for {{guests}} adults', { count: roomsNeededForAdults, guests: adults }),
        badge: { text: `${roomsNeededForAdults} ${t('hotels.roomsNeeded', 'rooms needed')}`, color: 'bg-amber-100 text-amber-700' },
        roomsNeeded: roomsNeededForAdults
      };
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
    <div className="bg-white rounded-lg border border-gray-200 mb-6 shadow-sm hover:shadow-md transition-shadow">
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
              <LazyImage
                src={baseRate.room_images[0].replace('170x154', '640x400')}
                alt={roomType}
                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                objectFit="cover"
                sizes="(max-width: 1024px) 100vw, 33vw"
                onError={(e) => {
                   // Fallback will be handled by LazyImage component
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-4xl">🛏️</span>
              </div>
            )}
            <button className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
              {baseRate.room_images?.length || 0} {t('common:common.photos', 'photos')}
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
                             <LazyImage
                               src={baseRate.room_images[currentImageIndex]?.replace('170x154', '640x400')}
                               alt={`${roomType} - Image ${currentImageIndex + 1}`}
                               className="w-full h-full"
                               objectFit="cover"
                               priority={true}
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
                        <h4 className="font-bold text-gray-800 mb-4 text-lg border-b pb-2">{t('common:hotels.roomAmenities', 'Room Amenities')}</h4>
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
                              {t('common:common.close', 'Close')}
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
              {t('common:hotels.roomDetails', 'Room Details')}
            </button>
          </div>
        </div>

        {/* Right Side: Rate Options Table */}
        <div className="lg:w-2/3">
          <div className="w-full">
            {/* Table Header */}
            <div className="grid grid-cols-12 bg-orange-500 text-white py-3 px-4 font-semibold text-sm">
              <div className="col-span-12 md:col-span-5">{t('common:hotels.yourChoices', 'Your choices')}</div>
              <div className="col-span-6 md:col-span-2 text-center">{t('common:hotels.sleeps', 'Sleeps')}</div>
              <div className="col-span-6 md:col-span-5 text-right">
                {nights > 1
                  ? t('hotels.totalForNights', 'Total for {{nights}} nights', { nights })
                  : t('common:hotels.pricePerNight', 'Price for 1 night')}
              </div>
            </div>

            {/* Rate Rows */}
            {sortedRates.map((rate, index) => {
              const isBestPrice = index === 0;
              const isSelected = selectedRates.get(rate.match_hash) || 0;
              const showSpecificName = rate.room_name !== roomType;
              const occupancyInfo = getOccupancyInfo(rate, isSelected);

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
                        <div className="flex items-center text-green-700 font-medium text-sm group relative cursor-help">
                          <CheckIcon className="w-4 h-4 mr-2" />
                          <span className="border-b border-dotted border-green-700">
                             {t('hotels.freeCancellation', 'Free cancellation')}
                          </span>

                          {/* Cancellation Policy Tooltip */}
                          {/* Note: TypeScript interface might need update if 'free_cancellation_before' isn't defined yet */}
                          {(rate as any).free_cancellation_before && (
                             <div className="absolute bottom-full left-0 mb-2 w-48 bg-white shadow-lg rounded p-2 text-xs z-20 invisible group-hover:visible border border-gray-200 text-gray-700 font-normal">
                                Until {new Date((rate as any).free_cancellation_before).toLocaleDateString()} {new Date((rate as any).free_cancellation_before).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-600 text-sm">
                           <InformationCircleIcon className="w-4 h-4 mr-2" />
                           {t('common:hotels.nonRefundable', 'Non-refundable')}
                        </div>
                      )}

                      {!rate.requires_prepayment && (
                         <div className="flex items-center text-green-700 text-sm">
                           <CheckIcon className="w-4 h-4 mr-2" />
                           {t('common:hotels.payAtProperty', 'Pay at property')}
                         </div>
                      )}
                      {rate.requires_prepayment && (
                         <div className="flex items-center text-gray-600 text-sm">
                           <InformationCircleIcon className="w-4 h-4 mr-2" />
                           {t('common:hotels.payOnline', 'Pay online')}
                         </div>
                      )}
                    </div>
                  </div>

                  {/* Sleeps Column */}
                  <div className="col-span-6 md:col-span-2 p-4 flex flex-col items-center justify-end md:justify-center border-r border-gray-100 pb-7 md:pb-4">
                     <div className="flex text-gray-700 mb-1">
                        {[...Array(Math.min(rate.max_occupancy || 2, 4))].map((_, i) => (
                           <UserIcon key={i} className="w-5 h-5" />
                        ))}
                        {(rate.max_occupancy || 0) > 4 && <span className="text-sm ml-1">+{ (rate.max_occupancy || 0) - 4}</span>}
                     </div>
                     {/* Occupancy compatibility badge */}
                     <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-center ${occupancyInfo.badge.color}`}>
                        {occupancyInfo.badge.text}
                     </span>
                  </div>

                  {/* Price & Action Column */}
                  <div className="col-span-6 md:col-span-5 p-4 relative">
                    {/* Best Price Badge */}
                    {isBestPrice && (
                       <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg shadow-sm">
                          {t('common:hotels.bestPrice', 'Best price!')}
                       </div>
                    )}

                    <div className="flex flex-col items-end h-full justify-between">
                      <div className="text-right mt-2">
                        {rate.original_price && Number(rate.price) < Number(rate.original_price) && (
                           <div className="text-xs text-red-500 line-through mb-1">
                              {formatPrice(Number(rate.original_price))}
                           </div>
                        )}
                        <div className="text-2xl font-bold text-gray-900 leading-none font-price">
                           {formatPrice(Number(rate.price))}
                        </div>
                        {/* Per-night price if multiple nights */}
                        {nights > 1 && (
                          <div className="text-xs text-gray-600 mt-0.5">
                            ({formatPrice(Math.round(Number(rate.price) / nights))}{t('common:hotels.perNight', '/night')})
                          </div>
                        )}
                        {/* Tax display - Detailed breakdown with Pay at Booking vs Pay at Hotel */}
                        {rate.tax_data && rate.tax_data.taxes && rate.tax_data.taxes.length > 0 ? (
                          <div className="text-xs text-gray-500 mt-1 relative group cursor-help">
                            {(() => {
                              // Separate taxes by included_by_supplier
                              const allTaxes = rate.tax_data.taxes || [];
                              const paidAtBookingTaxes = allTaxes.filter((tax: TaxItem) => tax.included_by_supplier || tax.included);
                              const payAtHotelTaxes = allTaxes.filter((tax: TaxItem) => !tax.included_by_supplier && !tax.included);

                              const paidAtBookingTotal = paidAtBookingTaxes.reduce((sum: number, tax: TaxItem) => sum + Number(tax.amount || 0), 0);
                              const payAtHotelTotal = payAtHotelTaxes.reduce((sum: number, tax: TaxItem) => sum + Number(tax.amount || 0), 0);

                              // DEBUG: Log tax data received from API
                              console.log('🧾 RoomCard Tax Debug:', {
                                roomName: rate.room_name,
                                totalTaxes: rate.total_taxes,
                                individualTaxes: allTaxes.map((t: TaxItem) => ({ name: t.name, amount: t.amount })),
                                calculatedBookingTotal: paidAtBookingTotal,
                                calculatedHotelTotal: payAtHotelTotal
                              });

                              return (
                                <>
                                  <span className="border-b border-dotted border-gray-400">
                                    +{formatPrice(Math.round(rate.total_taxes || 0))} {t('common:hotels.taxesAndFees', 'taxes and fees')}
                                  </span>

                                  {/* Tax Breakdown Tooltip */}
                                  <div className="absolute bottom-full right-0 mb-2 w-80 bg-white shadow-2xl rounded-lg p-4 text-xs z-[9999] invisible group-hover:visible border border-gray-200 text-left">
                                    <h5 className="font-bold text-gray-800 mb-3 border-b pb-2 text-sm">{t('common:hotels.priceBreakdown', 'Price Breakdown')}</h5>

                                    <div className="flex justify-between mb-2 text-gray-700">
                                      <span>{t('common:hotels.basePrice', 'Base Price')}:</span>
                                      <span className="font-medium">{formatPrice(Number(rate.price), undefined, 2)}</span>
                                    </div>

                                    {/* Paid at Booking Section */}
                                    {paidAtBookingTaxes.length > 0 && (
                                      <div className="mb-3">
                                        <div className="text-green-700 font-semibold mb-1 flex items-center">
                                          <span className="mr-1">✓</span> {t('common:hotels.paidAtBooking', 'Paid at Booking')}:
                                        </div>
                                        <div className="flex justify-between ml-4 text-green-700 font-medium mt-0.5">
                                          <span>{t('common:hotels.taxesAndFees', 'Taxes and fees')}:</span>
                                          <span>+{formatPrice(paidAtBookingTotal, undefined, 2)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Pay at Hotel Section */}
                                    {payAtHotelTaxes.length > 0 && (
                                      <div className="mb-3">
                                        <div className="text-orange-600 font-semibold mb-1 flex items-center">
                                          <span className="mr-1">🏨</span> {t('common:hotels.payAtHotel', 'Pay at Hotel')}:
                                        </div>
                                        {payAtHotelTaxes.map((tax: TaxItem, idx: number) => (
                                          <div key={idx} className="flex justify-between text-gray-600 ml-4 mb-0.5">
                                            <span>{tax.name}:</span>
                                            <span className="text-orange-500">+{formatPrice(Number(tax.amount), tax.currency_code || tax.currency || rate.taxes_currency, 2)}</span>
                                          </div>
                                        ))}
                                        <div className="flex justify-between ml-4 text-orange-600 font-medium border-t border-gray-100 pt-1 mt-1">
                                          <span>{t('common:hotels.subtotal', 'Subtotal')}:</span>
                                          <span>+{formatPrice(payAtHotelTotal, payAtHotelTaxes[0]?.currency_code || payAtHotelTaxes[0]?.currency || rate.taxes_currency, 2)}</span>
                                        </div>
                                      </div>
                                    )}

                                    {/* Total Section */}
                                    <div className="border-t-2 border-gray-300 pt-2 mt-2">
                                      <div className="flex justify-between font-bold text-gray-900">
                                        <span>{t('common:hotels.totalAtBooking', 'Total at Booking')}:</span>
                                        <span>{formatPrice(Number(rate.price) + paidAtBookingTotal, undefined, 2)}</span>
                                      </div>
                                      {payAtHotelTotal > 0 && (
                                        <div className="flex justify-between text-orange-600 mt-1 text-[11px]">
                                          <span>{t('common:hotels.dueAtHotel', 'Due at Hotel')}:</span>
                                          <span>+{formatPrice(payAtHotelTotal, payAtHotelTaxes[0]?.currency_code || payAtHotelTaxes[0]?.currency || rate.taxes_currency, 2)}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        ) : rate.total_taxes && rate.total_taxes > 0 ? (
                          <div className="text-xs text-gray-500 mt-1">
                            +{formatPrice(rate.total_taxes || 0)} {t('common:hotels.taxesAndFees', 'taxes and fees')}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 mt-1">
                            {t('common:hotels.taxesIncluded', 'Taxes included')}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col lg:flex-row lg:items-center gap-2 mt-4 w-full items-end justify-end">
                        <div className="relative">
                          <select
                             className="appearance-none border border-gray-300 rounded px-3 py-2 pr-8 text-sm focus:outline-none focus:border-orange-500 bg-white cursor-pointer"
                             style={{
                               WebkitAppearance: 'none',
                               MozAppearance: 'none',
                               appearance: 'none',
                               backgroundImage: 'none'
                             }}
                             value={isSelected}
                             onChange={(e) => onSelectResult(rate, parseInt(e.target.value))}
                          >
                             {[0, 1, 2, 3, 4, 5].map(num => (
                                <option key={num} value={num}>
                                   {num > 0 ? `${num} ${t('common:hotels.rooms', 'rooms')}` : `${num} ${t('common:hotels.rooms', 'rooms')}`}
                                </option>
                             ))}
                          </select>
                          <ChevronDownIcon className="w-4 h-4 text-gray-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {/* Compare Checkbox */}
                        {onToggleCompare && (
                          <div className="flex items-center justify-end mb-2 gap-2">
                            <label className="flex items-center cursor-pointer text-sm text-gray-600 hover:text-orange-600 select-none">
                              <input
                                type="checkbox"
                                className="form-checkbox h-4 w-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500 mr-2 transition-colors"
                                checked={comparedRates?.has(rate.match_hash) || false}
                                onChange={() => onToggleCompare(rate)}
                              />
                              {t('common:hotels.compare', 'Compare')}
                            </label>
                          </div>
                        )}

                        {isSelected > 0 ? (
                           <button
                              onClick={() => { /* Navigation handled by parent state check or explicit button elsewhere */ }}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors w-full"
                           >
                              {t('common:common.selected', 'Selected')}
                           </button>
                        ) : (
                           <button
                              onClick={() => onSelectResult(rate, 1)}
                              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded text-sm transition-colors shadow-sm w-full"
                           >
                              {t('common:common.reserve', 'Reserve')}
                           </button>
                        )}
                      </div>

                      {/* Warning when not enough rooms selected */}
                      {isSelected > 0 && !occupancyInfo.fits && occupancyInfo.message && (
                        <div className="text-xs text-amber-600 mt-2 text-right">
                          ⚠️ {occupancyInfo.message}
                        </div>
                      )}
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
