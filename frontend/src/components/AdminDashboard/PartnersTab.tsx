import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TrashIcon,
  XMarkIcon,
  QrCodeIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../services/api';

interface Partner {
  _id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  promoCode: {
    code: string;
    isActive: boolean;
    totalBookings: number;
    totalCommission: number;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    commissionType: 'percentage' | 'fixed';
    commissionValue: number;
  } | null;
}

interface CreatePartnerForm {
  name: string;
  email: string;
  password: string;
  phone: string;
  company: string;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: string;
}

export const PartnersTab: React.FC = () => {
  const { t, i18n } = useTranslation(['admin']);
  const isRTL = i18n.language === 'ar';

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{ totalPages: number; total: number } | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreatePartnerForm>({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    discountType: 'percentage',
    discountValue: '10',
    commissionType: 'percentage',
    commissionValue: '5'
  });

  // Global margin for alert
  const [globalMargin, setGlobalMargin] = useState<number>(0);

  // Fetch global margin stats on mount
  useEffect(() => {
    const fetchMarginStats = async () => {
      try {
        const response = await api.get('/admin/margins/stats');
        if (response.data?.success && response.data?.data?.summary?.avgMargin) {
          setGlobalMargin(Math.round(response.data.data.summary.avgMargin * 100) / 100);
        }
      } catch (error) {
        console.error('Error fetching margin stats:', error);
      }
    };
    fetchMarginStats();
  }, []);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/partners', {
        params: { page, limit: 10, search }
      });
      if (response.data?.data) {
        setPartners(response.data.data.partners);
        setPagination(response.data.data.pagination);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if margin warning condition is met and show confirmation
    if (formData.commissionType === 'percentage' &&
        formData.discountType === 'percentage' &&
        globalMargin > 0 &&
        (parseFloat(formData.commissionValue) + parseFloat(formData.discountValue)) > globalMargin) {
      const total = parseFloat(formData.commissionValue) + parseFloat(formData.discountValue);
      const confirmed = window.confirm(
        `⚠️ Warning: Commission (${formData.commissionValue}%) + Discount (${formData.discountValue}%) = ${total}% exceeds your average margin of ${globalMargin}%.\n\nAre you sure you want to continue?`
      );
      if (!confirmed) {
        return;
      }
    }

    try {
      setIsCreating(true);
      await api.post('/admin/partners', {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        commissionValue: parseFloat(formData.commissionValue)
      });
      toast.success('Partner created successfully');
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        company: '',
        discountType: 'percentage',
        discountValue: '10',
        commissionType: 'percentage',
        commissionValue: '5'
      });
      fetchPartners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create partner');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeletePartner = async (partnerId: string) => {
    if (!window.confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }
    try {
      await api.delete(`/admin/partners/${partnerId}`);
      toast.success('Partner deleted successfully');
      fetchPartners();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete partner');
    }
  };

  const handleViewQR = (partner: Partner) => {
    setSelectedPartner(partner);
    setShowQRModal(true);
  };

  const handleCopyLink = () => {
    if (selectedPartner?.promoCode) {
      const baseUrl = process.env.REACT_APP_FRONTEND_URL || 'https://gaithtours.com';
      navigator.clipboard.writeText(`${baseUrl}?ref=${selectedPartner.promoCode.code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.getElementById('partner-qr-svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const a = document.createElement('a');
        a.download = `${selectedPartner?.promoCode?.code || 'partner'}-qrcode.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Partner Management</h2>
          <p className="text-gray-600">Create and manage partner accounts with referral codes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg hover:shadow-xl font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Create Partner
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search partners..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No partners found</p>
            <p className="text-sm text-gray-400">Create your first partner to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Partner</th>
                  <th className="text-left py-4 px-6 text-sm font-semibold text-gray-600">Promo Code</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Bookings</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Commission</th>
                  <th className="text-center py-4 px-6 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right py-4 px-6 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((partner) => (
                  <tr key={partner._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <p className="font-medium text-gray-900">{partner.name}</p>
                        <p className="text-sm text-gray-500">{partner.email}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {partner.promoCode ? (
                        <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-700 font-mono text-sm rounded-lg">
                          {partner.promoCode.code}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className="font-medium text-gray-900">
                        {partner.promoCode?.totalBookings || 0}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(partner.promoCode?.totalCommission || 0)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      {partner.promoCode?.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewQR(partner)}
                          className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="View QR Code"
                        >
                          <QrCodeIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeletePartner(partner._id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Partner"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-600">
              Page {page} of {pagination.totalPages} ({pagination.total} partners)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Partner Modal */}
      {showCreateModal && (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreateModal(false)}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">Create New Partner</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleCreatePartner} className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="John Doe"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="partner@example.com"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="Minimum 8 characters"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="+1234567890"
                  />
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    placeholder="Company name (optional)"
                  />
                </div>

                {/* Discount Settings */}
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
                  <h4 className="font-medium text-orange-800 mb-3">Customer Discount</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={formData.discountType}
                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percentage' | 'fixed' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.discountValue}
                        onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Commission Settings */}
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-3">Partner Commission</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                      <select
                        value={formData.commissionType}
                        onChange={(e) => setFormData({ ...formData, commissionType: e.target.value as 'percentage' | 'fixed' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed ($)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.commissionValue}
                        onChange={(e) => setFormData({ ...formData, commissionValue: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Margin Warning Alert */}
                {formData.commissionType === 'percentage' &&
                 formData.discountType === 'percentage' &&
                 globalMargin > 0 &&
                 (parseFloat(formData.commissionValue) + parseFloat(formData.discountValue)) > globalMargin && (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                    <ExclamationTriangleIcon className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-800 font-medium">
                        {t('admin:dashboard.promo_codes.referral.marginWarning', {
                          commission: formData.commissionValue,
                          discount: formData.discountValue,
                          total: parseFloat(formData.commissionValue) + parseFloat(formData.discountValue),
                          margin: globalMargin
                        }) || `Warning: Commission (${formData.commissionValue}%) + Discount (${formData.discountValue}%) = ${parseFloat(formData.commissionValue) + parseFloat(formData.discountValue)}% exceeds your average margin of ${globalMargin}%`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium disabled:opacity-50"
                  >
                    {isCreating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        Creating...
                      </span>
                    ) : (
                      'Create Partner'
                    )}
                  </button>
                </div>
              </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedPartner && (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowQRModal(false)}
          >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-gray-900">{selectedPartner.name}'s QR Code</h3>
                  <button
                    onClick={() => setShowQRModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 text-center">
                {selectedPartner.promoCode ? (
                  <>
                    {/* QR Code */}
                    <div className="inline-block p-4 bg-white rounded-2xl border-2 border-dashed border-gray-200 mb-4">
                      <QRCodeSVG
                        id="partner-qr-svg"
                        value={`${process.env.REACT_APP_FRONTEND_URL || 'https://gaithtours.com'}?ref=${selectedPartner.promoCode.code}`}
                        size={200}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#059669"
                      />
                    </div>

                    {/* Promo Code Badge */}
                    <div className="mb-4">
                      <span className="inline-block px-4 py-2 bg-emerald-100 text-emerald-700 font-mono font-bold text-lg rounded-lg">
                        {selectedPartner.promoCode.code}
                      </span>
                    </div>

                    {/* Discount/Commission Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-3 bg-orange-50 rounded-lg">
                        <p className="text-xs text-orange-600 font-medium">Customer Discount</p>
                        <p className="text-lg font-bold text-orange-700">
                          {selectedPartner.promoCode.discountType === 'percentage'
                            ? `${selectedPartner.promoCode.discountValue}%`
                            : `$${selectedPartner.promoCode.discountValue}`}
                        </p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg">
                        <p className="text-xs text-emerald-600 font-medium">Partner Commission</p>
                        <p className="text-lg font-bold text-emerald-700">
                          {selectedPartner.promoCode.commissionType === 'percentage'
                            ? `${selectedPartner.promoCode.commissionValue}%`
                            : `$${selectedPartner.promoCode.commissionValue}`}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={handleCopyLink}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
                      >
                        {copied ? (
                          <>
                            <CheckIcon className="h-4 w-4 text-emerald-500" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <ClipboardDocumentIcon className="h-4 w-4" />
                            Copy Link
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadQR}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-gray-500">
                    <QrCodeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No promo code assigned</p>
                  </div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersTab;
