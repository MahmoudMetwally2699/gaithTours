import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  PencilIcon,
  TrashIcon,
  DocumentTextIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { reservationsAPI, Reservation as APIReservation } from '../services/api';
import paymentsAPI, { Invoice } from '../services/paymentsAPI';
import { toast } from 'react-hot-toast';
import InvoiceDetailModal from '../components/InvoiceDetailModal';

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

  // Get tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab') || 'reservations';

  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isEditing, setIsEditing] = useState(false);  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    nationality: user?.nationality || ''
  });  // Check for tab parameter from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab');
    if (tabFromUrl && ['reservations', 'invoices'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, []);

  // Auto-populate form data when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        nationality: user.nationality || ''
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await reservationsAPI.getByUser();        if (response.data?.reservations) {
          // Transform API reservations to local reservation interface
          console.log('🔍 Raw API Response:', response.data.reservations);
          const transformedReservations: Reservation[] = response.data.reservations.map((apiRes: APIReservation) => {
            console.log('📍 API Reservation Status:', apiRes.status, 'for reservation ID:', apiRes._id);
            const mappedStatus = (apiRes.status === 'confirmed' || apiRes.status === 'paid' || apiRes.status === 'completed') ? 'confirmed' :
                   (apiRes.status === 'cancelled') ? 'cancelled' :
                   'pending' as const;
            console.log('📍 Mapped Status:', mappedStatus, 'for reservation ID:', apiRes._id);
            return {
              _id: apiRes._id,
              hotelName: apiRes.hotel.name,
              checkIn: apiRes.checkInDate || '',
              checkOut: apiRes.checkOutDate || '',
              guests: apiRes.numberOfGuests,
              rooms: 1, // Default value as API doesn't have rooms
              totalPrice: 0, // API doesn't have total price
              currency: 'USD', // Default currency
              status: mappedStatus,
              createdAt: apiRes.createdAt
            };
          });
          console.log('✅ Final transformed reservations:', transformedReservations);
          setReservations(transformedReservations);
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const fetchInvoices = async () => {
    try {
      setInvoiceLoading(true);
      const response = await paymentsAPI.getInvoices();
      setInvoices(response.data.data.invoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setInvoiceLoading(false);
    }
  };
  useEffect(() => {
    if (activeTab === 'invoices') {
      fetchInvoices();
    }
  }, [activeTab]);

  const handleViewInvoice = async (invoiceId: string) => {
    try {
      const response = await paymentsAPI.getInvoice(invoiceId);
      setSelectedInvoice(response.data.data.invoice);
      setIsInvoiceModalOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      toast.error('Failed to load invoice details');
    }
  };

  const handleDownloadReceipt = async (invoiceId: string) => {
    try {
      await paymentsAPI.downloadReceipt(invoiceId);
      toast.success('Receipt downloaded successfully');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const handleCloseInvoiceModal = () => {
    setIsInvoiceModalOpen(false);
    setSelectedInvoice(null);
  };

  const handlePayNow = async (invoiceId: string) => {
    try {
      setPaymentLoading(invoiceId);
      const response = await paymentsAPI.createSession(invoiceId);

      // Redirect to Stripe Checkout
      window.location.href = response.url;
    } catch (error) {
      console.error('Error creating payment session:', error);
      toast.error('Failed to create payment session');
    } finally {
      setPaymentLoading(null);
    }
  };
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Import the usersAPI
      const { usersAPI } = await import('../services/api');

      // Call API to update profile
      const response = await usersAPI.updateProfile(formData);

      // Update the user context with the updated data
      if (response.data?.user) {
        updateUser(response.data.user);
      }

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
  }  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/20 via-amber-50/30 to-yellow-50/20 pt-16">
      {/* Hero Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/40 via-amber-100/50 to-yellow-100/40"></div>
        <div className="absolute inset-0"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-r from-orange-400/80 to-amber-400/80 rounded-full flex items-center justify-center shadow-lg">
                <UserIcon className="h-10 w-10 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {t('profile.title')}
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t('profile.subtitle')}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="relative -mt-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Profile Information */}
          <motion.div
            initial={{ x: -30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="lg:col-span-1"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-orange-100/50 overflow-hidden">
              {/* Profile Card Header */}
              <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 px-6 py-6 border-b border-orange-100/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg">
                      <UserIcon className="h-6 w-6 text-white" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {t('profile.information')}
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="w-10 h-10 bg-orange-100 hover:bg-orange-200 rounded-xl flex items-center justify-center transition-colors duration-200 group"
                  >
                    <PencilIcon className="h-5 w-5 text-orange-600 group-hover:text-orange-700" />
                  </button>
                </div>
              </div>

              <div className="p-6">{isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.fullName')}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-4 py-3 pl-12 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200"
                      />
                      <UserIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.email')}
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-4 py-3 pl-12 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200"
                      />
                      <EnvelopeIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.phone')}
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-3 pl-12 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200"
                      />
                      <PhoneIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-orange-500" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {t('auth.nationality')}
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder={t('auth.nationalityPlaceholder')}
                      className="w-full px-4 py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200"
                    />
                  </div>                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      className="w-full sm:flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-3 px-4 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 font-medium shadow-lg"
                    >
                      {t('profile.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="w-full sm:flex-1 border border-orange-200 text-orange-700 py-3 px-4 rounded-xl hover:bg-orange-50 transition-colors duration-200 font-medium"
                    >
                      {t('profile.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-orange-50/60 to-amber-50/60 rounded-2xl border border-orange-100/50">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Full Name</p>
                      <p className="text-gray-900 font-semibold">{user?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 rounded-2xl border border-emerald-100/50">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <EnvelopeIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Email Address</p>
                      <p className="text-gray-900 font-semibold">{user?.email}</p>
                    </div>
                  </div>

                  {user?.phone && (
                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50/60 to-cyan-50/60 rounded-2xl border border-blue-100/50">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <PhoneIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Phone Number</p>
                        <p className="text-gray-900 font-semibold">{user.phone}</p>
                      </div>
                    </div>
                  )}

                  {user?.nationality && (
                    <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-purple-50/60 to-pink-50/60 rounded-2xl border border-purple-100/50">
                      <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                        <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 font-medium">Nationality</p>
                        <p className="text-gray-900 font-semibold">{user.nationality}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50/60 to-slate-50/60 rounded-2xl border border-gray-100/50">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-medium">Member Since</p>
                      <p className="text-gray-900 font-semibold">{formatDate(user?.createdAt || '')}</p>
                    </div>
                  </div>
                </div>
              )}
              </div>
            </div>
          </motion.div>          {/* Tabs Content */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-3xl shadow-xl border border-orange-100/50 overflow-hidden">              {/* Tab Navigation */}
              <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-b border-orange-100/50">
                <nav className="flex flex-col sm:flex-row gap-2 sm:gap-4 lg:gap-8 px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-3 sm:pb-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className={`py-2.5 sm:py-3 px-3 sm:px-4 border-b-3 font-semibold text-sm rounded-t-xl transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'reservations'
                        ? 'border-orange-400 text-orange-600 bg-white shadow-lg'
                        : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                        activeTab === 'reservations'
                          ? 'bg-orange-100'
                          : 'bg-gray-100'
                      }`}>
                        <CalendarIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          activeTab === 'reservations'
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="text-xs sm:text-sm">{t('profile.reservations')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`py-2.5 sm:py-3 px-3 sm:px-4 border-b-3 font-semibold text-sm rounded-t-xl transition-all duration-200 whitespace-nowrap ${
                      activeTab === 'invoices'
                        ? 'border-orange-400 text-orange-600 bg-white shadow-lg'
                        : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors duration-200 ${
                        activeTab === 'invoices'
                          ? 'bg-orange-100'
                          : 'bg-gray-100'
                      }`}>
                        <DocumentTextIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                          activeTab === 'invoices'
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="text-xs sm:text-sm">{t('profile.invoices')}</span>
                    </div>
                  </button>
                </nav>
              </div>              {/* Tab Content */}
              <div className="p-4 sm:p-6 lg:p-8">{activeTab === 'reservations' && (
                  <div>
                    {reservations.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <span className="text-4xl">🏨</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {t('profile.noReservations')}
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          {t('profile.startBooking')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {reservations.map((reservation, index) => (
                          <motion.div
                            key={reservation._id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-gradient-to-r from-orange-50/60 to-amber-50/60 border border-orange-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
                          >                            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg">
                                      <span className="text-2xl text-white">🏨</span>
                                    </div>
                                    <div>
                                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {reservation.hotelName}
                                      </h3>
                                      <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                        reservation.status === 'confirmed'
                                          ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                                          : reservation.status === 'pending'
                                          ? 'text-amber-700 bg-amber-100 border border-amber-200'
                                          : 'text-red-700 bg-red-100 border border-red-200'
                                      }`}>
                                        {t(`reservations.status.${reservation.status}`)}
                                      </span>
                                    </div>
                                  </div>
                                </div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-4">
                                  <div className="bg-white/70 rounded-xl p-4 border border-orange-100/50">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-600 font-medium">{t('hotels.checkIn')}</span>
                                        <p className="font-semibold text-gray-900">{formatDate(reservation.checkIn)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white/70 rounded-xl p-4 border border-orange-100/50">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                        <CalendarIcon className="h-5 w-5 text-purple-600" />
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-600 font-medium">{t('hotels.checkOut')}</span>
                                        <p className="font-semibold text-gray-900">{formatDate(reservation.checkOut)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white/70 rounded-xl p-4 border border-orange-100/50 sm:col-span-2 lg:col-span-1">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                        <UserIcon className="h-5 w-5 text-green-600" />
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-600 font-medium">{t('hotels.guests')}</span>
                                        <p className="font-semibold text-gray-900">{reservation.guests} {t('hotels.guests')}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>                                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/50 rounded-xl p-4 border border-orange-100/50 gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                      <ClockIcon className="h-4 w-4 text-gray-600" />
                                    </div>
                                    <span className="text-sm text-gray-600">
                                      {t('profile.bookedOn')} {formatDate(reservation.createdAt)}
                                    </span>
                                  </div>
                                </div>
                              </div>                              {reservation.status !== 'cancelled' && (
                                <button
                                  onClick={() => handleCancelReservation(reservation._id)}
                                  className="w-full sm:w-auto lg:w-12 lg:h-12 bg-red-100 hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors duration-200 group px-4 py-2 lg:p-0"
                                  title={t('profile.cancelReservation')}
                                >
                                  <TrashIcon className="h-5 w-5 text-red-600 group-hover:text-red-700" />
                                  <span className="ml-2 lg:hidden text-sm font-medium text-red-600 group-hover:text-red-700">
                                    {t('profile.cancelReservation')}
                                  </span>
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}                  </div>
                )}                {activeTab === 'invoices' && (
                  <div>
                    {invoiceLoading ? (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gradient-to-r from-orange-100 to-amber-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                        </div>
                        <p className="text-gray-600 font-medium">{t('profile.loadingInvoices')}</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="w-24 h-24 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
                          <span className="text-4xl">📄</span>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-3">
                          {t('profile.noInvoices')}
                        </h3>
                        <p className="text-gray-600 max-w-md mx-auto">
                          {t('profile.invoicesWillAppear')}
                        </p>
                      </div>
                    ) : (
                      <div>                        {/* Invoice Summary Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 border border-emerald-200/50 rounded-2xl p-6"
                          >
                            <div className="flex items-center">
                              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                                <CheckCircleIcon className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-emerald-700 mb-1">{t('profile.paidInvoices')}</p>
                                <p className="text-3xl font-bold text-emerald-900">
                                  {invoices.filter(inv => inv.paymentStatus === 'paid').length}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border border-amber-200/50 rounded-2xl p-6"
                          >
                            <div className="flex items-center">
                              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                                <ClockIcon className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-amber-700 mb-1">{t('profile.pendingInvoices')}</p>
                                <p className="text-3xl font-bold text-amber-900">
                                  {invoices.filter(inv => inv.paymentStatus === 'pending' || inv.paymentStatus === 'unpaid').length}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-200/50 rounded-2xl p-6"
                          >
                            <div className="flex items-center">
                              <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                                <DocumentTextIcon className="h-8 w-8 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-blue-700 mb-1">{t('profile.totalAmount')}</p>
                                <p className="text-3xl font-bold text-blue-900">
                                  {invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)} {invoices[0]?.currency || 'SAR'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>                        {/* Invoices List */}
                        <div className="space-y-6">
                          {invoices.map((invoice, index) => (
                            <motion.div
                              key={invoice._id}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className={`bg-gradient-to-r rounded-2xl p-6 border shadow-lg hover:shadow-xl transition-all duration-300 ${
                                invoice.paymentStatus === 'paid'
                                  ? 'from-emerald-50/80 to-green-50/80 border-emerald-200/50'
                                  : 'from-orange-50/80 to-amber-50/80 border-orange-200/50'
                              }`}
                            >                              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shadow-lg ${
                                        invoice.paymentStatus === 'paid'
                                          ? 'bg-gradient-to-r from-emerald-400 to-green-400'
                                          : 'bg-gradient-to-r from-orange-400 to-amber-400'
                                      }`}>
                                        <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                                      </div>
                                      <div>
                                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                                          {t('profile.invoiceNumber')} #{invoice.invoiceNumber}
                                        </h3>
                                        {invoice.paymentStatus === 'paid' && (
                                          <div className="flex items-center gap-2 bg-emerald-100 px-3 py-1 rounded-full">
                                            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                                            <span className="text-sm font-medium text-emerald-800">
                                              {t('profile.completed')}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <span className={`inline-flex px-4 py-2 rounded-full text-sm font-semibold shadow-sm ${
                                      invoice.paymentStatus === 'paid'
                                        ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                                        : invoice.paymentStatus === 'pending'
                                        ? 'text-amber-700 bg-amber-100 border border-amber-200'
                                        : 'text-red-700 bg-red-100 border border-red-200'
                                    }`}>
                                      {t(`profile.paymentStatusValues.${invoice.paymentStatus}`)}
                                    </span>
                                  </div>

                                  {/* Hotel and Booking Details */}
                                  <div className="bg-white/70 rounded-xl p-5 mb-6 border border-white/50 shadow-sm">
                                    <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <span className="text-lg">🏨</span>
                                      </div>
                                      {t('profile.bookingDetails')}
                                    </h4>                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                      <div className="bg-white/80 rounded-lg p-4 border border-blue-100/50">
                                        <span className="text-sm text-blue-600 font-medium">{t('profile.hotelName')}</span>
                                        <p className="font-bold text-gray-900 text-lg">{invoice.hotelName}</p>
                                      </div>
                                      <div className="bg-white/80 rounded-lg p-4 border border-purple-100/50">
                                        <span className="text-sm text-purple-600 font-medium">{t('profile.guestName')}</span>
                                        <p className="font-bold text-gray-900 text-lg">{invoice.clientName}</p>
                                      </div>
                                    </div>
                                  </div>                                  {/* Payment Details */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">                                    <div className="bg-white/70 rounded-xl p-4 border border-white/50 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                                          <CreditCardIcon className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                          <span className="text-sm text-green-600 font-medium">{t('profile.amount')}</span>
                                          <p className="font-bold text-xl text-green-800">
                                            {invoice.amount.toFixed(2)} {invoice.currency}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-white/70 rounded-xl p-4 border border-white/50 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                                          <CalendarIcon className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                          <span className="text-sm text-blue-600 font-medium">{t('profile.issueDate')}</span>
                                          <p className="font-semibold text-gray-900">{formatDate(invoice.issueDate)}</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-white/70 rounded-xl p-4 border border-white/50 shadow-sm">
                                      <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                                          <ClockIcon className="h-5 w-5 text-purple-600" />
                                        </div>
                                        <div>
                                          <span className="text-sm text-purple-600 font-medium">{t('profile.dueDate')}</span>
                                          <p className="font-semibold text-gray-900">{formatDate(invoice.dueDate)}</p>
                                        </div>
                                      </div>
                                    </div>                                    {invoice.paymentStatus === 'paid' && invoice.paymentDetails?.paidAt && (
                                      <div className="bg-white/70 rounded-xl p-4 border border-white/50 shadow-sm sm:col-span-2 lg:col-span-1">
                                        <div className="flex items-center gap-3">
                                          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                            <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
                                          </div>
                                          <div>
                                            <span className="text-sm text-emerald-600 font-medium">{t('profile.paidOn')}</span>
                                            <p className="font-semibold text-emerald-800">
                                              {formatDate(invoice.paymentDetails.paidAt.toString())}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>                                  {invoice.description && (
                                    <div className="mb-6 p-4 bg-white/70 rounded-xl border border-white/50 shadow-sm">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                          <DocumentTextIcon className="h-4 w-4 text-gray-600" />
                                        </div>
                                        <span className="text-sm font-bold text-gray-700">{t('profile.description')}</span>
                                      </div>
                                      <p className="text-gray-900 ml-0 sm:ml-11 font-medium">{invoice.description}</p>
                                    </div>
                                  )}

                                  {/* Payment Method and Transaction Details */}
                                  {invoice.paymentStatus === 'paid' && invoice.paymentDetails && (
                                    <div className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 border border-emerald-200/50 rounded-xl p-5 mb-6 shadow-sm">
                                      <h4 className="font-bold text-emerald-800 mb-4 flex items-center">
                                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center mr-3 shadow-lg">
                                          <CheckCircleIcon className="h-5 w-5 text-white" />
                                        </div>
                                        {t('profile.paymentComplete')}
                                      </h4>                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {invoice.paymentDetails.paymentMethod && (
                                          <div className="bg-white/70 rounded-lg p-4 border border-emerald-100/50">
                                            <span className="text-sm text-emerald-600 font-medium">{t('profile.paymentMethod')}</span>
                                            <p className="font-bold text-emerald-800 capitalize text-lg">
                                              {invoice.paymentDetails.paymentMethod}
                                            </p>
                                          </div>
                                        )}
                                        {invoice.paymentDetails.stripePaymentIntentId && (
                                          <div className="bg-white/70 rounded-lg p-4 border border-emerald-100/50">
                                            <span className="text-sm text-emerald-600 font-medium">{t('profile.transactionId')}</span>
                                            <p className="font-mono text-sm text-emerald-800 font-bold">
                                              {invoice.paymentDetails.stripePaymentIntentId.substring(0, 20)}...
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/50 rounded-xl p-4 border border-white/50 gap-4">
                                    <div className="flex items-center gap-3 text-sm text-gray-600">
                                      <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                        <ClockIcon className="h-4 w-4 text-gray-500" />
                                      </div>
                                      <span className="font-medium">
                                        {t('profile.created')} {formatDate(invoice.createdAt)}
                                      </span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3">
                                      {invoice.paymentStatus === 'unpaid' && (
                                        <button
                                          onClick={() => handlePayNow(invoice._id)}
                                          disabled={paymentLoading === invoice._id}
                                          className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 sm:px-6 py-3 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg text-sm sm:text-base"
                                        >
                                          {paymentLoading === invoice._id ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                          ) : (
                                            <CreditCardIcon className="h-5 w-5" />
                                          )}
                                          <span>
                                            {paymentLoading === invoice._id
                                              ? t('profile.processing')
                                              : `${t('profile.payNow')} ${invoice.amount.toFixed(2)} ${invoice.currency}`
                                            }
                                          </span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleViewInvoice(invoice._id)}
                                        className="w-full sm:w-auto border border-orange-200 text-orange-700 px-4 sm:px-5 py-3 rounded-xl hover:bg-orange-50 transition-colors duration-200 flex items-center justify-center gap-2 font-semibold text-sm sm:text-base"
                                      >
                                        <DocumentTextIcon className="h-5 w-5" />
                                        <span>{t('profile.viewInvoice')}</span>
                                      </button>
                                      {invoice.paymentStatus === 'paid' && (
                                        <button
                                          onClick={() => handleDownloadReceipt(invoice._id)}
                                          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 sm:px-5 py-3 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center gap-2 font-semibold shadow-lg text-sm sm:text-base"
                                        >
                                          <DocumentTextIcon className="h-5 w-5" />
                                          <span>{t('profile.downloadReceipt')}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>        </div>
      </div>

      {/* Invoice Detail Modal */}
      <InvoiceDetailModal
        isOpen={isInvoiceModalOpen}
        onClose={handleCloseInvoiceModal}
        invoice={selectedInvoice}
        onDownloadReceipt={handleDownloadReceipt}
      />
    </div>
  );
};
