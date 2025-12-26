import React from 'react';
import { useTranslation } from 'react-i18next';

interface BedGroup {
  beds: Array<{
    type: string;
    count: number;
  }>;
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  bed_groups?: BedGroup[];
  room_size?: number;
  max_occupancy?: number;
  room_amenities?: string[];
  meal_data?: {
    breakfast_included?: boolean;
    meal_type?: string;
  };
  price: number;
  original_price?: number;
  currency: string;
  is_free_cancellation?: boolean;
  requires_prepayment?: boolean;
  requires_credit_card?: boolean;
  room_images?: string[];
  room_image_count?: number;
}

interface RoomRowProps {
  rate: RoomRate;
  onSelect: () => void;
  isSelected: boolean;
}

export const RoomRow: React.FC<RoomRowProps> = ({ rate, onSelect, isSelected }) => {
  const { t } = useTranslation();
  const [showAllAmenities, setShowAllAmenities] = React.useState(false);

  // Calculate discount percentage
  const discountPercentage = rate.original_price && Number(rate.price) < Number(rate.original_price)
    ? Math.round((1 - Number(rate.price) / Number(rate.original_price)) * 100)
    : 0;

  // Format bed configuration
  const formatBedGroups = () => {
    if (!rate.bed_groups || rate.bed_groups.length === 0) return null;

    return rate.bed_groups.map((group, groupIdx) => (
      <div key={groupIdx} className="text-sm text-gray-700 mt-2">
        {group.beds.map((bed, bedIdx) => (
          <span key={bedIdx}>
            {bed.count} {bed.type} bed 🛏️
            {bedIdx < group.beds.length - 1 && ' and '}
          </span>
        ))}
      </div>
    ));
  };

  const displayedAmenities = showAllAmenities
    ? rate.room_amenities
    : rate.room_amenities?.slice(0, 5);

  return (
    <div className={`border-2 rounded-lg transition-all mb-4 overflow-hidden ${
      isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex flex-col md:flex-row">
        {/* Room Image - Left Side */}
        <div className="md:w-64 flex-shrink-0">
          {rate.room_images && rate.room_images.length > 0 ? (
            <div className="relative w-full h-48 md:h-full">
              <img
                src={rate.room_images[0].replace('170x154', '640x400')}
                alt={rate.room_name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-room.jpg';
                }}
              />
              {rate.room_image_count && rate.room_image_count > 0 && (
                <div className="absolute bottom-3 right-3 bg-white px-3 py-1.5 rounded shadow-lg text-sm font-medium text-blue-600 border border-blue-200">
                  {rate.room_image_count} {t('hotels.photos', 'photos')}
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-48 md:h-full bg-gray-200 flex items-center justify-center">
              <span className="text-6xl">🛏️</span>
            </div>
          )}
        </div>

        {/* Room Details - Right Side */}
        <div className="flex-1 p-6">
          {/* Room Name and Bed Info */}
          <div className="mb-4">
            <h3 className="text-xl font-bold text-blue-600 hover:underline cursor-pointer mb-2">
              {rate.room_name}
            </h3>

            {/* Bed Configuration */}
            {formatBedGroups()}

            {/* Room Size */}
            {rate.room_size && (
              <div className="text-sm text-gray-700 mt-2 flex items-center">
                <span className="mr-2">📐</span>
                <span>{rate.room_size} m²</span>
              </div>
            )}
          </div>

          {/* Amenities Icons Row */}
          {rate.room_amenities && rate.room_amenities.length > 0 && (
            <div className="flex flex-wrap gap-4 mb-4 pb-4 border-b border-gray-200">
              {displayedAmenities?.slice(0, 6).map((amenity, idx) => (
                <div key={idx} className="flex items-center text-sm text-gray-700">
                  <span className="text-gray-600 mr-1.5">✓</span>
                  <span className="line-clamp-1">{amenity}</span>
                </div>
              ))}
              {rate.room_amenities.length > 6 && (
                <button
                  onClick={() => setShowAllAmenities(!showAllAmenities)}
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  {showAllAmenities ? t('common.showLess', 'Show less') : `+${rate.room_amenities.length - 6} ${t('common.more', 'more')}`}
                </button>
              )}
            </div>
          )}

          {/* Bottom Row: Guests, Price, Choices, Select */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Number of Guests */}
            <div className="md:col-span-2 flex items-center justify-center md:justify-start">
              <div className="text-2xl">
                {Array.from({ length: rate.max_occupancy || 2 }).map((_, i) => (
                  <span key={i} className="inline-block">👤</span>
                ))}
              </div>
            </div>

            {/* Today's Price */}
            <div className="md:col-span-3 text-center md:text-left">
              {discountPercentage > 0 && (
                <div className="text-sm text-gray-500 line-through">
                  {rate.currency} {Number(rate.original_price).toFixed(2)}
                </div>
              )}
              <div className="text-3xl font-bold text-orange-600">
                {rate.currency} {Number(rate.price).toFixed(2)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                +{rate.currency} {(Number(rate.price) * 0.14).toFixed(0)} {t('hotels.taxesAndFees', 'taxes and fees')}
              </div>

              {discountPercentage > 0 && (
                <div className="mt-2 inline-block">
                  <span className="bg-green-600 text-white px-2 py-1 rounded text-xs font-semibold">
                    {discountPercentage}% {t('common.off', 'off')}
                  </span>
                </div>
              )}
            </div>

            {/* Your Choices */}
            <div className="md:col-span-4 space-y-2">
              {rate.meal_data?.breakfast_included && (
                <div className="flex items-center text-sm text-green-700">
                  <span className="mr-2 flex-shrink-0">🍳</span>
                  <span>{t('hotels.continentalBreakfast', 'Continental breakfast included')}</span>
                </div>
              )}
              {rate.is_free_cancellation && (
                <div className="flex items-center text-sm text-green-700">
                  <span className="mr-2 flex-shrink-0">✓</span>
                  <span>{t('hotels.freeCancellation', 'Free cancellation anytime')}</span>
                </div>
              )}
              {!rate.requires_prepayment && (
                <div className="flex items-center text-sm text-green-700">
                  <span className="mr-2 flex-shrink-0">✓</span>
                  <span>{t('hotels.noPrepayment', 'No prepayment needed – pay at the property')}</span>
                </div>
              )}
              {!rate.requires_credit_card && (
                <div className="flex items-center text-sm text-green-700">
                  <span className="mr-2 flex-shrink-0">✓</span>
                  <span>{t('hotels.noCreditCard', 'No credit card needed')}</span>
                </div>
              )}
            </div>

            {/* Select Rooms */}
            <div className="md:col-span-3 flex flex-col items-center gap-3">
              <select className="border-2 border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-orange-500 w-full max-w-[100px]">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
              <button
                onClick={onSelect}
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                  isSelected
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
              >
                {isSelected ? '✓ ' + t('common.selected', 'Selected') : t('common.select', 'Select')}
              </button>
              <div className="text-xs text-gray-600 text-center">
                {t('hotels.youWontBeCharged', "You won't be charged yet")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
