import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

interface DealHotel {
  hotelId: string;
  hotelName: string;
  hotelNameAr?: string;
  hotelImage?: string;
  city?: string;
  country?: string;
  address?: string;
  rating?: number;
  starRating?: number;
}

interface BestPriceDeal {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl: string;
  hotels: DealHotel[];
  isActive: boolean;
  order: number;
  createdAt: string;
}

interface DealFormData {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  isActive: boolean;
}

interface SuggestHotel {
  id: string;
  hid?: string;
  name: string;
  nameAr?: string;
  image?: string;
  city?: string;
  country?: string;
  address?: string;
  rating?: number;
  star_rating?: number;
}

const initialFormData: DealFormData = {
  title: '',
  titleAr: '',
  description: '',
  descriptionAr: '',
  isActive: true
};

export const BestPricesTab: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'admin']);
  const isRTL = i18n.language === 'ar';

  const [deals, setDeals] = useState<BestPriceDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<BestPriceDeal | null>(null);
  const [formData, setFormData] = useState<DealFormData>(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedHotels, setSelectedHotels] = useState<DealHotel[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hotel search state
  const [hotelSearchQuery, setHotelSearchQuery] = useState('');
  const [hotelSuggestions, setHotelSuggestions] = useState<SuggestHotel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/best-prices/admin/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDeals(data.data.deals);
      }
    } catch (error) {
      console.error('Error fetching deals:', error);
      toast.error('Failed to load deals');
    } finally {
      setLoading(false);
    }
  };

  // Hotel search with debounce
  const searchHotels = useCallback(async (query: string) => {
    if (query.length < 2) {
      setHotelSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(query)}&language=${i18n.language}`);
      const data = await response.json();
      if (data.success && data.data?.hotels) {
        setHotelSuggestions(data.data.hotels.slice(0, 15));
      }
    } catch (error) {
      console.error('Error searching hotels:', error);
    } finally {
      setIsSearching(false);
    }
  }, [API_URL, i18n.language]);

  const handleHotelSearchChange = (value: string) => {
    setHotelSearchQuery(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchHotels(value);
    }, 300);
  };

  const addHotel = (hotel: SuggestHotel) => {
    const alreadyAdded = selectedHotels.some(h => h.hotelId === (hotel.hid || hotel.id));
    if (alreadyAdded) {
      toast.error('Hotel already added');
      return;
    }

    const dealHotel: DealHotel = {
      hotelId: hotel.hid || hotel.id,
      hotelName: hotel.name,
      hotelNameAr: hotel.nameAr || '',
      hotelImage: hotel.image || '',
      city: hotel.city || '',
      country: hotel.country || '',
      address: hotel.address || '',
      rating: hotel.rating || 0,
      starRating: hotel.star_rating || 0
    };

    setSelectedHotels(prev => [...prev, dealHotel]);
    setHotelSearchQuery('');
    setHotelSuggestions([]);
    toast.success(`${hotel.name} added`);
  };

  const removeHotel = (hotelId: string) => {
    setSelectedHotels(prev => prev.filter(h => h.hotelId !== hotelId));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error('Title is required');
      return;
    }
    if (!editingDeal && !selectedFile) {
      toast.error('Image is required');
      return;
    }
    if (selectedHotels.length === 0) {
      toast.error('Please add at least one hotel');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('titleAr', formData.titleAr);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('descriptionAr', formData.descriptionAr);
      formDataToSend.append('hotels', JSON.stringify(selectedHotels));
      formDataToSend.append('isActive', String(formData.isActive));

      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }

      const url = editingDeal
        ? `${API_URL}/best-prices/${editingDeal._id}`
        : `${API_URL}/best-prices`;

      const response = await fetch(url, {
        method: editingDeal ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formDataToSend
      });

      const data = await response.json();
      if (data.success) {
        toast.success(editingDeal ? 'Deal updated!' : 'Deal created!');
        closeModal();
        fetchDeals();
      } else {
        toast.error(data.message || 'Failed to save deal');
      }
    } catch (error) {
      console.error('Error saving deal:', error);
      toast.error('Failed to save deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/best-prices/${id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDeals(prev => prev.map(d => d._id === id ? { ...d, isActive: data.data.deal.isActive } : d));
        toast.success(data.data.deal.isActive ? 'Deal activated' : 'Deal deactivated');
      }
    } catch (error) {
      toast.error('Failed to toggle deal');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/best-prices/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setDeals(prev => prev.filter(d => d._id !== id));
        toast.success('Deal deleted');
        setShowDeleteConfirm(null);
      }
    } catch (error) {
      toast.error('Failed to delete deal');
    }
  };

  const openEditModal = (deal: BestPriceDeal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      titleAr: deal.titleAr || '',
      description: deal.description || '',
      descriptionAr: deal.descriptionAr || '',
      isActive: deal.isActive
    });
    setSelectedHotels(deal.hotels || []);
    setPreviewUrl(deal.imageUrl);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeal(null);
    setFormData(initialFormData);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedHotels([]);
    setHotelSearchQuery('');
    setHotelSuggestions([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Best Price Deals</h2>
          <p className="text-sm text-gray-500 mt-1">Manage best price deal collections that appear on the home page</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all shadow-lg"
        >
          <PlusIcon className="w-5 h-5" />
          <span>Add Deal</span>
        </button>
      </div>

      {/* Deals Grid */}
      {deals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <PhotoIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">No deals yet</p>
          <p className="text-gray-400 text-sm mt-1">Create your first best price deal collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {deals.map((deal) => (
            <div key={deal._id} className="bg-white rounded-2xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-xl transition-all">
              {/* Image */}
              <div className="relative h-48">
                <img
                  src={deal.imageUrl}
                  alt={deal.title}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} flex space-x-2`}>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${deal.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {deal.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3 bg-black/60 text-white px-2 py-1 rounded-lg text-xs">
                  {deal.hotels.length} hotel{deal.hotels.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-gray-900 text-lg mb-1">{deal.title}</h3>
                {deal.titleAr && (
                  <p className="text-sm text-gray-500 mb-2" dir="rtl">{deal.titleAr}</p>
                )}
                {deal.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{deal.description}</p>
                )}

                {/* Hotel chips */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {deal.hotels.slice(0, 3).map((hotel) => (
                    <span key={hotel.hotelId} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-50 text-orange-700 border border-orange-200">
                      <BuildingOfficeIcon className="w-3 h-3 mr-1" />
                      {hotel.hotelName.length > 20 ? hotel.hotelName.substring(0, 20) + '...' : hotel.hotelName}
                    </span>
                  ))}
                  {deal.hotels.length > 3 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                      +{deal.hotels.length - 3} more
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(deal)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggle(deal._id)}
                      className={`p-2 rounded-lg transition-colors ${deal.isActive ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                      title={deal.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {deal.isActive ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowDeleteConfirm(deal._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Delete Deal</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this deal? This action cannot be undone.</p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-900">
                {editingDeal ? 'Edit Deal' : 'Create New Deal'}
              </h3>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (English) *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="e.g., Makkah Best Deals"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title (Arabic)</label>
                  <input
                    type="text"
                    value={formData.titleAr}
                    onChange={(e) => setFormData(prev => ({ ...prev, titleAr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="عنوان بالعربية"
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={2}
                    placeholder="Short description..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
                  <textarea
                    value={formData.descriptionAr}
                    onChange={(e) => setFormData(prev => ({ ...prev, descriptionAr: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    rows={2}
                    placeholder="وصف قصير..."
                    dir="rtl"
                  />
                </div>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image {!editingDeal && '*'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img src={previewUrl} alt="Preview" className="mx-auto max-h-40 rounded-lg object-cover" />
                      <p className="text-xs text-gray-500 mt-2">Click to change image</p>
                    </div>
                  ) : (
                    <div>
                      <PhotoIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload banner image</p>
                      <p className="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP (max 5MB)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Hotel Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hotels *
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={hotelSearchQuery}
                    onChange={(e) => handleHotelSearchChange(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Search hotels by name or city..."
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {hotelSuggestions.length > 0 && (
                  <div className="mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10 relative">
                    {hotelSuggestions.map((hotel) => (
                      <button
                        key={hotel.hid || hotel.id}
                        type="button"
                        onClick={() => addHotel(hotel)}
                        className="w-full flex items-center p-3 hover:bg-orange-50 transition-colors text-left border-b border-gray-50 last:border-0"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0 mr-3">
                          {hotel.image ? (
                            <img src={hotel.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BuildingOfficeIcon className="w-6 h-6 m-2 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{hotel.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {[hotel.city, hotel.country].filter(Boolean).join(', ')}
                          </p>
                        </div>
                        <PlusIcon className="w-5 h-5 text-orange-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Selected Hotels */}
                {selectedHotels.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">{selectedHotels.length} hotel{selectedHotels.length !== 1 ? 's' : ''} selected</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedHotels.map((hotel) => (
                        <div
                          key={hotel.hotelId}
                          className="flex items-center p-2 bg-orange-50 border border-orange-200 rounded-lg"
                        >
                          <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden flex-shrink-0 mr-2">
                            {hotel.hotelImage ? (
                              <img src={hotel.hotelImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <BuildingOfficeIcon className="w-5 h-5 m-1.5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{hotel.hotelName}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {[hotel.city, hotel.country].filter(Boolean).join(', ')}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeHotel(hotel.hotelId)}
                            className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                          >
                            <XMarkIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Active toggle */}
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-100">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{editingDeal ? 'Update Deal' : 'Create Deal'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
