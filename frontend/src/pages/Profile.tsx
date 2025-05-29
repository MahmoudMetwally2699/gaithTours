import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI, reservationsAPI, Reservation as APIReservation } from '../services/api';

interface Reservation {
  _id: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  currency: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  createdAt: string;
}

export const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await reservationsAPI.getByUser();
        if (response.data?.reservations) {
          // Transform API reservations to local reservation interface
          const transformedReservations: Reservation[] = response.data.reservations.map((apiRes: APIReservation) => ({
            _id: apiRes._id,
            hotelName: apiRes.hotel.name,
            checkIn: apiRes.checkInDate || '',
            checkOut: apiRes.checkOutDate || '',
            guests: apiRes.numberOfGuests,
            rooms: 1, // Default value as API doesn't have rooms
            totalPrice: 0, // API doesn't have total price
            currency: 'USD', // Default currency
            status: apiRes.status === 'confirmed' ? 'confirmed' :
                   apiRes.status === 'pending' ? 'pending' : 'cancelled',
            createdAt: apiRes.createdAt
          }));          setReservations(transformedReservations);
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
        // Sample reservations for demo
        setReservations([
          {
            _id: '1',
            hotelName: 'Burj Al Arab Jumeirah',
            checkIn: '2024-06-15',
            checkOut: '2024-06-20',
            guests: 2,
            rooms: 1,
            totalPrice: 2500,
            currency: 'USD',
            status: 'confirmed',
            createdAt: '2024-05-01T10:00:00Z'
          },
          {
            _id: '2',
            hotelName: 'The Ritz-Carlton',
            checkIn: '2024-07-10',
            checkOut: '2024-07-15',
            guests: 4,
            rooms: 2,
            totalPrice: 1800,
            currency: 'USD',
            status: 'pending',
            createdAt: '2024-05-15T14:30:00Z'
          }        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCancelReservation = async (reservationId: string) => {
    if (window.confirm(t('profile.confirmCancel'))) {
      try {
        await reservationsAPI.cancel(reservationId);
        setReservations(reservations.map(r =>
          r._id === reservationId ? { ...r, status: 'cancelled' as const } : r
        ));
      } catch (error) {
        console.error('Error cancelling reservation:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            {t('profile.title')}
          </h1>
          <p className="text-gray-600">
            {t('profile.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {t('profile.information')}
                </h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-primary-600 hover:text-primary-700"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.fullName')}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.phone')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200"
                    >
                      {t('profile.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors duration-200"
                    >
                      {t('profile.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{user?.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">{user?.email}</span>
                  </div>
                  {user?.phone && (
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900">{user.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-3">
                    <CalendarIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-900">
                      {t('profile.memberSince')} {formatDate(user?.createdAt || '')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Reservations */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {t('profile.reservations')}
              </h2>

              {reservations.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🏨</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('profile.noReservations')}
                  </h3>
                  <p className="text-gray-600">
                    {t('profile.startBooking')}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((reservation) => (
                    <div
                      key={reservation._id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {reservation.hotelName}
                          </h3>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                            <div>
                              <span className="text-sm text-gray-500">{t('hotels.checkIn')}</span>
                              <p className="font-medium">{formatDate(reservation.checkIn)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">{t('hotels.checkOut')}</span>
                              <p className="font-medium">{formatDate(reservation.checkOut)}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">{t('hotels.guests')}</span>
                              <p className="font-medium">{reservation.guests} {t('hotels.guests')}</p>
                            </div>
                            <div>
                              <span className="text-sm text-gray-500">{t('hotels.totalPrice')}</span>
                              <p className="font-medium">{reservation.totalPrice} {reservation.currency}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                              {t(`reservations.status.${reservation.status}`)}
                            </span>

                            <div className="text-sm text-gray-500">
                              {t('profile.bookedOn')} {formatDate(reservation.createdAt)}
                            </div>
                          </div>
                        </div>

                        {reservation.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelReservation(reservation._id)}
                            className="ml-4 text-red-600 hover:text-red-700 p-2"
                            title={t('profile.cancelReservation')}
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
