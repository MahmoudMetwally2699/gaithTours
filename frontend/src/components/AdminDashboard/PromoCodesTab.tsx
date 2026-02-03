import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
  ArrowDownTrayIcon,
  ClipboardDocumentIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';

interface PromoCode {
  _id: string;
  code: string;
  description?: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBookingValue: number;
  maxDiscount?: number;
  currency: string;
  validFrom: string;
  validUntil: string;
  usageLimit?: number;
  usageCount: number;
  perUserLimit: number;
  applicableHotels: string[];
  applicableDestinations: string[];
  isActive: boolean;
  createdAt: string;
  type: 'standard' | 'referral';
  partnerInfo?: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    commissionType: 'percentage' | 'fixed';
    commissionValue: number;
  };
  totalCommissionEarned?: number;
  referralBookings?: any[];
}

interface Option {
  label: string;
  value: string;
}

interface PromoCodeFormData {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minBookingValue: number;
  maxDiscount: number | null;
  currency: string;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  perUserLimit: number;
  applicableHotels: Option[];
  applicableDestinations: Option[];
  isActive: boolean;
  // Referral fields
  type: 'standard' | 'referral';
  partnerName: string;
  partnerEmail: string;
  partnerPhone: string;
  partnerCompany: string;
  commissionType: 'percentage' | 'fixed';
  commissionValue: number;
}

const initialFormData: PromoCodeFormData = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  minBookingValue: 0,
  maxDiscount: null,
  currency: 'USD',
  validFrom: new Date().toISOString().split('T')[0],
  validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year default for referrals
  usageLimit: null,
  perUserLimit: 1,
  applicableHotels: [],
  applicableDestinations: [],
  isActive: true,
  type: 'standard',
  partnerName: '',
  partnerEmail: '',
  partnerPhone: '',
  partnerCompany: '',
  commissionType: 'percentage',
  commissionValue: 5
};

// --- MultiSelect Component ---
interface MultiSelectProps {
  label: string;
  placeholder: string;
  selectedItems: Option[];
  onChange: (items: Option[]) => void;
  fetchOptions: (query: string) => Promise<Option[]>;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, placeholder, selectedItems, onChange, fetchOptions }) => {
  const { t } = useTranslation(['admin']);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue) {
        handleSearch(inputValue);
      } else {
        setOptions([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const handleSearch = async (query: string) => {
    setLoading(true);
    try {
      const results = await fetchOptions(query);
      setOptions(results);
      setShowDropdown(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: Option) => {
    if (!(selectedItems || []).some(i => i.value === item.value)) {
      onChange([...(selectedItems || []), item]);
    }
    setInputValue('');
    setShowDropdown(false);
  };

  const handleRemove = (value: string) => {
    onChange((selectedItems || []).filter(i => i.value !== value));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 p-2 border border-gray-300 rounded-lg bg-white min-h-[42px]">
        {(Array.isArray(selectedItems) ? selectedItems : []).map(item => (
          <span key={item.value} className="bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-md flex items-center gap-1">
            {item.label}
            <button type="button" onClick={() => handleRemove(item.value)} className="hover:text-orange-900">
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => { if(inputValue) setShowDropdown(true); }}
          placeholder={selectedItems.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[120px] outline-none bg-transparent"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-center text-gray-500 text-xs">{t('admin:dashboard.loading') || 'Loading...'}</div>
          ) : options.length > 0 ? (
            <ul>
              {options.map(option => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className="px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm text-gray-700"
                >
                  {option.label}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-center text-gray-500 text-xs">{t('admin:dashboard.noResults') || 'No results found'}</div>
          )}
        </div>
      )}
    </div>
  );
};

// --- QR Code Modal Component ---
interface QRCodeModalProps {
  code: PromoCode;
  onClose: () => void;
  baseUrl: string;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ code, onClose, baseUrl }) => {
  const { t } = useTranslation(['admin']);
  const qrRef = useRef<HTMLDivElement>(null);

  const referralUrl = `${baseUrl}?ref=${code.code}`;

  const downloadQR = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `QR-${code.code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    toast.success(t('admin:dashboard.promo_codes.referral.linkCopied') || 'Link copied!');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {t('admin:dashboard.promo_codes.referral.qrCode') || 'QR Code'}: {code.code}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="p-4 bg-white border-2 border-gray-100 rounded-xl">
            <QRCodeSVG
              value={referralUrl}
              size={200}
              level="H"
              includeMargin={true}
            />
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">{t('admin:dashboard.promo_codes.referral.referralLink') || 'Referral Link'}:</p>
            <code className="bg-gray-100 px-3 py-2 rounded text-sm text-gray-800 block break-all">
              {referralUrl}
            </code>
          </div>

          {code.partnerInfo && (
            <div className="w-full p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t('admin:dashboard.promo_codes.referral.partnerInfo') || 'Partner Info'}
              </h4>
              <p className="text-sm text-gray-600">{code.partnerInfo.name}</p>
              {code.partnerInfo.company && <p className="text-sm text-gray-500">{code.partnerInfo.company}</p>}
            </div>
          )}

          <div className="flex gap-3 w-full">
            <button
              onClick={downloadQR}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
              {t('admin:dashboard.promo_codes.referral.downloadQR') || 'Download QR'}
            </button>
            <button
              onClick={copyLink}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ClipboardDocumentIcon className="w-5 h-5" />
              {t('admin:dashboard.promo_codes.referral.copyLink') || 'Copy Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Partner Details Modal Component ---
interface PartnerDetailsModalProps {
  code: PromoCode;
  onClose: () => void;
  onMarkPaid: (bookingIds?: string[]) => Promise<void>;
}

const PartnerDetailsModal: React.FC<PartnerDetailsModalProps> = ({ code, onClose, onMarkPaid }) => {
  const { t } = useTranslation(['admin']);
  const [isMarking, setIsMarking] = useState(false);

  const totalEarned = code.totalCommissionEarned || 0;
  const paidCommissions = code.referralBookings?.filter(b => b.commissionPaid) || [];
  const unpaidCommissions = code.referralBookings?.filter(b => !b.commissionPaid) || [];
  const totalPaid = paidCommissions.reduce((sum, b) => sum + (b.partnerCommission || 0), 0);
  const totalPending = unpaidCommissions.reduce((sum, b) => sum + (b.partnerCommission || 0), 0);

  const handleMarkAllPaid = async () => {
    setIsMarking(true);
    try {
      await onMarkPaid();
      toast.success(t('admin:dashboard.promo_codes.referral.markedAsPaid') || 'Commissions marked as paid!');
    } catch (error) {
      toast.error('Failed to mark commissions as paid');
    } finally {
      setIsMarking(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('admin:dashboard.promo_codes.referral.partnerInfo') || 'Partner Details'}
            </h3>
            <p className="text-sm text-gray-500">{code.code}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Partner Info */}
        <div className="p-6 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.promo_codes.referral.partnerName') || 'Partner Name'}</p>
              <p className="font-medium text-gray-900 truncate">{code.partnerInfo?.name || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.promo_codes.referral.company') || 'Company'}</p>
              <p className="font-medium text-gray-900 truncate">{code.partnerInfo?.company || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.promo_codes.referral.partnerEmail') || 'Email'}</p>
              <p className="font-medium text-gray-900 text-sm break-all">{code.partnerInfo?.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('admin:dashboard.promo_codes.referral.partnerPhone') || 'Phone'}</p>
              <p className="font-medium text-gray-900" dir="ltr">{code.partnerInfo?.phone || '-'}</p>
            </div>
          </div>
        </div>

        {/* Commission Summary */}
        <div className="p-6 border-b border-gray-100">
          <h4 className="text-sm font-semibold text-gray-700 mb-4">
            {t('admin:dashboard.promo_codes.referral.commission') || 'Commission Summary'}
          </h4>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">${totalEarned.toFixed(2)}</p>
              <p className="text-xs text-blue-600">{t('admin:dashboard.promo_codes.referral.totalEarned') || 'Total Earned'}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-600">${totalPaid.toFixed(2)}</p>
              <p className="text-xs text-green-600">{t('admin:dashboard.promo_codes.referral.paidCommission') || 'Paid'}</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">${totalPending.toFixed(2)}</p>
              <p className="text-xs text-orange-600">{t('admin:dashboard.promo_codes.referral.pendingCommission') || 'Pending'}</p>
            </div>
          </div>
        </div>

        {/* Booking History */}
        <div className="p-6 overflow-y-auto max-h-64">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-gray-700">
              {t('admin:dashboard.promo_codes.referral.bookingsFromReferral') || 'Referral Bookings'} ({code.referralBookings?.length || 0})
            </h4>
            {totalPending > 0 && (
              <button
                onClick={handleMarkAllPaid}
                disabled={isMarking}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {isMarking ? '...' : (t('admin:dashboard.promo_codes.referral.markAsPaid') || 'Mark All Paid')}
              </button>
            )}
          </div>

          {code.referralBookings && code.referralBookings.length > 0 ? (
            <div className="space-y-2">
              {code.referralBookings.map((booking, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-lg ${booking.commissionPaid ? 'bg-green-50' : 'bg-gray-50'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      ${booking.bookingValue?.toFixed(2) || '0.00'} booking
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">
                      +${booking.partnerCommission?.toFixed(2) || '0.00'}
                    </p>
                    {booking.commissionPaid ? (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Paid
                      </span>
                    ) : (
                      <span className="text-xs text-orange-500">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              {t('admin:dashboard.promo_codes.referral.noReferrals') || 'No referral bookings yet'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---
export const PromoCodesTab: React.FC = () => {
  const { t } = useTranslation(['admin']);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCode, setEditingCode] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<PromoCodeFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  const [activeTab, setActiveTab] = useState<'standard' | 'referral'>('standard');
  const [showQRModal, setShowQRModal] = useState<PromoCode | null>(null);
  const [showPartnerDetails, setShowPartnerDetails] = useState<PromoCode | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
  const SITE_URL = process.env.REACT_APP_SITE_URL || window.location.origin;

  useEffect(() => {
    fetchPromoCodes();
  }, [filter, activeTab]);

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const statusParam = filter !== 'all' ? `&status=${filter}` : '';

      const response = await fetch(`${API_URL}/promo-codes?type=${activeTab}${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setPromoCodes(data.data.promoCodes);
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      toast.error(t('admin:dashboard.error') || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  const markCommissionPaid = async (codeId: string, bookingIds?: string[]) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/promo-codes/${codeId}/mark-commission-paid`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ bookingIds })
    });

    if (!response.ok) throw new Error('Failed to mark commission as paid');

    // Refresh data after marking paid
    await fetchPromoCodes();
    setShowPartnerDetails(null);
  };

  const fetchHotelOptions = async (query: string): Promise<Option[]> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/promo-codes/options/hotels?search=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.success ? data.data.hotels.map((h: any) => ({
      label: `${h.name} (${h.city})`,
      value: h.hotelId || String(h.hid)
    })) : [];
  };

  const fetchDestinationOptions = async (query: string): Promise<Option[]> => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/promo-codes/options/destinations?search=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.success ? data.data.destinations.map((d: string) => ({
      label: d,
      value: d
    })) : [];
  };

  const resolveHotelNames = async (ids: string[]): Promise<Option[]> => {
    if (ids.length === 0) return [];
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promo-codes/options/hotels?ids=${ids.join(',')}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        return data.data.hotels.map((h: any) => ({
          label: `${h.name} (${h.city})`,
          value: h.hotelId || String(h.hid)
        }));
      }
      return ids.map(id => ({ label: `Hotel ID: ${id}`, value: id }));
    } catch {
      return ids.map(id => ({ label: `Hotel ID: ${id}`, value: id }));
    }
  };

  const handleOpenCreate = () => {
    setEditingCode(null);
    setFormData({
      ...initialFormData,
      type: activeTab // Set type based on current tab
    });
    setShowModal(true);
  };

  const handleOpenEdit = async (code: PromoCode) => {
    setEditingCode(code);

    const resolvedHotels = await resolveHotelNames(code.applicableHotels || []);
    const resolvedDestinations = (code.applicableDestinations || []).map(d => ({ label: d, value: d }));

    setFormData({
      code: code.code,
      description: code.description || '',
      discountType: code.discountType,
      discountValue: code.discountValue,
      minBookingValue: code.minBookingValue,
      maxDiscount: code.maxDiscount || null,
      currency: code.currency,
      validFrom: new Date(code.validFrom).toISOString().split('T')[0],
      validUntil: new Date(code.validUntil).toISOString().split('T')[0],
      usageLimit: code.usageLimit || null,
      perUserLimit: code.perUserLimit,
      applicableHotels: resolvedHotels,
      applicableDestinations: resolvedDestinations,
      isActive: code.isActive,
      type: code.type || 'standard',
      partnerName: code.partnerInfo?.name || '',
      partnerEmail: code.partnerInfo?.email || '',
      partnerPhone: code.partnerInfo?.phone || '',
      partnerCompany: code.partnerInfo?.company || '',
      commissionType: code.partnerInfo?.commissionType || 'percentage',
      commissionValue: code.partnerInfo?.commissionValue || 5
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      const payload: any = {
        ...formData,
        applicableHotels: formData.applicableHotels.map(h => h.value),
        applicableDestinations: formData.applicableDestinations.map(d => d.value)
      };

      // Add partner info for referral type
      if (formData.type === 'referral') {
        payload.partnerInfo = {
          name: formData.partnerName,
          email: formData.partnerEmail,
          phone: formData.partnerPhone,
          company: formData.partnerCompany,
          commissionType: formData.commissionType,
          commissionValue: formData.commissionValue
        };
      }

      // Clean up fields not needed in payload
      delete payload.partnerName;
      delete payload.partnerEmail;
      delete payload.partnerPhone;
      delete payload.partnerCompany;
      delete payload.commissionType;
      delete payload.commissionValue;

      const url = editingCode
        ? `${API_URL}/promo-codes/${editingCode._id}`
        : `${API_URL}/promo-codes`;

      const response = await fetch(url, {
        method: editingCode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingCode
          ? t('admin:dashboard.promo_codes.modal.updateSuccess') || 'Updated!'
          : t('admin:dashboard.promo_codes.modal.createSuccess') || 'Created!');
        setShowModal(false);
        fetchPromoCodes();
      } else {
        toast.error(data.message || t('admin:dashboard.promo_codes.modal.saveError') || 'Failed to save');
      }
    } catch (error) {
      console.error('Error saving promo code:', error);
      toast.error(t('admin:dashboard.promo_codes.modal.saveError') || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promo-codes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('admin:dashboard.promo_codes.delete.success') || 'Deleted');
        setShowDeleteConfirm(null);
        fetchPromoCodes();
      } else {
        toast.error(data.message || t('admin:dashboard.promo_codes.delete.error') || 'Failed to delete');
      }
    } catch (error) {
      toast.error(t('admin:dashboard.promo_codes.delete.error') || 'Failed to delete');
    }
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'standard'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <TagIcon className="w-4 h-4 inline-block mr-2" />
          {t('admin:dashboard.promo_codes.tabs.standard') || 'Standard Codes'}
        </button>
        <button
          onClick={() => setActiveTab('referral')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'referral'
              ? 'bg-white text-orange-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <QrCodeIcon className="w-4 h-4 inline-block mr-2" />
          {t('admin:dashboard.promo_codes.tabs.referral') || 'Referral Codes'}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === 'referral'
              ? t('admin:dashboard.promo_codes.referral.title') || 'Referral Codes'
              : t('admin:dashboard.promo_codes.title')}
          </h2>
          <p className="text-gray-600">
            {activeTab === 'referral'
              ? t('admin:dashboard.promo_codes.referral.subtitle') || 'Manage partner referral codes with QR tracking'
              : t('admin:dashboard.promo_codes.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'active' | 'expired')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">{t('admin:dashboard.promo_codes.filters.all')}</option>
            <option value="active">{t('admin:dashboard.promo_codes.filters.active')}</option>
            <option value="expired">{t('admin:dashboard.promo_codes.filters.expired')}</option>
          </select>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            {activeTab === 'referral'
              ? t('admin:dashboard.promo_codes.referral.createButton') || 'Create Referral'
              : t('admin:dashboard.promo_codes.createButton')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.code')}</th>
                {activeTab === 'referral' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin:dashboard.promo_codes.referral.partnerInfo') || 'Partner'}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.discount')}</th>
                {activeTab === 'referral' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('admin:dashboard.promo_codes.referral.commission') || 'Commission'}
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.usage')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={activeTab === 'referral' ? 7 : 5} className="px-6 py-12 text-center text-gray-500">
                    {activeTab === 'referral' ? (
                      <QrCodeIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    ) : (
                      <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    )}
                    <p>
                      {activeTab === 'referral'
                        ? t('admin:dashboard.promo_codes.referral.noReferrals') || 'No referral codes yet'
                        : t('admin:dashboard.promo_codes.table.noCodes')}
                    </p>
                  </td>
                </tr>
              ) : (
                promoCodes.map((code) => (
                  <tr key={code._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                          {code.code}
                        </span>
                        {activeTab === 'referral' && (
                          <button
                            onClick={() => setShowQRModal(code)}
                            className="p-1 text-orange-500 hover:text-orange-600 hover:bg-orange-50 rounded"
                            title="View QR Code"
                          >
                            <QrCodeIcon className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      {code.description && <p className="text-xs text-gray-500 mt-1">{code.description}</p>}
                    </td>
                    {activeTab === 'referral' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <UserGroupIcon className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">{code.partnerInfo?.name}</p>
                            {code.partnerInfo?.company && (
                              <p className="text-xs text-gray-500">{code.partnerInfo.company}</p>
                            )}
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-green-600">
                        {code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.currency} ${code.discountValue}`}
                      </span>
                    </td>
                    {activeTab === 'referral' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-blue-600">
                            {code.partnerInfo?.commissionType === 'percentage'
                              ? `${code.partnerInfo?.commissionValue}%`
                              : `${code.currency} ${code.partnerInfo?.commissionValue}`}
                          </span>
                          {code.totalCommissionEarned !== undefined && code.totalCommissionEarned > 0 && (
                            <span className="text-xs text-gray-500">
                              {t('admin:dashboard.promo_codes.referral.totalEarned') || 'Earned'}: {code.currency} {code.totalCommissionEarned.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-semibold">{code.usageCount}</span>
                        {code.usageLimit && <span className="text-gray-500"> / {code.usageLimit}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired(code.validUntil) ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">{t('admin:dashboard.promo_codes.table.expired')}</span>
                      ) : code.isActive ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">{t('admin:dashboard.promo_codes.table.active')}</span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">{t('admin:dashboard.promo_codes.table.inactive')}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {activeTab === 'referral' && (
                          <button
                            onClick={() => setShowPartnerDetails(code)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title={t('admin:dashboard.promo_codes.referral.partnerInfo') || 'View Partner Details'}
                          >
                            <UserGroupIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handleOpenEdit(code)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(code._id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCode
                  ? t('admin:dashboard.promo_codes.modal.editTitle')
                  : (activeTab === 'referral'
                      ? t('admin:dashboard.promo_codes.referral.createTitle') || 'Create Referral Code'
                      : t('admin:dashboard.promo_codes.modal.createTitle'))}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Partner Info Section (for referral type) */}
              {formData.type === 'referral' && (
                <div className="space-y-4 pb-4 border-b border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-orange-500" />
                    {t('admin:dashboard.promo_codes.referral.partnerInfo') || 'Partner Information'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin:dashboard.promo_codes.referral.partnerName') || 'Partner Name'} *
                      </label>
                      <input
                        type="text"
                        value={formData.partnerName}
                        onChange={(e) => setFormData(p => ({ ...p, partnerName: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin:dashboard.promo_codes.referral.company') || 'Company'}
                      </label>
                      <input
                        type="text"
                        value={formData.partnerCompany}
                        onChange={(e) => setFormData(p => ({ ...p, partnerCompany: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin:dashboard.promo_codes.referral.partnerEmail') || 'Email'}
                      </label>
                      <input
                        type="email"
                        value={formData.partnerEmail}
                        onChange={(e) => setFormData(p => ({ ...p, partnerEmail: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('admin:dashboard.promo_codes.referral.partnerPhone') || 'Phone'}
                      </label>
                      <input
                        type="text"
                        value={formData.partnerPhone}
                        onChange={(e) => setFormData(p => ({ ...p, partnerPhone: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Commission Settings */}
                  <div className="pt-4">
                    <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-3">
                      <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                      {t('admin:dashboard.promo_codes.referral.commission') || 'Commission Settings'}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('admin:dashboard.promo_codes.referral.commissionType') || 'Commission Type'}
                        </label>
                        <select
                          value={formData.commissionType}
                          onChange={(e) => setFormData(p => ({ ...p, commissionType: e.target.value as 'percentage' | 'fixed' }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        >
                          <option value="percentage">{t('admin:dashboard.promo_codes.types.percentage')}</option>
                          <option value="fixed">{t('admin:dashboard.promo_codes.types.fixed')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {t('admin:dashboard.promo_codes.referral.commissionValue') || 'Commission Value'}
                        </label>
                        <input
                          type="number"
                          value={formData.commissionValue}
                          onChange={(e) => setFormData(p => ({ ...p, commissionValue: Number(e.target.value) }))}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.code')} *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                    disabled={!!editingCode}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.description')}</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Customer Discount Settings */}
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <h4 className="text-sm font-bold text-gray-900">
                  {formData.type === 'referral'
                    ? t('admin:dashboard.promo_codes.referral.customerDiscount') || 'Customer Discount'
                    : t('admin:dashboard.promo_codes.modal.type')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.type')} *</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData(p => ({ ...p, discountType: e.target.value as 'percentage' | 'fixed' }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      <option value="percentage">{t('admin:dashboard.promo_codes.types.percentage')}</option>
                      <option value="fixed">{t('admin:dashboard.promo_codes.types.fixed')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.value')} *</label>
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData(p => ({ ...p, discountValue: Number(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      required
                    />
                  </div>
                  {formData.discountType === 'percentage' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.maxCap')}</label>
                      <input
                        type="number"
                        value={formData.maxDiscount || ''}
                        onChange={(e) => setFormData(p => ({ ...p, maxDiscount: e.target.value ? Number(e.target.value) : null }))}
                        placeholder="Unlimited"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Validity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.validFrom')} *</label>
                  <input
                    type="date"
                    value={formData.validFrom}
                    onChange={(e) => setFormData(p => ({ ...p, validFrom: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin:dashboard.promo_codes.modal.validUntil')} *</label>
                  <input
                    type="date"
                    value={formData.validUntil}
                    onChange={(e) => setFormData(p => ({ ...p, validUntil: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Targeting (only for standard promo codes) */}
              {formData.type === 'standard' && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-sm font-bold text-gray-900">{t('admin:dashboard.promo_codes.modal.targeting')}</h4>
                  <MultiSelect
                    label={t('admin:dashboard.promo_codes.modal.hotels')}
                    placeholder={t('admin:dashboard.searchHotels') || 'Search hotels...'}
                    selectedItems={formData.applicableHotels}
                    onChange={(items) => setFormData(prev => ({ ...prev, applicableHotels: items }))}
                    fetchOptions={fetchHotelOptions}
                  />
                  <MultiSelect
                    label={t('admin:dashboard.promo_codes.modal.destinations')}
                    placeholder={t('admin:dashboard.searchDestinations') || 'Search destinations...'}
                    selectedItems={formData.applicableDestinations}
                    onChange={(items) => setFormData(prev => ({ ...prev, applicableDestinations: items }))}
                    fetchOptions={fetchDestinationOptions}
                  />
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center gap-3 pt-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(p => ({ ...p, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">{t('admin:dashboard.promo_codes.modal.active')}</span>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">{t('admin:dashboard.promo_codes.modal.cancel')}</button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {isSubmitting ? t('admin:dashboard.promo_codes.modal.saving') : (editingCode ? t('admin:dashboard.promo_codes.modal.update') : t('admin:dashboard.promo_codes.modal.save'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('admin:dashboard.promo_codes.delete.title')}</h3>
                <p className="text-sm text-gray-600">{t('admin:dashboard.promo_codes.delete.message')}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">{t('admin:dashboard.promo_codes.modal.cancel')}</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">{t('admin:dashboard.promo_codes.delete.confirm')}</button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          code={showQRModal}
          onClose={() => setShowQRModal(null)}
          baseUrl={SITE_URL}
        />
      )}

      {/* Partner Details Modal */}
      {showPartnerDetails && (
        <PartnerDetailsModal
          code={showPartnerDetails}
          onClose={() => setShowPartnerDetails(null)}
          onMarkPaid={() => markCommissionPaid(showPartnerDetails._id)}
        />
      )}
    </div>
  );
};
