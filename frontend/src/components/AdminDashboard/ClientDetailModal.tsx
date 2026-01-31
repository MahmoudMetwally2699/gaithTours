import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  XMarkIcon,
  UserCircleIcon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  CalendarIcon,
  PencilIcon,
  CheckIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  createdAt: string;
}

interface Booking {
  _id: string;
  hotel: {
    name: string;
    city?: string;
  };
  status: string;
  checkInDate?: string;
  checkOutDate?: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
}

interface ClientDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate?: (updatedClient: Client) => void;
  isRTL?: boolean;
}

export const ClientDetailModal: React.FC<ClientDetailModalProps> = ({
  isOpen,
  onClose,
  client,
  onUpdate,
  isRTL = false,
}) => {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [clientDetails, setClientDetails] = useState<{
    client: Client;
    bookings: Booking[];
    invoices: Invoice[];
  } | null>(null);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    nationality: '',
  });

  // Fetch client details when modal opens
  useEffect(() => {
    if (isOpen && client) {
      fetchClientDetails();
      setEditForm({
        name: client.name,
        email: client.email,
        phone: client.phone || '',
        nationality: client.nationality || '',
      });
    } else {
      setClientDetails(null);
      setIsEditing(false);
    }
  }, [isOpen, client]);

  const fetchClientDetails = async () => {
    if (!client) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/clients/${client._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch client details');

      const data = await response.json();
      setClientDetails(data.data);
    } catch (error) {
      toast.error('Failed to load client details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/admin/clients/${client._id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) throw new Error('Failed to update client');

      const data = await response.json();
      toast.success('Client updated successfully');
      setIsEditing(false);

      if (onUpdate && data.data?.client) {
        onUpdate(data.data.client);
      }
    } catch (error) {
      toast.error('Failed to update client');
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      invoiced: 'bg-purple-100 text-purple-800',
      paid: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      denied: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <UserCircleIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {isEditing ? 'Edit Client' : 'Client Details'}
                    </h2>
                    <p className="text-white/80 text-sm">
                      {client?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Client Info Section */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">Client Information</h3>
                      {!isEditing ? (
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Edit
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                          >
                            <CheckIcon className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Name */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <UserCircleIcon className="w-4 h-4" />
                          Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                            {client?.name}
                          </p>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <EnvelopeIcon className="w-4 h-4" />
                          Email
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                            {client?.email}
                          </p>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <PhoneIcon className="w-4 h-4" />
                          Phone
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                            {client?.phone || 'N/A'}
                          </p>
                        )}
                      </div>

                      {/* Nationality */}
                      <div className="space-y-1.5">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <GlobeAltIcon className="w-4 h-4" />
                          Nationality
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.nationality}
                            onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                            {client?.nationality || 'N/A'}
                          </p>
                        )}
                      </div>

                      {/* Registration Date */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
                          <CalendarIcon className="w-4 h-4" />
                          Member Since
                        </label>
                        <p className="text-gray-900 font-medium bg-white px-4 py-2.5 rounded-xl border border-gray-100">
                          {client?.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Booking History */}
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <ClipboardDocumentListIcon className="w-5 h-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Booking History ({clientDetails?.bookings?.length || 0})
                      </h3>
                    </div>

                    {clientDetails?.bookings && clientDetails.bookings.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {clientDetails.bookings.slice(0, 5).map((booking) => (
                          <div key={booking._id} className="bg-white rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{booking.hotel?.name}</p>
                                <p className="text-sm text-gray-500">
                                  {booking.checkInDate
                                    ? new Date(booking.checkInDate).toLocaleDateString()
                                    : new Date(booking.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(booking.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No bookings found</p>
                    )}
                  </div>

                  {/* Invoice History */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-lg font-semibold text-gray-800">
                        Invoice History ({clientDetails?.invoices?.length || 0})
                      </h3>
                    </div>

                    {clientDetails?.invoices && clientDetails.invoices.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {clientDetails.invoices.slice(0, 5).map((invoice) => (
                          <div key={invoice._id} className="bg-white rounded-xl p-4 border border-emerald-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{invoice.invoiceId}</p>
                                <p className="text-sm text-gray-500">
                                  {invoice.amount} {invoice.currency}
                                </p>
                              </div>
                              {getStatusBadge(invoice.status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No invoices found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
  );
};
