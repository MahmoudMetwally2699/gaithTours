import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';
import { reservationsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface HotelBookingModalProps {
  hotel: Hotel;
  searchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
  };
  onClose: () => void;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({
  hotel,
  searchParams,
  onClose
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    touristName: user?.name || '',
    phone: user?.phone || '',
    nationality: user?.nationality || '',
    email: user?.email || '',
    notes: ''
  });
  const calculateNights = () => {
    if (searchParams.checkIn && searchParams.checkOut) {
      const startDate = new Date(searchParams.checkIn);
      const endDate = new Date(searchParams.checkOut);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const nights = calculateNights();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {      const reservationData = {
        touristName: formData.touristName,
        phone: formData.phone,
        nationality: formData.nationality,
        email: formData.email,
        hotel: {
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          country: hotel.country,
          coordinates: hotel.coordinates,
          rating: hotel.rating,
          image: hotel.image,
          hotelId: hotel.id
        },
        checkInDate: searchParams.checkIn,
        checkOutDate: searchParams.checkOut,
        numberOfGuests: searchParams.guests,
        notes: formData.notes
      };

      console.log('=== FRONTEND RESERVATION DATA ===');
      console.log('Sending reservation data:', JSON.stringify(reservationData, null, 2));
      console.log('=================================');

      await reservationsAPI.create(reservationData);
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('hotels.booking.title', 'Book Hotel')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">          <div className="mb-6">
            <h4 className="font-medium text-lg">{hotel.name}</h4>
            <p className="text-gray-600">{hotel.address}, {hotel.city}</p>
            <div className="flex items-center mt-2">
              <span className="text-yellow-400">★</span>
              <span className="ml-1 text-sm">{hotel.rating}</span>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h5 className="font-medium mb-3">{t('hotels.booking.summary', 'Booking Summary')}</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('hotels.checkIn', 'Check-in')}:</span>
                <span>{searchParams.checkIn || 'Not set'}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('hotels.checkOut', 'Check-out')}:</span>
                <span>{searchParams.checkOut || 'Not set'}</span>
              </div>              <div className="flex justify-between">
                <span>{t('hotels.guests', 'Guests')}:</span>
                <span>{searchParams.guests}</span>
              </div>
              {nights > 0 && (
                <div className="flex justify-between">
                  <span>{nights} {t('hotels.booking.nights', 'nights')}</span>
                </div>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.name', 'Full Name')} *
              </label>
              <input
                type="text"
                required
                value={formData.touristName}
                onChange={(e) => setFormData(prev => ({ ...prev, touristName: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.email', 'Email')} *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.phone', 'Phone')} *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.nationality', 'Nationality')} *
              </label>
              <input
                type="text"
                required
                value={formData.nationality}
                onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('hotels.booking.specialRequests', 'Special Requests')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder={t('hotels.booking.specialRequestsPlaceholder', 'Any special requests or notes...')}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
              >
                {loading ? t('common.loading', 'Loading...') : t('hotels.booking.confirm', 'Confirm Booking')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
