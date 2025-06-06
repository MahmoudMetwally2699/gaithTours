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
import { useDirection } from '../hooks/useDirection';

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
  const { isRTL } = useDirection();

  // Get tab from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const tabFromUrl = urlParams.get('tab') || 'reservations';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isProfileExpanded, setIsProfileExpanded] = useState(false);const [loading, setLoading] = useState(true);
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
      {/* Compact Mobile Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-100/40 via-amber-100/50 to-yellow-100/40"></div>
        <div className="absolute inset-0"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='0.05'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Mobile Avatar - Smaller and Centered */}
            <div className="flex justify-center mb-3">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-orange-400/80 to-amber-400/80 rounded-full flex items-center justify-center shadow-lg">
                <UserIcon className="h-8 w-8 lg:h-10 lg:w-10 text-white" />
              </div>
            </div>

            {/* Compact Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
              {user?.name || t('profile.title')}
            </h1>
            <p className="text-sm lg:text-base text-gray-600 mb-4">
              {user?.email}
            </p>

            {/* Quick Stats Grid - Mobile First */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-orange-100/50 shadow-lg"
              >
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-orange-600">{reservations.length}</p>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('profile.reservations')}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-blue-100/50 shadow-lg"
              >
                <div className="text-center">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">{invoices.length}</p>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">{t('profile.invoices')}</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>      <div className="relative -mt-4 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Mobile-First Layout */}
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Collapsible Profile Information - Mobile First */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-1"
          >            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-lg lg:shadow-xl border border-orange-100/50 overflow-hidden">
              {/* Collapsible Profile Header */}
              <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 px-4 py-4 lg:px-6 lg:py-6 border-b border-orange-100/50">                <button
                  onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                  className="w-full flex items-center justify-between"
                >
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                      <UserIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <h2 className={`text-lg lg:text-xl font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('profile.information')}
                    </h2>
                  </div>
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className={`hidden sm:inline text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {isProfileExpanded ? 'Collapse' : 'Expand'}
                    </span>
                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 hover:bg-orange-200 rounded-lg lg:rounded-xl flex items-center justify-center transition-colors duration-200 group">
                      <svg
                        className={`h-4 w-4 lg:h-5 lg:w-5 text-orange-600 group-hover:text-orange-700 transition-transform duration-200 ${isProfileExpanded ? 'rotate-180' : ''} ${isRTL ? 'scale-x-[-1]' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>

              {/* Collapsible Profile Content */}
              <motion.div
                initial={false}
                animate={{
                  height: isProfileExpanded ? 'auto' : 0,
                  opacity: isProfileExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div className="p-4 lg:p-6">                  {/* Edit Button - Only show when expanded */}
                  {isProfileExpanded && (
                    <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'} mb-4`}>
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 text-sm text-orange-600 hover:text-orange-700 font-medium ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <PencilIcon className="h-4 w-4" />
                        {isEditing ? t('profile.cancel') : t('profile.edit')}
                      </button>
                    </div>
                  )}

                  {/* Profile Content */}
                  {isEditing ? (
                    <form onSubmit={handleUpdateProfile} className="space-y-4 lg:space-y-6">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('auth.fullName')}
                        </label>                        <div className="relative">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className={`w-full px-3 py-2.5 lg:px-4 lg:py-3 ${isRTL ? 'pr-10 lg:pr-12 pl-3 lg:pl-4' : 'pl-10 lg:pl-12 pr-3 lg:pr-4'} border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200 text-sm lg:text-base`}
                          />
                          <UserIcon className={`absolute ${isRTL ? 'right-3 lg:right-4' : 'left-3 lg:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-orange-500`} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('auth.email')}
                        </label>                        <div className="relative">
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className={`w-full px-3 py-2.5 lg:px-4 lg:py-3 ${isRTL ? 'pr-10 lg:pr-12 pl-3 lg:pl-4' : 'pl-10 lg:pl-12 pr-3 lg:pr-4'} border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200 text-sm lg:text-base`}
                          />
                          <EnvelopeIcon className={`absolute ${isRTL ? 'right-3 lg:right-4' : 'left-3 lg:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-orange-500`} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {t('auth.phone')}
                        </label>                        <div className="relative">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className={`w-full px-3 py-2.5 lg:px-4 lg:py-3 ${isRTL ? 'pr-10 lg:pr-12 pl-3 lg:pl-4' : 'pl-10 lg:pl-12 pr-3 lg:pr-4'} border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200 text-sm lg:text-base`}
                          />
                          <PhoneIcon className={`absolute ${isRTL ? 'right-3 lg:right-4' : 'left-3 lg:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 lg:h-5 lg:w-5 text-orange-500`} />
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
                          className="w-full px-3 py-2.5 lg:px-4 lg:py-3 border border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-orange-50/30 transition-all duration-200 text-sm lg:text-base"
                        />
                      </div>                      <div className={`flex flex-col sm:flex-row gap-3 pt-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                        <button
                          type="submit"
                          className="w-full sm:flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 lg:py-3 px-4 rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all duration-200 font-medium shadow-lg text-sm lg:text-base"
                        >
                          {t('profile.save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="w-full sm:flex-1 border border-orange-200 text-orange-700 py-2.5 lg:py-3 px-4 rounded-xl hover:bg-orange-50 transition-colors duration-200 font-medium text-sm lg:text-base"
                        >
                          {t('profile.cancel')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 lg:space-y-4">                      {/* Compact Profile Cards */}
                      <div className={`flex items-center gap-3 p-3 lg:p-4 bg-gradient-to-r from-orange-50/60 to-amber-50/60 rounded-xl lg:rounded-2xl border border-orange-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-orange-100 rounded-lg lg:rounded-xl flex items-center justify-center">
                          <UserIcon className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs lg:text-sm text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.fullName')}</p>
                          <p className={`text-gray-900 font-semibold text-sm lg:text-base truncate ${isRTL ? 'text-right' : 'text-left'}`}>{user?.name}</p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-3 p-3 lg:p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/60 rounded-xl lg:rounded-2xl border border-emerald-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-emerald-100 rounded-lg lg:rounded-xl flex items-center justify-center">
                          <EnvelopeIcon className="h-4 w-4 lg:h-5 lg:w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs lg:text-sm text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.email')}</p>
                          <p className={`text-gray-900 font-semibold text-sm lg:text-base truncate ${isRTL ? 'text-right' : 'text-left'}`}>{user?.email}</p>
                        </div>
                      </div>                      {user?.phone && (
                        <div className={`flex items-center gap-3 p-3 lg:p-4 bg-gradient-to-r from-blue-50/60 to-cyan-50/60 rounded-xl lg:rounded-2xl border border-blue-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-blue-100 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <PhoneIcon className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs lg:text-sm text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.phone')}</p>
                            <p className={`text-gray-900 font-semibold text-sm lg:text-base ${isRTL ? 'text-right' : 'text-left'}`}>{user.phone}</p>
                          </div>
                        </div>
                      )}

                      {user?.nationality && (
                        <div className={`flex items-center gap-3 p-3 lg:p-4 bg-gradient-to-r from-purple-50/60 to-pink-50/60 rounded-xl lg:rounded-2xl border border-purple-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-purple-100 rounded-lg lg:rounded-xl flex items-center justify-center">
                            <svg className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs lg:text-sm text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t('auth.nationality')}</p>
                            <p className={`text-gray-900 font-semibold text-sm lg:text-base ${isRTL ? 'text-right' : 'text-left'}`}>{user.nationality}</p>
                          </div>
                        </div>
                      )}

                      <div className={`flex items-center gap-3 p-3 lg:p-4 bg-gradient-to-r from-gray-50/60 to-slate-50/60 rounded-xl lg:rounded-2xl border border-gray-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gray-100 rounded-lg lg:rounded-xl flex items-center justify-center">
                          <CalendarIcon className="h-4 w-4 lg:h-5 lg:w-5 text-gray-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs lg:text-sm text-gray-500 font-medium ${isRTL ? 'text-right' : 'text-left'}`}>Member Since</p>
                          <p className={`text-gray-900 font-semibold text-sm lg:text-base ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(user?.createdAt || '')}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>{/* Mobile-Optimized Tabs Content */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl lg:rounded-3xl shadow-lg lg:shadow-xl border border-orange-100/50 overflow-hidden">
              {/* Mobile-First Tab Navigation */}
              <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-b border-orange-100/50">
                <nav className="flex gap-2 px-4 py-3 lg:gap-4 lg:px-6 lg:py-4">
                  <button
                    onClick={() => setActiveTab('reservations')}
                    className={`flex-1 lg:flex-none py-2.5 px-3 lg:py-3 lg:px-4 border-b-2 font-semibold text-sm rounded-t-lg transition-all duration-200 ${
                      activeTab === 'reservations'
                        ? 'border-orange-400 text-orange-600 bg-white shadow-md'
                        : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                      <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                        activeTab === 'reservations'
                          ? 'bg-orange-100'
                          : 'bg-gray-100'
                      }`}>
                        <CalendarIcon className={`h-4 w-4 ${
                          activeTab === 'reservations'
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="hidden sm:inline">{t('profile.reservations')}</span>
                      <span className="sm:hidden">({reservations.length})</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab('invoices')}
                    className={`flex-1 lg:flex-none py-2.5 px-3 lg:py-3 lg:px-4 border-b-2 font-semibold text-sm rounded-t-lg transition-all duration-200 ${
                      activeTab === 'invoices'
                        ? 'border-orange-400 text-orange-600 bg-white shadow-md'
                        : 'border-transparent text-gray-500 hover:text-orange-600 hover:bg-orange-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-center lg:justify-start gap-2">
                      <div className={`w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${
                        activeTab === 'invoices'
                          ? 'bg-orange-100'
                          : 'bg-gray-100'
                      }`}>
                        <DocumentTextIcon className={`h-4 w-4 ${
                          activeTab === 'invoices'
                            ? 'text-orange-600'
                            : 'text-gray-500'
                        }`} />
                      </div>
                      <span className="hidden sm:inline">{t('profile.invoices')}</span>
                      <span className="sm:hidden">({invoices.length})</span>
                    </div>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4 lg:p-6">{activeTab === 'reservations' && (
                  <div>
                    {reservations.length === 0 ? (
                      <div className="text-center py-12 lg:py-16">
                        <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                          <span className="text-3xl lg:text-4xl">🏨</span>
                        </div>
                        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                          {t('profile.noReservations')}
                        </h3>
                        <p className="text-sm lg:text-base text-gray-600 max-w-md mx-auto">
                          {t('profile.startBooking')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4 lg:space-y-6">
                        {reservations.map((reservation, index) => (
                          <motion.div
                            key={reservation._id}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="bg-gradient-to-r from-orange-50/60 to-amber-50/60 border border-orange-100 rounded-xl lg:rounded-2xl p-4 lg:p-6 hover:shadow-lg transition-all duration-300"
                          >
                            {/* Mobile-Optimized Reservation Card */}
                            <div className="space-y-4">                              {/* Header Row */}
                              <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className="w-12 h-12 lg:w-14 lg:h-14 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg">
                                    <span className="text-xl lg:text-2xl text-white">🏨</span>
                                  </div>                                  <div className="flex-1 min-w-0">
                                    <h3 className={`text-lg lg:text-xl font-bold text-gray-900 mb-1 break-words ${isRTL ? 'text-right' : 'text-left'}`}>
                                      {reservation.hotelName}
                                    </h3>
                                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs lg:text-sm font-medium ${
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

                                {/* Action Button */}
                                {reservation.status !== 'cancelled' && (
                                  <button
                                    onClick={() => handleCancelReservation(reservation._id)}
                                    className="w-10 h-10 bg-red-100 hover:bg-red-200 rounded-lg flex items-center justify-center transition-colors duration-200 group flex-shrink-0"
                                    title={t('profile.cancelReservation')}
                                  >
                                    <TrashIcon className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                                  </button>
                                )}
                              </div>

                              {/* Details Grid - Compact Mobile Layout */}
                              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">                                <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50">
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                      <CalendarIcon className="h-3 w-3 lg:h-4 lg:w-4 text-blue-600" />
                                    </div>                                    <div className="flex-1 min-w-0">
                                      <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkIn')}</span>
                                      <p className={`font-semibold text-gray-900 text-sm break-words ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(reservation.checkIn)}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50">
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                      <CalendarIcon className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                                    </div>                                    <div className="flex-1 min-w-0">
                                      <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.checkOut')}</span>
                                      <p className={`font-semibold text-gray-900 text-sm break-words ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(reservation.checkOut)}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50 col-span-2 lg:col-span-1">
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                      <UserIcon className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('hotels.guests')}</span>
                                      <p className={`font-semibold text-gray-900 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{reservation.guests} {t('hotels.guests')}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>                              {/* Footer */}
                              <div className={`flex items-center gap-2 bg-white/50 rounded-lg lg:rounded-xl p-3 border border-orange-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                                  <ClockIcon className="h-3 w-3 text-gray-600" />
                                </div>
                                <span className={`text-xs lg:text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {t('profile.bookedOn')} {formatDate(reservation.createdAt)}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}                {activeTab === 'invoices' && (
                  <div>
                    {invoiceLoading ? (
                      <div className="text-center py-12 lg:py-16">
                        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                        </div>
                        <p className="text-gray-600 font-medium text-sm lg:text-base">{t('profile.loadingInvoices')}</p>
                      </div>
                    ) : invoices.length === 0 ? (
                      <div className="text-center py-12 lg:py-16">
                        <div className="w-20 h-20 lg:w-24 lg:h-24 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl lg:rounded-3xl flex items-center justify-center mx-auto mb-4 lg:mb-6">
                          <span className="text-3xl lg:text-4xl">📄</span>
                        </div>
                        <h3 className="text-lg lg:text-xl font-semibold text-gray-900 mb-2 lg:mb-3">
                          {t('profile.noInvoices')}
                        </h3>
                        <p className="text-sm lg:text-base text-gray-600 max-w-md mx-auto">
                          {t('profile.invoicesWillAppear')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        {/* Compact Invoice Summary Stats - Mobile First */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 mb-4 lg:mb-6">
                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="bg-gradient-to-r from-emerald-50/80 to-green-50/80 border border-emerald-200/50 rounded-xl lg:rounded-2xl p-3 lg:p-4"
                          >                            <div className={`flex items-center gap-2 lg:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                <CheckCircleIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs lg:text-sm font-semibold text-emerald-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.paidInvoices')}</p>
                                <p className={`text-xl lg:text-2xl font-bold text-emerald-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {invoices.filter(inv => inv.paymentStatus === 'paid').length}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border border-amber-200/50 rounded-xl lg:rounded-2xl p-3 lg:p-4"
                          >                            <div className={`flex items-center gap-2 lg:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                <ClockIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs lg:text-sm font-semibold text-amber-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.pendingInvoices')}</p>
                                <p className={`text-xl lg:text-2xl font-bold text-amber-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {invoices.filter(inv => inv.paymentStatus === 'pending' || inv.paymentStatus === 'unpaid').length}
                                </p>
                              </div>
                            </div>
                          </motion.div>

                          <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="bg-gradient-to-r from-blue-50/80 to-cyan-50/80 border border-blue-200/50 rounded-xl lg:rounded-2xl p-3 lg:p-4 col-span-2 lg:col-span-1"
                          >                            <div className={`flex items-center gap-2 lg:gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-500 rounded-lg lg:rounded-xl flex items-center justify-center shadow-lg">
                                <DocumentTextIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs lg:text-sm font-semibold text-blue-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.totalAmount')}</p>
                                <p className={`text-xl lg:text-2xl font-bold text-blue-900 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {invoices.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)} {invoices[0]?.currency || 'SAR'}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        </div>                        {/* Compact Mobile-Optimized Invoices List */}
                        <div className="space-y-4 lg:space-y-6">
                          {invoices.map((invoice, index) => (
                            <motion.div
                              key={invoice._id}
                              initial={{ y: 20, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                              className={`rounded-xl lg:rounded-2xl p-4 lg:p-6 border hover:shadow-lg transition-all duration-300 ${
                                invoice.paymentStatus === 'paid'
                                  ? 'bg-gradient-to-r from-emerald-50/60 to-green-50/60 border-emerald-100'
                                  : 'bg-gradient-to-r from-orange-50/60 to-amber-50/60 border-orange-100'
                              }`}
                            >
                              {/* Compact Invoice Card Layout */}
                              <div className="space-y-4">                                {/* Header Row */}
                                <div className={`flex items-start justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className={`flex items-center gap-3 flex-1 min-w-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg ${
                                      invoice.paymentStatus === 'paid'
                                        ? 'bg-gradient-to-r from-emerald-400 to-green-400'
                                        : 'bg-gradient-to-r from-orange-400 to-amber-400'
                                    }`}>
                                      <DocumentTextIcon className="h-6 w-6 lg:h-7 lg:w-7 text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className={`text-lg lg:text-xl font-bold text-gray-900 mb-1 break-words ${isRTL ? 'text-right' : 'text-left'}`}>
                                        #{invoice.invoiceNumber}
                                      </h3>
                                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs lg:text-sm font-medium ${
                                        invoice.paymentStatus === 'paid'
                                          ? 'text-emerald-700 bg-emerald-100 border border-emerald-200'
                                          : invoice.paymentStatus === 'pending'
                                          ? 'text-amber-700 bg-amber-100 border border-amber-200'
                                          : 'text-red-700 bg-red-100 border border-red-200'
                                      }`}>
                                        {t(`profile.paymentStatusValues.${invoice.paymentStatus}`)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Details Grid - Compact Mobile Layout */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">                                  <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50">
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-blue-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                        <span className="text-xl lg:text-2xl">🏨</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.hotelName')}</span>
                                        <p className={`font-semibold text-gray-900 text-sm break-words ${isRTL ? 'text-right' : 'text-left'}`}>{invoice.hotelName}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50">
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-green-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                        <CreditCardIcon className="h-3 w-3 lg:h-4 lg:w-4 text-green-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.amount')}</span>
                                        <p className={`font-semibold text-gray-900 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                          {invoice.amount.toFixed(2)} {invoice.currency}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="bg-white/70 rounded-lg lg:rounded-xl p-3 border border-orange-100/50 col-span-2 lg:col-span-1">
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="w-6 h-6 lg:w-8 lg:h-8 bg-purple-100 rounded-md lg:rounded-lg flex items-center justify-center">
                                        <CalendarIcon className="h-3 w-3 lg:h-4 lg:w-4 text-purple-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <span className={`text-xs text-gray-600 font-medium block ${isRTL ? 'text-right' : 'text-left'}`}>{t('profile.dueDate')}</span>
                                        <p className={`font-semibold text-gray-900 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{formatDate(invoice.dueDate)}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>                                {/* Payment Status Footer */}
                                {invoice.paymentStatus === 'paid' && invoice.paymentDetails?.paidAt ? (
                                  <div className={`flex items-center gap-2 bg-emerald-50/50 rounded-lg lg:rounded-xl p-3 border border-emerald-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center">
                                      <CheckCircleIcon className="h-3 w-3 text-emerald-600" />
                                    </div>
                                    <span className={`text-xs lg:text-sm text-emerald-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                      {t('profile.paidOn')} {formatDate(invoice.paymentDetails.paidAt.toString())}
                                    </span>
                                  </div>
                                ) : (
                                  <div className={`flex items-center gap-2 bg-white/50 rounded-lg lg:rounded-xl p-3 border border-orange-100/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <div className="w-6 h-6 bg-gray-100 rounded-md flex items-center justify-center">
                                      <UserIcon className="h-3 w-3 text-gray-600" />
                                    </div>
                                    <span className={`text-xs lg:text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                                      {t('profile.guestName')}: {invoice.clientName}
                                    </span>
                                  </div>
                                )}                                {/* Compact Action Buttons */}
                                <div className="flex flex-col gap-2">
                                  {invoice.paymentStatus === 'unpaid' && (
                                    <button
                                      onClick={() => handlePayNow(invoice._id)}
                                      disabled={paymentLoading === invoice._id}
                                      className={`w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 px-4 rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                      {paymentLoading === invoice._id ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                      ) : (
                                        <CreditCardIcon className="h-4 w-4" />
                                      )}
                                      <span>
                                        {paymentLoading === invoice._id
                                          ? t('profile.processing')
                                          : `${t('profile.payNow')} ${invoice.amount.toFixed(2)} ${invoice.currency}`
                                        }
                                      </span>
                                    </button>
                                  )}

                                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <button
                                      onClick={() => handleViewInvoice(invoice._id)}
                                      className={`flex-1 border border-orange-200 text-orange-700 py-2 px-3 rounded-lg hover:bg-orange-50 transition-colors duration-200 flex items-center justify-center gap-2 font-medium text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                                    >
                                      <DocumentTextIcon className="h-4 w-4" />
                                      <span>{t('profile.viewInvoice')}</span>
                                    </button>

                                    {invoice.paymentStatus === 'paid' && (
                                      <button
                                        onClick={() => handleDownloadReceipt(invoice._id)}
                                        className={`flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-2 px-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 flex items-center justify-center gap-2 font-medium shadow-md text-sm ${isRTL ? 'flex-row-reverse' : ''}`}
                                      >
                                        <DocumentTextIcon className="h-4 w-4" />
                                        <span>Receipt</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        </div>
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
