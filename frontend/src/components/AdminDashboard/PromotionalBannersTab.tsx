import React, { useState, useEffect, useRef } from 'react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface PromotionalBanner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
}

interface BannerFormData {
  title: string;
  linkUrl: string;
  isActive: boolean;
}

const initialFormData: BannerFormData = {
  title: '',
  linkUrl: '',
  isActive: true
};

export const PromotionalBannersTab: React.FC = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromotionalBanner | null>(null);
  const [formData, setFormData] = useState<BannerFormData>(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promotional-banners/admin`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setBanners(data.data.banners);
      }
    } catch (error) {
      console.error('Error fetching banners:', error);
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
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

  const handleOpenCreate = () => {
    setEditingBanner(null);
    setFormData(initialFormData);
    setSelectedFile(null);
    setPreviewUrl(null);
    setShowModal(true);
  };

  const handleOpenEdit = (banner: PromotionalBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      linkUrl: banner.linkUrl || '',
      isActive: banner.isActive
    });
    setSelectedFile(null);
    setPreviewUrl(banner.imageUrl);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingBanner && !selectedFile) {
      toast.error('Please select an image');
      return;
    }

    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('linkUrl', formData.linkUrl);
      formDataToSend.append('isActive', String(formData.isActive));

      if (selectedFile) {
        formDataToSend.append('image', selectedFile);
      }

      const url = editingBanner
        ? `${API_URL}/promotional-banners/${editingBanner._id}`
        : `${API_URL}/promotional-banners`;

      const response = await fetch(url, {
        method: editingBanner ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formDataToSend
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingBanner ? 'Banner updated!' : 'Banner created!');
        setShowModal(false);
        fetchBanners();
      } else {
        toast.error(data.message || 'Failed to save banner');
      }
    } catch (error) {
      console.error('Error saving banner:', error);
      toast.error('Failed to save banner');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (banner: PromotionalBanner) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promotional-banners/${banner._id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        fetchBanners();
      } else {
        toast.error(data.message || 'Failed to toggle status');
      }
    } catch (error) {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/promotional-banners/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Banner deleted');
        setShowDeleteConfirm(null);
        fetchBanners();
      } else {
        toast.error(data.message || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete banner');
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Promotional Banners</h2>
          <p className="text-gray-600">Manage homepage promotional banners for new users</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Add Banner
        </button>
      </div>

      {/* Banners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {banners.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <PhotoIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No promotional banners yet</p>
            <button
              onClick={handleOpenCreate}
              className="text-orange-500 hover:text-orange-600 font-medium"
            >
              Add your first banner
            </button>
          </div>
        ) : (
          banners.map((banner) => (
            <div
              key={banner._id}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                banner.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="aspect-[16/9] relative overflow-hidden bg-gray-100">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-gray-800 text-white px-3 py-1 rounded-full text-sm">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{banner.title}</h3>
                {banner.linkUrl && (
                  <a
                    href={banner.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center gap-1 mb-3"
                  >
                    <LinkIcon className="w-3 h-3" />
                    {banner.linkUrl.length > 40 ? banner.linkUrl.substring(0, 40) + '...' : banner.linkUrl}
                  </a>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <button
                    onClick={() => handleToggleActive(banner)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
                      banner.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {banner.isActive ? (
                      <>
                        <EyeIcon className="w-4 h-4" /> Active
                      </>
                    ) : (
                      <>
                        <EyeSlashIcon className="w-4 h-4" /> Inactive
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(banner)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(banner._id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-20">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBanner ? 'Edit Banner' : 'Add Banner'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Banner Image {!editingBanner && '*'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                    previewUrl ? 'border-gray-200' : 'border-gray-300 hover:border-orange-400'
                  }`}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="w-full aspect-[16/9] object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                        <span className="text-white text-sm">Click to change</span>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8">
                      <PhotoIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Click to upload image</p>
                      <p className="text-xs text-gray-400 mt-1">Recommended: 16:9 ratio, max 5MB</p>
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

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="e.g., Summer Sale - 50% Off"
                  required
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData((p) => ({ ...p, linkUrl: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="https://example.com/promotion"
                />
                <p className="text-xs text-gray-400 mt-1">Users will be redirected here when clicking the banner</p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3 pt-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((p) => ({ ...p, isActive: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
                <span className="text-sm font-medium text-gray-700">Active (visible on homepage)</span>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-300 flex items-center gap-2"
                >
                  {isSubmitting ? 'Saving...' : editingBanner ? 'Update Banner' : 'Add Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Banner</h3>
                <p className="text-sm text-gray-600">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
