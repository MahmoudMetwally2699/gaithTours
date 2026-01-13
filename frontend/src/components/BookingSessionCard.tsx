import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarIcon,
  MapPinIcon,
  BanknotesIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Booking {
  _id: string;
  roomType: string;
  numberOfRooms: number;
  roomCount: number;
  totalPrice: number;
  currency: string;
  status: string;
  ratehawkOrderId?: string;
}

interface BookingSessionCardProps {
  sessionId: string;
  bookings: Booking[];
  hotelName: string;
  hotelCity: string;
  checkInDate: string;
  checkOutDate: string;
  onViewDetails?: (bookingId: string) => void;
  onCancelSession?: (sessionId: string) => void;
}

export const BookingSessionCard: React.FC<BookingSessionCardProps> = ({
  sessionId,
  bookings,
  hotelName,
  hotelCity,
  checkInDate,
  checkOutDate,
  onViewDetails,
  onCancelSession
}) => {
  const { t } = useTranslation();

  // Calculate totals
  const totalRooms = bookings.reduce((sum, b) => sum + (b.roomCount || b.numberOfRooms || 0), 0);
  const totalPrice = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
  const currency = bookings[0]?.currency || 'SAR';
  const allConfirmed = bookings.every(b => b.status === 'confirmed');

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-orange-100 overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <UserGroupIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{t('bookings.multiRoomBooking', 'Multi-Room Booking')}</h3>
              <p className="text-sm text-white/90">{bookings.length} {t('bookings.separateBookings', 'separate bookings')}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${allConfirmed ? 'bg-green-500' : 'bg-yellow-500'}`}>
            {allConfirmed ? '✓ Confirmed' : '⏳ Processing'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        {/* Hotel Info */}
        <div className="flex items-start space-x-3">
          <MapPinIcon className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-gray-900">{hotelName}</h4>
            <p className="text-sm text-gray-600">{hotelCity}</p>
          </div>
        </div>

        {/* Dates */}
        <div className="flex items-center space-x-3 text-sm">
          <CalendarIcon className="h-5 w-5 text-orange-500" />
          <span className="text-gray-700">
            {formatDate(checkInDate)} → {formatDate(checkOutDate)}
          </span>
        </div>

        {/* Room Breakdown */}
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <p className="text-sm font-semibold text-gray-700 mb-2">{t('bookings.roomsIncluded', 'Rooms Included')}:</p>
          {bookings.map((booking, index) => (
            <div key={booking._id} className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-2">
                <span className="bg-orange-100 text-orange-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                  {booking.roomCount || booking.numberOfRooms || 1}
                </span>
                <span className="text-gray-700">{booking.roomType}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {currency} {booking.totalPrice.toFixed(0)}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs border ${getStatusColor(booking.status)}`}>
                  {booking.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Total */}
        <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BanknotesIcon className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              {t('bookings.totalPrice', 'Total')} ({totalRooms} {t('bookings.rooms', 'rooms')}):
            </span>
          </div>
          <span className="text-xl font-bold text-gray-900">
            {currency} {totalPrice.toFixed(0)}
          </span>
        </div>

        {/* Session ID */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
          <p className="text-xs text-blue-700">
            <strong>{t('bookings.sessionId', 'Session ID')}:</strong>{' '}
            <code className="bg-blue-100 px-2 py-0.5 rounded">{sessionId.substring(0, 16)}...</code>
          </p>
        </div>

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(bookings[0]._id)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              {t('bookings.viewDetails', 'View Details')}
            </button>
          )}
          {onCancelSession && allConfirmed && (
            <button
              onClick={() => onCancelSession(sessionId)}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200"
            >
              {t('bookings.cancelAll', 'Cancel All')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
