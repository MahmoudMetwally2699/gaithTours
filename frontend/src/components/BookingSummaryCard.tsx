import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCurrency } from '../contexts/CurrencyContext';
import { StarIcon, MapPinIcon, CalendarIcon, UserGroupIcon, HomeModernIcon } from '@heroicons/react/24/solid';

interface Hotel {
  id: string;
  name: string;
  address: string;
  rating: number;
  image: string | null;
  images?: string[];
}

interface TaxItem {
  name: string;
  amount: number;
  currency?: string;
  currency_code?: string; // Raw API field name
  included?: boolean;
  included_by_supplier?: boolean;
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  price: number;
  currency: string;
  meal?: string;
  count?: number; // Number of this room type
  meal_data?: {
    breakfast_included?: boolean;
  };
  total_taxes?: number; // Actual taxes from RateHawk API
  taxes_currency?: string;
  tax_data?: {
    taxes?: TaxItem[];
  };
  taxes?: TaxItem[];
}

interface BookingSummaryCardProps {
  hotel: Hotel;
  selectedRate: RoomRate;
  selectedRooms?: RoomRate[]; // Multiple room selections
  checkIn: string;
  checkOut: string;
  guests: number;       // Adults count
  children?: number;    // Children count
  rooms?: number; // Total room count
}

export const BookingSummaryCard: React.FC<BookingSummaryCardProps> = ({
  hotel,
  selectedRate,
  selectedRooms,
  checkIn,
  checkOut,
  guests,
  children = 0,
  rooms = 1
}) => {
  const { t, i18n } = useTranslation(['common', 'booking']);
  const { currencySymbol } = useCurrency();
  const totalGuests = guests + children;

  // Calculate number of nights with validation
  const calculateNights = () => {
    if (!checkIn || !checkOut) return 1;

    const start = new Date(checkIn);
    const end = new Date(checkOut);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 1;
    }

    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 1;
  };

  const nights = calculateNights();

  // Calculate total price including all rooms
  // IMPORTANT: rate.price is already the TOTAL for the stay, not per-night!
  const calculateTotalPrice = () => {
    if (selectedRooms && selectedRooms.length > 0) {
      // Sum up total price for each room type (already includes nights)
      return selectedRooms.reduce((total, room) => {
        const roomTotalPrice = Number(room.price) || 0; // Already total for stay
        const roomCount = room.count || 1;
        return total + (roomTotalPrice * roomCount); // Only multiply by room count, not nights
      }, 0);
    }
    // Fallback to single room calculation
    const totalStayPrice = Number(selectedRate.price) || 0; // Already total for stay
    return totalStayPrice * Math.max(rooms, 1); // Only multiply by room count, not nights
  };

  const totalPrice = calculateTotalPrice();

  // Helper to get tax breakdown from a room rate
  const getTaxBreakdown = (room: RoomRate) => {
    const allTaxes = room.tax_data?.taxes || room.taxes || [];
    const paidAtBooking = allTaxes.filter((tax: TaxItem) => tax.included_by_supplier || tax.included);
    const payAtHotel = allTaxes.filter((tax: TaxItem) => !tax.included_by_supplier && !tax.included);

    return {
      paidAtBooking,
      payAtHotel,
      paidAtBookingTotal: paidAtBooking.reduce((sum, tax) => sum + Number(tax.amount || 0), 0),
      payAtHotelTotal: payAtHotel.reduce((sum, tax) => sum + Number(tax.amount || 0), 0)
    };
  };

  // Calculate taxes - ONLY include taxes that are paid at booking, NOT pay-at-hotel taxes
  const calculateTaxes = () => {
    if (selectedRooms && selectedRooms.length > 0) {
      // Sum taxes for all selected rooms
      return selectedRooms.reduce((sum, room) => {
        const breakdown = getTaxBreakdown(room);
        const roomCount = room.count || 1;
        // ONLY include taxes paid at booking in the total
        return sum + (breakdown.paidAtBookingTotal * roomCount);
      }, 0);
    }

    // Single room
    const breakdown = getTaxBreakdown(selectedRate);
    if (breakdown.paidAtBookingTotal > 0) {
      return breakdown.paidAtBookingTotal * Math.max(rooms, 1);
    }

    // Fallback to 14% if no tax data available
    return totalPrice * 0.14;
  };

  // Calculate pay at hotel taxes (for display only, not included in total)
  const calculatePayAtHotelTaxes = () => {
    if (selectedRooms && selectedRooms.length > 0) {
      return selectedRooms.reduce((sum, room) => {
        const breakdown = getTaxBreakdown(room);
        const roomCount = room.count || 1;
        return sum + (breakdown.payAtHotelTotal * roomCount);
      }, 0);
    }

    const breakdown = getTaxBreakdown(selectedRate);
    return breakdown.payAtHotelTotal * Math.max(rooms, 1);
  };

  // Get the currency for pay at hotel taxes from the tax data
  const getPayAtHotelCurrency = () => {
    const room = selectedRooms?.[0] || selectedRate;
    const allTaxes = room.tax_data?.taxes || room.taxes || [];
    const payAtHotelTax = allTaxes.find((tax: TaxItem) => !tax.included_by_supplier && !tax.included);
    return payAtHotelTax?.currency_code || payAtHotelTax?.currency || room.taxes_currency || selectedRate.currency;
  };

  const taxes = calculateTaxes();
  const payAtHotelTaxes = calculatePayAtHotelTaxes();
  const payAtHotelCurrency = getPayAtHotelCurrency();
  const hasTaxData = selectedRate.tax_data?.taxes && selectedRate.tax_data.taxes.length > 0;
  const taxPercentage = hasTaxData ? null : '14%'; // Only show percentage if using fallback
  const totalRooms = selectedRooms?.reduce((sum, r) => sum + (r.count || 1), 0) || rooms;

  // Format date with validation
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Select Date';

    return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const hotelImage = hotel.image || hotel.images?.[0] || '/placeholder-hotel.jpg';

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
                {t('booking:checkIn', 'Check-in')}
              </div>
              <div className="text-sm font-medium">{formatDate(checkIn)}</div>
              <div className="text-xs text-gray-500">11:00 AM</div>
            </div>

            <div className="px-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
            </div>

            <div className="flex-1 text-right">
              <div className="text-xs text-gray-500 mb-1">
                {t('booking:checkOut', 'Check-out')}
              </div>
              <div className="text-sm font-medium">{formatDate(checkOut)}</div>
              <div className="text-xs text-gray-500">12:00 PM</div>
            </div>
          </div>

          {/* Duration */}
          <div className="bg-gray-50 rounded p-3 mb-3">
            <div className="text-sm font-medium text-gray-900">
              {t('booking:totalStay', 'Total length of stay:')}
            </div>
            <div className="text-sm text-gray-600">
              {nights} {nights === 1 ? t('booking:night', 'night') : t('booking:nights', 'nights')}
            </div>
          </div>

          {/* Guests & Rooms */}
          <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
            <div className="flex items-center">
              <UserGroupIcon className="h-4 w-4 mr-2" />
              <span>{totalGuests} {totalGuests === 1 ? t('booking:guest', 'Guest') : t('booking:guests', 'Guests')}</span>
            </div>
            <div className="flex items-center">
              <HomeModernIcon className="h-4 w-4 mr-2 text-orange-500" />
              <span className="font-medium text-orange-600">
                {totalRooms} {totalRooms === 1 ? t('booking:room', 'room') : t('booking:rooms', 'rooms')}
              </span>
            </div>
          </div>
        </div>

        {/* Room Types */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">
            {t('booking:yourBooking', 'Your booking')}
          </h4>

          {/* Show all selected rooms if multiroom */}
          {selectedRooms && selectedRooms.length > 0 ? (
            <div className="space-y-2">
              {selectedRooms.map((room, index) => (
                <div key={room.match_hash || index} className="bg-blue-50 rounded p-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{room.room_name}</div>
                      {room.meal_data?.breakfast_included && (
                        <div className="text-sm text-green-700 mt-1">
                          🍳 {t('hotels.breakfastIncluded', 'Breakfast included')}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-medium">
                        x{room.count || 1}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Single room display
            <div className="bg-blue-50 rounded p-3 mb-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{selectedRate.room_name}</div>
                  {selectedRate.meal_data?.breakfast_included && (
                    <div className="text-sm text-green-700 mt-1">
                      🍳 {t('hotels.breakfastIncluded', 'Breakfast included')}
                    </div>
                  )}
                </div>
                {totalRooms > 1 && (
                  <div className="text-right">
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-sm font-medium">
                      x{totalRooms}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        <div className="border-t border-gray-200 pt-4">
          <h4 className="font-semibold text-gray-900 mb-3">
            {t('booking:priceBreakdown', 'Price breakdown')}
          </h4>

          <div className="space-y-2 mb-3">
            {selectedRooms && selectedRooms.length > 0 ? (
              // Multiroom price breakdown
              selectedRooms.map((room, index) => (
                <div key={room.match_hash || index} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {room.room_name} x{room.count || 1} ({nights}n)
                  </span>
                  <span className="font-medium">
                    {currencySymbol} {(Number(room.price) * (room.count || 1)).toFixed(2)}
                  </span>
                </div>
              ))
            ) : (
              // Single room price breakdown
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">
                  {selectedRate.room_name || 'Room'} x{totalRooms} ({nights}n)
                </span>
                <span className="font-medium">
                  {currencySymbol} {totalPrice.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-sm text-green-700">
              <span>
                ✓ {t('booking:taxesAtBooking', 'Taxes (paid at booking)')}{taxPercentage ? ` (${taxPercentage})` : ''}
              </span>
              <span className="font-medium">
                {currencySymbol} {taxes.toFixed(2)}
              </span>
            </div>

            {/* Pay at Hotel Taxes - shown separately */}
            {payAtHotelTaxes > 0 && (
              <div className="flex justify-between text-sm text-orange-600">
                <span>
                  🏨 {t('booking:dueAtHotel', 'Due at hotel')}
                </span>
                <span className="font-medium">
                  {payAtHotelCurrency} {payAtHotelTaxes.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Total */}
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-bold text-gray-900">
                {t('booking:totalNow', 'Total to pay now')}
              </span>
              <span className="text-2xl font-bold text-orange-600">
                {currencySymbol} {(totalPrice + taxes).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              {t('booking:includesTaxes', 'Includes taxes and fees')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
