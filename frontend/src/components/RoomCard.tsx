import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import {
  WifiIcon,
  NoSymbolIcon,
  CheckIcon,
  InformationCircleIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import { UserIcon } from '@heroicons/react/24/solid';
import { LazyImage } from './LazyImage';

/**
 * RoomCard Component - Booking.com inspired table layout
 * Clean horizontal rows with columns for features, occupancy, and price
 */

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
  currency_code?: string;
  included: boolean;
  included_by_supplier?: boolean;
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  bed_groups?: BedGroup[];
  room_size?: number;
  max_occupancy?: number;
  room_amenities?: string[];
  meal?: string;
  meal_data?: {
    breakfast_included?: boolean;
    meal_type?: string;
  };
  price: number;
  original_price?: number;
  currency: string;
  total_taxes?: number;
  taxes_currency?: string;
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
  selectedRates: Map<string, number>;
  nights?: number;
  adults?: number;
  children?: number;
  onToggleCompare?: (rate: RoomRate) => void;
  comparedRates?: Set<string>;
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

  const baseRate = rates[0];

  const getRateFeaturesKey = (rate: RoomRate) => {
    return JSON.stringify({
      name: rate.room_name,
      meal: rate.meal,
      cancellation: rate.is_free_cancellation,
      prepayment: rate.requires_prepayment,
    });
  };

  const getMealLabel = (meal?: string) => {
    if (!meal || meal === 'nomeal') return { text: t('common:hotels.roomOnly', 'Room only'), included: false };
    switch (meal.toLowerCase()) {
      case 'breakfast': return { text: t('hotels.breakfastIncluded', 'Breakfast included'), included: true };
      case 'half-board': return { text: t('hotels.halfBoard', 'Half Board'), included: true };
      case 'full-board': return { text: t('hotels.fullBoard', 'Full Board'), included: true };
      case 'all-inclusive': return { text: t('hotels.allInclusive', 'All Inclusive'), included: true };
      default: return { text: meal, included: true };
    }
  };

  const getOccupancyInfo = (rate: RoomRate, selectedCount: number) => {
    const maxOccupancy = rate.max_occupancy || 2;
    const roomsNeededForAdults = Math.ceil(adults / maxOccupancy);

    if (adults <= maxOccupancy) {
      return { fits: true, message: null, roomsNeeded: 1 };
    } else if (selectedCount >= roomsNeededForAdults) {
      return { fits: true, message: null, roomsNeeded: roomsNeededForAdults };
    } else {
      return {
        fits: false,
        message: t('hotels.selectMoreRooms', 'Select {{count}} rooms for {{guests}} adults', { count: roomsNeededForAdults, guests: adults }),
        roomsNeeded: roomsNeededForAdults
      };
    }
  };

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

  const sortedRates = [...uniqueRates].sort((a, b) => Number(a.price) - Number(b.price));

  const renderAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    if (lower.includes('wifi')) return <WifiIcon className="w-4 h-4" />;
    if (lower.includes('smoking')) return <NoSymbolIcon className="w-4 h-4" />;
    return <CheckIcon className="w-4 h-4" />;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 mb-4 overflow-hidden shadow-sm">
      {/* Desktop Table Layout */}
      <div className="hidden md:block">
        {/* Table Header */}
        <div className="grid grid-cols-12 bg-orange-500 text-white text-sm font-semibold">
          <div className="col-span-4 p-3 border-r border-orange-400">{t('common:hotels.roomType', 'Room Type')}</div>
          <div className="col-span-3 p-3 border-r border-orange-400">{t('common:hotels.yourChoices', 'Your Choices')}</div>
          <div className="col-span-1 p-3 border-r border-orange-400 text-center">{t('common:hotels.sleeps', 'Sleeps')}</div>
          <div className="col-span-2 p-3 border-r border-orange-400 text-center">
            {nights > 1 ? t('common:hotels.priceForNights', 'Price for {{nights}} nights', { nights }) : t('common:hotels.pricePerNight', 'Price')}
          </div>
          <div className="col-span-2 p-3 text-center">{t('common:hotels.selectRooms', 'Select')}</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-gray-200">
          {sortedRates.map((rate, index) => {
            const isBestPrice = index === 0;
            const isSelected = selectedRates.get(rate.match_hash) || 0;
            const mealInfo = getMealLabel(rate.meal);
            const occupancyInfo = getOccupancyInfo(rate, isSelected);

            return (
              <div
                key={rate.match_hash}
                className={`grid grid-cols-12 ${isSelected > 0 ? 'bg-orange-50' : 'hover:bg-gray-50'} transition-colors`}
              >
                {/* Room Type Column - Only show for first rate */}
                {index === 0 ? (
                  <div className="col-span-4 p-3 border-r border-gray-200" style={{ gridRow: `span ${sortedRates.length}` }}>
                    <div
                      className="relative h-32 rounded overflow-hidden mb-3 cursor-pointer group"
                      onClick={() => setShowDetailsModal(true)}
                    >
                      {baseRate.room_images && baseRate.room_images[0] ? (
                        <LazyImage
                          src={baseRate.room_images[0].replace('170x154', '640x400')}
                          alt={roomType}
                          className="w-full h-full transition-transform duration-300 group-hover:scale-105"
                          objectFit="cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      {baseRate.room_images && baseRate.room_images.length > 1 && (
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                          +{baseRate.room_images.length - 1}
                        </span>
                      )}
                    </div>

                    <h3 className="font-bold text-gray-900 text-base mb-2">{roomType}</h3>

                    {baseRate.bed_groups && baseRate.bed_groups[0] && (
                      <div className="flex items-center text-sm text-gray-600 mb-1">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12h18M3 12a9 9 0 019-9m-9 9a9 9 0 009 9m0-18a9 9 0 019 9m-9 9a9 9 0 009-9" />
                        </svg>
                        {baseRate.bed_groups[0].beds.map((bed, j) => `${bed.count} ${bed.type}`).join(', ')}
                      </div>
                    )}

                    {baseRate.room_size && (
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg className="w-4 h-4 mr-1.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        {baseRate.room_size} m²
                      </div>
                    )}

                    {baseRate.room_amenities && baseRate.room_amenities.slice(0, 3).map((amenity, idx) => (
                      <div key={idx} className="flex items-center text-xs text-gray-500 mb-0.5">
                        <CheckIcon className="w-3 h-3 mr-1 text-green-600" />
                        {amenity}
                      </div>
                    ))}

                    <button
                      onClick={() => setShowDetailsModal(true)}
                      className="text-blue-600 text-sm hover:underline mt-2"
                    >
                      {t('common:hotels.roomDetails', 'Room details')} &gt;
                    </button>
                  </div>
                ) : null}

                {/* Your Choices Column */}
                <div className={`${index === 0 ? '' : 'col-start-5'} col-span-3 p-3 border-r border-gray-200`}>
                  {isBestPrice && (
                    <span className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded mb-2">
                      {t('common:hotels.bestPrice', 'Best Price')}
                    </span>
                  )}

                  <div className={`flex items-center text-sm mb-1.5 ${mealInfo.included ? 'text-green-700' : 'text-gray-500'}`}>
                    {mealInfo.included ? (
                      <CheckCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    ) : (
                      <XCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    )}
                    <span className={mealInfo.included ? 'font-medium' : ''}>{mealInfo.text}</span>
                  </div>

                  {rate.is_free_cancellation ? (
                    <div className="flex items-center text-sm text-green-700 mb-1.5">
                      <CheckCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span className="font-medium">{t('hotels.freeCancellation', 'Free cancellation')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-500 mb-1.5">
                      <InformationCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span>{t('common:hotels.nonRefundable', 'Non-refundable')}</span>
                    </div>
                  )}

                  {!rate.requires_prepayment && (
                    <div className="flex items-center text-sm text-green-700 mb-1.5">
                      <CheckCircleIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                      <span>{t('common:hotels.payAtProperty', 'No prepayment needed')}</span>
                    </div>
                  )}
                </div>

                {/* Sleeps Column */}
                <div className={`${index === 0 ? '' : 'col-start-8'} col-span-1 p-3 border-r border-gray-200 flex flex-col items-center justify-center`}>
                  <div className="flex">
                    {[...Array(Math.min(rate.max_occupancy || 2, 4))].map((_, i) => (
                      <UserIcon key={i} className="w-4 h-4 text-gray-600" />
                    ))}
                  </div>
                  {(rate.max_occupancy || 0) > 4 && (
                    <span className="text-xs text-gray-500">+{(rate.max_occupancy || 0) - 4}</span>
                  )}
                </div>

                {/* Price Column */}
                <div className={`${index === 0 ? '' : 'col-start-9'} col-span-2 p-3 border-r border-gray-200 flex flex-col justify-center`}>
                  {rate.original_price && Number(rate.price) < Number(rate.original_price) && (
                    <div className="text-sm text-red-500 line-through">{formatPrice(Number(rate.original_price))}</div>
                  )}
                  <div className="text-xl font-bold text-gray-900">{formatPrice(Number(rate.price))}</div>
                  {rate.total_taxes && rate.total_taxes > 0 && (
                    <div className="text-xs text-gray-500">
                      +{formatPrice(rate.total_taxes)} {t('common:hotels.taxesAndFees', 'taxes')}
                    </div>
                  )}
                  {nights > 1 && (
                    <div className="text-xs text-gray-500">
                      {formatPrice(Math.round(Number(rate.price) / nights))}/{t('common:hotels.night', 'night')}
                    </div>
                  )}
                </div>

                {/* Select Column */}
                <div className={`${index === 0 ? '' : 'col-start-11'} col-span-2 p-3 flex flex-col items-center justify-center gap-2`}>
                  <div className="relative w-full">
                    <select
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ltr:pr-8 rtl:pl-8 bg-transparent"
                      style={{
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        backgroundImage: 'none'
                      }}
                      value={isSelected}
                      onChange={(e) => onSelectResult(rate, parseInt(e.target.value))}
                    >
                      {[0, 1, 2, 3, 4, 5].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <ChevronDownIcon className="w-4 h-4 text-gray-500 pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2" />
                  </div>

                  {isSelected > 0 ? (
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded text-sm transition-colors">
                      {t('common:common.selected', 'Selected')}
                    </button>
                  ) : (
                    <button
                      onClick={() => onSelectResult(rate, 1)}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded text-sm transition-colors"
                    >
                      {t('common:common.reserve', 'Reserve')}
                    </button>
                  )}

                  {onToggleCompare && (
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        checked={comparedRates?.has(rate.match_hash) || false}
                        onChange={() => onToggleCompare(rate)}
                      />
                      {t('common:hotels.compare', 'Compare')}
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden">
        {/* Room Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex gap-3">
            <div
              className="w-24 h-20 rounded overflow-hidden flex-shrink-0 cursor-pointer"
              onClick={() => setShowDetailsModal(true)}
            >
              {baseRate.room_images && baseRate.room_images[0] ? (
                <LazyImage
                  src={baseRate.room_images[0].replace('170x154', '640x400')}
                  alt={roomType}
                  className="w-full h-full"
                  objectFit="cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base mb-1">{roomType}</h3>
              {baseRate.room_size && (
                <div className="text-sm text-gray-500">{baseRate.room_size} m²</div>
              )}
              <button
                onClick={() => setShowDetailsModal(true)}
                className="text-blue-600 text-sm hover:underline mt-1"
              >
                {t('common:hotels.roomDetails', 'Room details')}
              </button>
            </div>
          </div>
        </div>

        {/* Rate Options */}
        {sortedRates.map((rate, index) => {
          const isBestPrice = index === 0;
          const isSelected = selectedRates.get(rate.match_hash) || 0;
          const mealInfo = getMealLabel(rate.meal);

          return (
            <div
              key={rate.match_hash}
              className={`p-4 border-b border-gray-100 last:border-b-0 ${isSelected > 0 ? 'bg-orange-50' : ''}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  {isBestPrice && (
                    <span className="inline-block bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded mb-2">
                      {t('common:hotels.bestPrice', 'Best Price')}
                    </span>
                  )}

                  <div className={`flex items-center text-sm mb-1 ${mealInfo.included ? 'text-green-700' : 'text-gray-500'}`}>
                    {mealInfo.included ? <CheckCircleIcon className="w-4 h-4 mr-1" /> : <XCircleIcon className="w-4 h-4 mr-1" />}
                    {mealInfo.text}
                  </div>

                  {rate.is_free_cancellation ? (
                    <div className="flex items-center text-sm text-green-700">
                      <CheckCircleIcon className="w-4 h-4 mr-1" />
                      {t('hotels.freeCancellation', 'Free cancellation')}
                    </div>
                  ) : (
                    <div className="flex items-center text-sm text-gray-500">
                      <InformationCircleIcon className="w-4 h-4 mr-1" />
                      {t('common:hotels.nonRefundable', 'Non-refundable')}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  {rate.original_price && Number(rate.price) < Number(rate.original_price) && (
                    <div className="text-sm text-red-500 line-through">{formatPrice(Number(rate.original_price))}</div>
                  )}
                  <div className="text-xl font-bold text-gray-900">{formatPrice(Number(rate.price))}</div>
                  {rate.total_taxes && rate.total_taxes > 0 && (
                    <div className="text-xs text-gray-500">+{formatPrice(rate.total_taxes)} {t('common:hotels.taxesAndFees', 'taxes')}</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 ltr:pr-8 rtl:pl-8 bg-transparent"
                    style={{
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      backgroundImage: 'none'
                    }}
                    value={isSelected}
                    onChange={(e) => onSelectResult(rate, parseInt(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4, 5].map(num => (
                      <option key={num} value={num}>{num} {t('common:hotels.rooms', 'rooms')}</option>
                    ))}
                  </select>
                  <ChevronDownIcon className="w-4 h-4 text-gray-500 pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2" />
                </div>

                <button
                  onClick={() => isSelected === 0 && onSelectResult(rate, 1)}
                  className={`flex-1 font-bold py-2 px-4 rounded text-sm transition-colors ${
                    isSelected > 0
                      ? 'bg-green-600 text-white'
                      : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }`}
                >
                  {isSelected > 0 ? t('common:common.selected', 'Selected') : t('common:common.reserve', 'Reserve')}
                </button>
              </div>

              {onToggleCompare && (
                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer mt-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                    checked={comparedRates?.has(rate.match_hash) || false}
                    onChange={() => onToggleCompare(rate)}
                  />
                  {t('common:hotels.compare', 'Compare')}
                </label>
              )}
            </div>
          );
        })}
      </div>

      {/* Room Details Modal */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative h-56">
              {baseRate.room_images && baseRate.room_images.length > 0 ? (
                <>
                  <LazyImage
                    src={baseRate.room_images[currentImageIndex]?.replace('170x154', '640x400')}
                    alt={`${roomType} - ${currentImageIndex + 1}`}
                    className="w-full h-full"
                    objectFit="cover"
                    priority={true}
                  />
                  {baseRate.room_images.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === 0 ? baseRate.room_images!.length - 1 : prev - 1); }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => prev === baseRate.room_images!.length - 1 ? 0 : prev + 1); }}
                        className="absolute right-12 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                        {currentImageIndex + 1} / {baseRate.room_images.length}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <button
                onClick={() => setShowDetailsModal(false)}
                className="absolute top-2 right-2 bg-white/90 hover:bg-white rounded-full p-2 shadow"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <h3 className="text-lg font-bold text-white">{roomType}</h3>
                {baseRate.room_size && <p className="text-white/80 text-sm">{baseRate.room_size} m²</p>}
              </div>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(90vh-14rem)]">
              <h4 className="font-bold text-gray-800 mb-3">{t('common:hotels.roomAmenities', 'Room Amenities')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {baseRate.room_amenities?.map((amenity, idx) => (
                  <div key={idx} className="flex items-center text-sm text-gray-600">
                    <CheckIcon className="w-4 h-4 mr-2 text-green-600" />
                    {amenity}
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t flex justify-end">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 px-5 rounded transition-colors"
                >
                  {t('common:common.close', 'Close')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
