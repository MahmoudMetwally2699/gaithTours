import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  UserGroupIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { AdminBookingModal } from './AdminBookingModal';
import { Pagination } from './Pagination';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
}

interface Hotel {
  name: string;
  image?: string;
  city: string;
}

interface Booking {
  _id: string;
  touristName: string;
  email: string;
  hotel: Hotel;
  status: string;
  createdAt: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalBookings: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface BookingsTabProps {
  bookings: Booking[];
  bookingStatus: string;
  setBookingStatus: (status: string) => void;
  isRTL: boolean;
  getStatusBadge: (status: string, type: string) => React.ReactNode;
  setSelectedBooking: (booking: Booking) => void;
  setShowBookingDetailsModal: (show: boolean) => void;
  setShowApprovalModal: (show: boolean) => void;
  setShowDenialModal: (show: boolean) => void;
  clients: Client[];
  onRefreshBookings: () => void;
  isCreatingBooking?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
}

export const BookingsTab: React.FC<BookingsTabProps> = ({
  bookings,
  bookingStatus,
  setBookingStatus,
  isRTL,
  getStatusBadge,
  setSelectedBooking,
  setShowBookingDetailsModal,
  setShowApprovalModal,
  setShowDenialModal,
  clients,
  onRefreshBookings,
  isCreatingBooking = false,
  pagination,
  onPageChange,
  itemsPerPage = 10,
  onItemsPerPageChange,
}) => {
  const { t } = useTranslation(['admin']);
  const [showCreateBookingModal, setShowCreateBookingModal] = useState(false);

  // Filter bookings based on status
  const filteredBookings = bookingStatus
    ? bookings.filter(booking => booking.status === bookingStatus)
    : bookings;

  return (
    <div
      className="space-y-8"
    >
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 rounded-3xl blur-3xl"></div>        <div className="relative bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {t('admin:dashboard.bookings.title')}
                </h2>
                <p className="text-gray-600 mt-1">{t('admin:dashboard.bookings.subtitle')}</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Create Booking Button */}
              <button
                onClick={() => setShowCreateBookingModal(true)}
                disabled={isCreatingBooking}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                <span className="font-medium">{t('admin:dashboard.bookings.createBooking')}</span>
              </button>

              {/* Modern Status Filter */}
              <div className="relative group w-full md:w-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                <div className="relative bg-white/80 backdrop-blur-xl border border-white/30 rounded-2xl p-1 shadow-lg">
                  <select
                    value={bookingStatus}
                    onChange={(e) => setBookingStatus(e.target.value)}
                    className="w-full md:w-48 px-4 py-3 bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-700 rounded-xl font-medium cursor-pointer"
                  >
                    <option value="">{t('admin:dashboard.bookings.allStatus')}</option>
                    <option value="pending">{t('admin:dashboard.status.pending')}</option>
                    <option value="approved">{t('admin:dashboard.status.approved')}</option>
                    <option value="denied">{t('admin:dashboard.status.denied')}</option>
                    <option value="invoiced">{t('admin:dashboard.status.invoiced')}</option>
                    <option value="paid">{t('admin:dashboard.status.paid')}</option>
                    <option value="confirmed">{t('admin:dashboard.status.confirmed')}</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table / Mobile Cards */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur-sm">
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  <div className="flex items-center space-x-2">
                    <UserGroupIcon className="w-4 h-4 text-blue-600" />
                    <span>{t('admin:dashboard.bookings.clientName')}</span>
                  </div>
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.bookings.email')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.bookings.hotelName')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.bookings.submissionDate')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.bookings.status')}
                </th>
                <th className={`px-8 py-6 ${isRTL ? 'text-right' : 'text-left'} text-sm font-bold text-gray-700 uppercase tracking-wider`}>
                  {t('admin:dashboard.bookings.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {filteredBookings.map((booking, index) => (
                <tr
                  key={booking._id}
                  className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-300 group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                        {booking.touristName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-base font-medium text-gray-900">{booking.touristName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">{booking.email}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-3">
                      {booking.hotel.image && (
                        <img
                          src={booking.hotel.image}
                          alt={booking.hotel.name}
                          className="w-8 h-8 rounded-lg object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">{booking.hotel.name}</p>
                        <p className="text-xs text-gray-500">{booking.hotel.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-700">
                    {new Date(booking.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                  </td>
                  <td className="px-8 py-6">
                    {getStatusBadge(booking.status, 'booking')}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setShowBookingDetailsModal(true);
                        }}
                        className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowApprovalModal(true);
                            }}
                            className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                          >
                            <CheckIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowDenialModal(true);
                            }}
                            className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-110 shadow-lg"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4 p-4">
          {filteredBookings.map((booking, index) => (
            <div
              key={booking._id}
              className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 backdrop-blur-sm rounded-2xl p-4 border border-blue-200/50 hover:border-blue-300/50 transition-all duration-300 hover:shadow-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                    {booking.touristName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 text-base">{booking.touristName}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <p className="text-sm text-gray-600">{booking.email}</p>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(booking.status, 'booking')}
                </div>
              </div>

              <div className="flex items-center space-x-3 mb-3">
                {booking.hotel.image && (
                  <img
                    src={booking.hotel.image}
                    alt={booking.hotel.name}
                    className="w-12 h-12 rounded-lg object-cover shadow-md"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{booking.hotel.name}</p>
                  <p className="text-sm text-gray-600">{booking.hotel.city}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm mb-3">
                <div>
                  <p className="text-gray-500 font-medium">{t('admin:dashboard.bookings.submissionDate')}</p>
                  <p className="text-gray-900 font-semibold">{new Date(booking.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-blue-200/50">
                <button
                  onClick={() => {
                    setSelectedBooking(booking);
                    setShowBookingDetailsModal(true);
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                >
                  <EyeIcon className="w-4 h-4" />
                  <span className="text-xs font-medium">{t('admin:dashboard.bookings.details.view')}</span>
                </button>
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowApprovalModal(true);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <CheckIcon className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('admin:dashboard.bookings.approvalModal.approve')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedBooking(booking);
                        setShowDenialModal(true);
                      }}
                      className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg transition-all duration-300 hover:scale-105 shadow-lg"
                    >
                      <XMarkIcon className="w-4 h-4" />                      <span className="text-xs font-medium">{t('admin:dashboard.bookings.denialModal.deny')}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pagination && onPageChange && (
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalBookings}
            itemsPerPage={itemsPerPage}
            onPageChange={onPageChange}
            onItemsPerPageChange={onItemsPerPageChange}
            isRTL={isRTL}
            itemName="bookings"
          />
        )}
      </div>

      {/* Admin Booking Modal */}
      <AdminBookingModal
        isOpen={showCreateBookingModal}
        onClose={() => setShowCreateBookingModal(false)}
        onSuccess={() => {
          onRefreshBookings();
          toast.success(t('admin:dashboard.messages.bookingCreated'));
        }}
        clients={clients}
        isLoading={isCreatingBooking}
      />
    </div>
  );
};
