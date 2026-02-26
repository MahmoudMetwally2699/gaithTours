import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import adminAPI from '../../services/adminAPI';
import axios from 'axios';
import toast from 'react-hot-toast';

interface HotelSuggestion {
  id: string;
  name: string;
  nameAr?: string;
  city?: string;
  country?: string;
  starRating?: number;
  image?: string;
}

interface SelectedHotel {
  id: string;
  name: string;
  email: string;
  city?: string;
  country?: string;
}

export const HotelPartnershipTab: React.FC = () => {
  const { t, i18n } = useTranslation(['common', 'admin']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedHotels, setSelectedHotels] = useState<SelectedHotel[]>([]);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/hotels/suggest`,
        { params: { query: query, language: i18n.language } }
      );

      if (response.data?.data?.hotels) {
        setSuggestions(response.data.data.hotels.map((h: any) => ({
          id: h.id || h.hid,
          name: h.name,
          nameAr: h.nameAr,
          city: h.city || (h.location ? h.location.split(',')[0]?.trim() : undefined),
          country: h.country || (h.location ? h.location.split(',')[1]?.trim() : undefined),
          starRating: h.starRating || h.star_rating,
          image: h.image
        })));
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error(t('common:messages.error', 'Something went wrong'));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const handleSelectHotel = async (hotel: HotelSuggestion) => {
    if (selectedHotels.some(h => h.id === hotel.id)) {
      toast.error(t('admin:dashboard.partnership.alreadySelected', 'Hotel already selected'));
      return;
    }

    const newHotel: SelectedHotel = {
      id: hotel.id,
      name: isRTL && hotel.nameAr ? hotel.nameAr : hotel.name,
      email: '',
      city: hotel.city,
      country: hotel.country
    };

    setSelectedHotels(prev => [...prev, newHotel]);
    setSearchQuery('');
    setShowSuggestions(false);
    setEditingEmailId(hotel.id);

    // Auto-fetch hotel email from contact info API
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001/api'}/admin/hotel-contact/${encodeURIComponent(hotel.id)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const contactEmail = response.data?.data?.email;
      if (contactEmail) {
        setSelectedHotels(prev =>
          prev.map(h => h.id === hotel.id ? { ...h, email: contactEmail } : h)
        );
      }
    } catch (err) {
      // Contact info not available — admin will type it manually
      console.log('Could not auto-fetch hotel email, manual input required');
    }
  };

  const handleRemoveHotel = (id: string) => {
    setSelectedHotels(selectedHotels.filter(h => h.id !== id));
    if (editingEmailId === id) setEditingEmailId(null);
  };

  const handleUpdateEmail = (id: string, email: string) => {
    setSelectedHotels(selectedHotels.map(h => h.id === id ? { ...h, email } : h));
  };

  const handleSendEmails = async () => {
    if (selectedHotels.length === 0) return;

    const invalidHotels = selectedHotels.filter(h => !h.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(h.email));
    if (invalidHotels.length > 0) {
      toast.error(t('admin:dashboard.partnership.invalidEmails', 'Please provide valid email addresses for all selected hotels'));
      return;
    }

    try {
      setIsSending(true);
      const payload = {
        hotels: selectedHotels.map(h => ({ name: h.name, email: h.email }))
      };

      const response = await adminAPI.sendPartnershipEmails(payload);

      const { success, failed } = response.data.data;
      if (failed > 0) {
        toast.error(t('admin:dashboard.partnership.partialSuccess', '{{success}} sent, {{failed}} failed', { success, failed }));
      } else {
        toast.success(t('admin:dashboard.partnership.success', 'Partnership emails sent successfully'));
      }

      setSelectedHotels([]);
    } catch (error: any) {
      console.error('Error sending partnership emails:', error);
      toast.error(error.response?.data?.message || t('admin:dashboard.partnership.error', 'Failed to send partnership emails'));
    } finally {
      setIsSending(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex -space-x-1">
        {[...Array(rating)].map((_, i) => (
          <StarIconSolid key={i} className="w-3.5 h-3.5 text-amber-400" />
        ))}
      </div>
    );
  };

  const getSearchInputClassName = () => {
    const base = 'w-full py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none';
    return isRTL ? `${base} pr-10 pl-4` : `${base} pl-10 pr-4`;
  };

  const getSearchIconClassName = () => {
    const base = 'w-5 h-5 text-gray-400 absolute top-1/2 -translate-y-1/2';
    return isRTL ? `${base} right-3` : `${base} left-3`;
  };

  const getClearBtnClassName = () => {
    const base = 'absolute top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full text-gray-500 transition-colors';
    return isRTL ? `${base} left-3` : `${base} right-3`;
  };

  const getSuggestionBtnClassName = () => {
    const base = 'w-full text-left px-4 py-3 hover:bg-orange-50 flex items-start gap-3 transition-colors';
    return isRTL ? `${base} flex-row-reverse text-right` : base;
  };

  const getSuggestionMetaClassName = () => {
    const base = 'flex items-center text-xs text-gray-500 mt-1 space-x-2';
    return isRTL ? `${base} flex-row-reverse space-x-reverse` : base;
  };

  const getEnvelopeIconClassName = () => {
    const base = 'absolute top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4';
    return isRTL ? `${base} right-3` : `${base} left-3`;
  };

  const getEmailInputClassName = (hotel: SelectedHotel) => {
    const base = 'w-full text-sm py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all';
    const padding = isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3';
    const borderStyle = !hotel.email && editingEmailId !== hotel.id
      ? 'border-amber-300 bg-amber-50 placeholder-amber-400'
      : 'border-gray-300 bg-white';
    return `${base} ${padding} ${borderStyle}`;
  };

  const getSelectedHotelClassName = (hotel: SelectedHotel) => {
    const base = 'bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center transition-all';
    return editingEmailId === hotel.id
      ? `${base} ring-2 ring-orange-100 border-orange-300 bg-white`
      : base;
  };

  const getSendBtnClassName = () => {
    const base = 'flex items-center gap-2 px-6 py-2 rounded-xl font-medium text-white transition-all shadow-sm';
    return selectedHotels.length === 0 || isSending
      ? `${base} bg-gray-300 cursor-not-allowed`
      : `${base} bg-gradient-to-r from-orange-600 to-amber-600 hover:shadow-md hover:from-orange-700 hover:to-amber-700`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            {t('admin:dashboard.partnership.title', 'Hotel Partnership Outreach')}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin:dashboard.partnership.subtitle', 'Search hotels and send direct partnership proposals')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Search Section */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 relative" ref={searchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('admin:dashboard.partnership.searchHotel', 'Search Hotel')}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                placeholder={t('admin:dashboard.partnership.searchPlaceholder', 'Type hotel name...')}
                className={getSearchInputClassName()}
              />
              <MagnifyingGlassIcon className={getSearchIconClassName()} />

              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSuggestions([]); }}
                  className={getClearBtnClassName()}
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 flex items-center justify-center text-gray-400 space-x-2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('common:loading', 'Loading...')}</span>
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="py-2">
                    {suggestions.map((hotel) => (
                      <button
                        key={hotel.id}
                        onClick={() => handleSelectHotel(hotel)}
                        className={getSuggestionBtnClassName()}
                      >
                        <div className="w-10 h-10 rounded-lg bg-gray-100 flex-shrink-0 flex items-center justify-center overflow-hidden border border-gray-200">
                          {hotel.image ? (
                            <img src={hotel.image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BuildingOffice2Icon className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 truncate">
                            {isRTL && hotel.nameAr ? hotel.nameAr : hotel.name}
                          </h4>
                          <div className={getSuggestionMetaClassName()}>
                            {hotel.city && (
                              <span className="flex items-center">
                                <MapPinIcon className="w-3 h-3 mr-0.5" />
                                {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                              </span>
                            )}
                            {hotel.starRating && renderStars(hotel.starRating)}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchQuery.length >= 2 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    {t('common:noResults', 'No results found')}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
            <h3 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
              <EnvelopeIcon className="w-5 h-5" />
              {t('admin:dashboard.partnership.emailPreview', 'Email Preview')}
            </h3>
            <p className="text-sm text-orange-700 leading-relaxed">
              {t('admin:dashboard.partnership.previewDesc', 'The selected hotels will receive a professional partnership proposal containing the Gaith Tours logo, our system advantages, and a call-to-action to establish direct rates.')}
            </p>
          </div>
        </div>

        {/* Selected List Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 h-full flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <BuildingOffice2Icon className="w-5 h-5 text-gray-500" />
                {t('admin:dashboard.partnership.selectedHotels', 'Selected Hotels')}
                <span className="bg-gray-100 text-gray-600 text-xs py-0.5 px-2 rounded-full font-medium ml-2">
                  {selectedHotels.length}
                </span>
              </h3>

              <button
                onClick={handleSendEmails}
                disabled={selectedHotels.length === 0 || isSending}
                className={getSendBtnClassName()}
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('common:sending', 'Sending...')}</span>
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="w-4 h-4" />
                    <span>{t('admin:dashboard.partnership.sendEmails', 'Send Emails')}</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex-1">
              {selectedHotels.length === 0 ? (
                <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                    <BuildingOffice2Icon className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm">{t('admin:dashboard.partnership.noSelection', 'Search and select hotels to add to the list')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedHotels.map((hotel) => (
                    <div key={hotel.id} className={getSelectedHotelClassName(hotel)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between sm:justify-start">
                          <h4 className="font-medium text-gray-900 truncate pr-4">{hotel.name}</h4>
                          <button
                            onClick={() => handleRemoveHotel(hotel.id)}
                            className="sm:hidden text-gray-400 hover:text-red-500 p-1"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </div>
                        {hotel.city && (
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center">
                            <MapPinIcon className="w-3 h-3 mr-1" />
                            {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                          </div>
                        )}
                      </div>

                      <div className="w-full sm:w-64 flex-shrink-0 flex items-center gap-2">
                        <div className="relative flex-1">
                          <EnvelopeIcon className={getEnvelopeIconClassName()} />
                          <input
                            type="email"
                            value={hotel.email}
                            onChange={(e) => handleUpdateEmail(hotel.id, e.target.value)}
                            onFocus={() => setEditingEmailId(hotel.id)}
                            onBlur={() => setEditingEmailId(null)}
                            placeholder={t('admin:dashboard.partnership.emailPlaceholder', 'hotel@example.com')}
                            className={getEmailInputClassName(hotel)}
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveHotel(hotel.id)}
                          className="hidden sm:flex items-center justify-center text-gray-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title={t('common:remove', 'Remove')}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
