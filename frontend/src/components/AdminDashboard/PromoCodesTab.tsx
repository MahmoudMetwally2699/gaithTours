import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  ChartBarIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
  validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  usageLimit: null,
  perUserLimit: 1,
  applicableHotels: [],
  applicableDestinations: [],
  isActive: true
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
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchPromoCodes();
  }, [filter]);

  const fetchPromoCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const statusParam = filter !== 'all' ? `?status=${filter}` : '';

      const response = await fetch(`${API_URL}/promo-codes${statusParam}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setPromoCodes(data.data.promoCodes);
      }
    } catch (error) {
      console.error('Error fetching promo codes:', error);
      console.error('Error fetching promo codes:', error);
      toast.error(t('admin:dashboard.error') || 'Failed to load promo codes');
    } finally {
      setLoading(false);
    }
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
          value: h.hotelId || String(h.hid) // Match logic from fetchHotelOptions
        }));
      }
      return ids.map(id => ({ label: `Hotel ID: ${id}`, value: id })); // Fallback
    } catch {
      return ids.map(id => ({ label: `Hotel ID: ${id}`, value: id }));
    }
  };

  const handleOpenCreate = () => {
    setEditingCode(null);
    setFormData(initialFormData);
    setShowModal(true);
  };

  const handleOpenEdit = async (code: PromoCode) => {
    setEditingCode(code);

    // Resolve hotel names (since model only stores IDs)
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
      isActive: code.isActive
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');

      const payload = {
        ...formData,
        applicableHotels: formData.applicableHotels.map(h => h.value),
        applicableDestinations: formData.applicableDestinations.map(d => d.value)
      };

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
        toast.success(editingCode ? t('admin:dashboard.promo_codes.modal.updateSuccess') || 'Promo code updated!' : t('admin:dashboard.promo_codes.modal.createSuccess') || 'Promo code created!');
        setShowModal(false);
        fetchPromoCodes();
      } else {
        toast.error(data.message || t('admin:dashboard.promo_codes.modal.saveError') || 'Failed to save promo code');
      }
    } catch (error) {
      console.error('Error saving promo code:', error);
      toast.error(t('admin:dashboard.promo_codes.modal.saveError') || 'Failed to save promo code');
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
        toast.success(t('admin:dashboard.promo_codes.delete.success') || 'Promo code deleted');
        setShowDeleteConfirm(null);
        fetchPromoCodes();
      } else {
        toast.error(data.message || t('admin:dashboard.promo_codes.delete.error') || 'Failed to delete');
      }
    } catch (error) {
      toast.error(t('admin:dashboard.promo_codes.delete.error') || 'Failed to delete promo code');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('admin:dashboard.promo_codes.title')}</h2>
          <p className="text-gray-600">{t('admin:dashboard.promo_codes.subtitle')}</p>
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
            {t('admin:dashboard.promo_codes.createButton')}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.code')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.discount')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.validity')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.usage')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.status')}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('admin:dashboard.promo_codes.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {promoCodes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <TagIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>{t('admin:dashboard.promo_codes.table.noCodes')}</p>
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
                      </div>
                      {code.description && <p className="text-xs text-gray-500 mt-1">{code.description}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-semibold text-green-600">
                        {code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.currency} ${code.discountValue}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{new Date(code.validFrom).toLocaleDateString()}</div>
                      <div className="text-gray-400">{t('admin:dashboard.promo_codes.table.to')}</div>
                      <div>{new Date(code.validUntil).toLocaleDateString()}</div>
                    </td>
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
              <h3 className="text-lg font-semibold text-gray-900">{editingCode ? t('admin:dashboard.promo_codes.modal.editTitle') : t('admin:dashboard.promo_codes.modal.createTitle')}</h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
    </div>
  );
};
