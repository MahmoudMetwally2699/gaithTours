import React from 'react';
import { useTranslation } from 'react-i18next';
import { StarIcon, MapPinIcon, CalendarIcon, UserGroupIcon } from '@heroicons/react/24/solid';

interface Hotel {
  id: string;
  name: string;
  address: string;
  rating: number;
  image: string | null;
  images?: string[];
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  price: number;
  currency: string;
  meal?: string;
  meal_data?: {
    breakfast_included?: boolean;
  };
}

interface BookingSummaryCardProps {
  hotel: Hotel;
  selectedRate: RoomRate;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  hotel,
  selectedRate,
  checkIn,
  checkOut,
  guests
}) => {
  const { t } = useTranslation();

  // Calculate number of nights
  const calculateNights = () => {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const nights = calculateNights();
  const totalPrice = Number(selectedRate.price) * nights;
  const taxes = totalPrice * 0.14;

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const hotelImage = hotel.image || hotel.images?.[0] || '/placeholder-hotel.jpg';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-4">
      {/* Hotel Image */}
      <div className="relative h-48 w-full">
        <img
          src={hotelImage}
          alt={hotel.name}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Hotel Info */}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{hotel.name}</h3>

        {/* Rating */}
        <div className="flex items-center mb-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon
              key={i}
              className={`h-4 w-4 ${
                i < hotel.rating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Location */}
        <div className="flex items-start text-sm text-gray-600 mb-4">
          <MapPinIcon className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-2">{hotel.address}</span>
        </div>

        <div className="border-t border-gray-200 pt-4 mb-4">
          {/* Dates */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1">
              <div className="text-xs text-gray-500 mb-1">
                {t('booking.checkIn', 'Check-in')}
              </div>
              <div className="text-sm font-medium">{formatDate(checkIn)}</div>
              <div className="text-xs text-gray-500">11:00 AM</div>
            </div>

            <div className="px-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>

            <div className="flex-1 text-right">
              <div className="text-xs text-gray-500 mb-1">
                {t('booking.checkOut', 'Check-out')}
              </div>
              <div className="text-sm font-medium">{formatDate(checkOut)}</div>
              <div className="text-xs text-gray-500">12:00 PM</div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-gray-50 rounded p-3 mb-3">
            <div className="text-sm font-medium text-gray-900">
              {t('booking.totalStay', 'Total length of stay:')}
            </div>
            <div className="text-sm text-gray-600">
              {nights} {nights === 1 ? t('booking.night', 'night') : t('booking.nights', 'nights')}
            </div>
          </div>

          {/* Guests */}
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            <span>
              {guests} {guests === 1 ? t('booking.guest', 'guest') : t('hero.guests', 'guests')}
            </span>
          </div>
        </div>

        {/* Room Type */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t('booking.yourBooking', 'Your booking')}
          </h4>
          <div className="bg-blue-50 rounded p-3 mb-2">
            <div className="font-medium text-gray-900">{selectedRate.room_name}</div>
            {selectedRate.meal_data?.breakfast_included && (
              <div className="text-sm text-green-700 mt-1">
                🍳 {t('hotels.breakfastIncluded', 'Breakfast included')}
              </div>
            )}
          </div>
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">
            {t('booking.priceBreakdown', 'Price breakdown')}
          </h4>

          <div className="space-y-2 mb-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {selectedRate.currency} {Number(selectedRate.price).toFixed(2)} x {nights} {nights === 1 ? 'night' : 'nights'}
              </span>
              <span className="font-medium">
                {selectedRate.currency} {totalPrice.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                {t('booking.taxesAndFees', 'Taxes and fees')} (14%)
              </span>
              <span className="font-medium">
                {selectedRate.currency} {taxes.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                {t('booking.total', 'Total')}
              </span>
              <span className="text-2xl font-bold text-orange-600">
                {selectedRate.currency} {(totalPrice + taxes).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              {t('booking.includesTaxes', 'Includes taxes and fees')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
