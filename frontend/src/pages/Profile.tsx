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
                   apiRes.status === 'pending' ? 'pending' :
                   apiRes.status === 'cancelled' ? 'cancelled' : 'pending', // Default to pending instead of cancelled
            createdAt: apiRes.createdAt
          }));
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
        </motion.div>        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  </div>                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.phone')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('auth.nationality')}
                    </label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      placeholder={t('auth.nationalityPlaceholder')}
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
                  </div>                  {user?.phone && (
                    <div className="flex items-center space-x-3">
                      <PhoneIcon className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900">{user.phone}</span>
                    </div>
                  )}
                  {user?.nationality && (
                    <div className="flex items-center space-x-3">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-gray-900">{user.nationality}</span>
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

          {/* Tabs Content */}
          <motion.div
            initial={{ x: 30, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-lg shadow-lg">
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6 pt-6">
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'reservations'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <CalendarIcon className="h-5 w-5" />
                      <span>{t('profile.reservations')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'invoices'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <DocumentTextIcon className="h-5 w-5" />
                      <span>{t('profile.invoices')}</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'reservations' && (
                  <div>
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
                                </h3>                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
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
                    )}                  </div>
                )}

                {activeTab === 'invoices' && (
                  <div>
                    {invoiceLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                        <p className="text-gray-600 mt-2">{t('profile.loadingInvoices')}</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="text-6xl mb-4">📄</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {t('profile.noInvoices')}
                        </h3>
                        <p className="text-gray-600">
                          {t('profile.invoicesWillAppear')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Invoice Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <CheckCircleIcon className="h-8 w-8 text-green-600 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-green-600">{t('profile.paidInvoices')}</p>
                                <p className="text-2xl font-bold text-green-900">
                                  {invoices.filter(inv => inv.paymentStatus === 'paid').length}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <ClockIcon className="h-8 w-8 text-yellow-600 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-yellow-600">{t('profile.pendingInvoices')}</p>
                                <p className="text-2xl font-bold text-yellow-900">
                                  {invoices.filter(inv => inv.paymentStatus === 'pending' || inv.paymentStatus === 'unpaid').length}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                              <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                              <div>
                                <p className="text-sm font-medium text-blue-600">{t('profile.totalAmount')}</p>
                                <p className="text-2xl font-bold text-blue-900">
                                  {invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)} {invoices[0]?.currency || 'SAR'}
                                </p>
                              </div>
                            </div>                          </div>
                        </div>

                        {/* Invoices List */}
                        <div className="space-y-4">
                          {invoices.map((invoice) => (
                            <div
                              key={invoice._id}
                              className={`border rounded-lg p-6 transition-all duration-200 ${
                                invoice.paymentStatus === 'paid'
                                  ? 'border-green-200 bg-green-50 hover:shadow-md'
                                  : 'border-gray-200 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <h3 className="text-xl font-semibold text-gray-900">
                                        {t('profile.invoiceNumber')} #{invoice.invoiceNumber}
                                      </h3>
                                      {invoice.paymentStatus === 'paid' && (
                                        <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                                          <span className="text-sm font-medium text-green-800">
                                            {t('profile.completed')}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                                      invoice.paymentStatus === 'paid'
                                        ? 'text-green-700 bg-green-100 border border-green-200'
                                        : invoice.paymentStatus === 'pending'
                                        ? 'text-yellow-700 bg-yellow-100 border border-yellow-200'
                                        : 'text-red-700 bg-red-100 border border-red-200'
                                    }`}>
                                      {t(`profile.paymentStatusValues.${invoice.paymentStatus}`)}
                                    </span>
                                  </div>

                                  {/* Hotel and Booking Details */}
                                  <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100">
                                    <h4 className="font-semibold text-gray-900 mb-2">{t('profile.bookingDetails')}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <span className="text-sm text-gray-500">{t('profile.hotelName')}</span>
                                        <p className="font-medium text-gray-900">{invoice.hotelName}</p>
                                      </div>
                                      <div>
                                        <span className="text-sm text-gray-500">{t('profile.guestName')}</span>
                                        <p className="font-medium text-gray-900">{invoice.clientName}</p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Payment Details */}
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                    <div>
                                      <span className="text-sm text-gray-500">{t('profile.amount')}</span>
                                      <p className="font-bold text-xl text-primary-600">
                                        {invoice.amount.toFixed(2)} {invoice.currency}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-500">{t('profile.issueDate')}</span>
                                      <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                                    </div>
                                    <div>
                                      <span className="text-sm text-gray-500">{t('profile.dueDate')}</span>
                                      <p className="font-medium">{formatDate(invoice.dueDate)}</p>
                                    </div>
                                    {invoice.paymentStatus === 'paid' && invoice.paymentDetails?.paidAt && (
                                      <div>
                                        <span className="text-sm text-gray-500">{t('profile.paidOn')}</span>                                        <p className="font-medium text-green-600">
                                          {formatDate(invoice.paymentDetails.paidAt.toString())}
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {invoice.description && (
                                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                                      <span className="text-sm font-medium text-gray-700">{t('profile.description')}</span>
                                      <p className="text-gray-900 mt-1">{invoice.description}</p>
                                    </div>
                                  )}

                                  {/* Payment Method and Transaction Details */}
                                  {invoice.paymentStatus === 'paid' && invoice.paymentDetails && (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                      <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                                        {t('profile.paymentComplete')}
                                      </h4>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {invoice.paymentDetails.paymentMethod && (
                                          <div>
                                            <span className="text-sm text-green-600">{t('profile.paymentMethod')}</span>
                                            <p className="font-medium text-green-800 capitalize">
                                              {invoice.paymentDetails.paymentMethod}
                                            </p>
                                          </div>
                                        )}
                                        {invoice.paymentDetails.stripePaymentIntentId && (
                                          <div>
                                            <span className="text-sm text-green-600">{t('profile.transactionId')}</span>
                                            <p className="font-mono text-sm text-green-800">
                                              {invoice.paymentDetails.stripePaymentIntentId.substring(0, 20)}...
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between">
                                    <div className="text-sm text-gray-500">
                                      <ClockIcon className="h-4 w-4 inline mr-1" />
                                      {t('profile.created')} {formatDate(invoice.createdAt)}
                                    </div>

                                    <div className="flex space-x-3">
                                      {invoice.paymentStatus === 'unpaid' && (
                                        <button
                                          onClick={() => handlePayNow(invoice._id)}
                                          disabled={paymentLoading === invoice._id}
                                          className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                        >
                                          {paymentLoading === invoice._id ? (
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
                                      )}                                      <button
                                        onClick={() => handleViewInvoice(invoice._id)}
                                        className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                                      >
                                        <DocumentTextIcon className="h-4 w-4" />
                                        <span>{t('profile.viewInvoice')}</span>
                                      </button>
                                      {invoice.paymentStatus === 'paid' && (
                                        <button
                                          onClick={() => handleDownloadReceipt(invoice._id)}
                                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
                                        >
                                          <DocumentTextIcon className="h-4 w-4" />
                                          <span>{t('profile.downloadReceipt')}</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
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
