import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  BuildingOffice2Icon,
  CheckIcon,
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  LanguageIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

interface HotelItem {
  hid: number;
  hotelId: string;
  name: string;
  nameAr: string;
  city: string;
  country: string;
  starRating: number;
  image: string | null;
}

export const HotelArabicNamesTab: React.FC = () => {
  const { t, i18n } = useTranslation(['admin']);
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HotelItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [arabicNamesMap, setArabicNamesMap] = useState<Record<number, string>>({});
  const [savingHid, setSavingHid] = useState<number | null>(null);
  const [editingHid, setEditingHid] = useState<number | null>(null);

  // Hotels that already have Arabic names
  const [arabicNamedHotels, setArabicNamedHotels] = useState<HotelItem[]>([]);
  const [totalWithArabic, setTotalWithArabic] = useState(0);
  const [isLoadingArabicList, setIsLoadingArabicList] = useState(false);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Load hotels with Arabic names on mount
  const loadArabicNamedHotels = useCallback(async () => {
    setIsLoadingArabicList(true);
    try {
      const response = await fetch(`${API_URL}/admin/hotel-arabic-names/with-arabic?limit=100`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success && data.data) {
        setArabicNamedHotels(data.data.hotels || []);
        setTotalWithArabic(data.data.total || 0);
      }
    } catch (err) {
      console.error('Error loading Arabic named hotels:', err);
    } finally {
      setIsLoadingArabicList(false);
    }
  }, [API_URL]);

  useEffect(() => {
    loadArabicNamedHotels();
  }, [loadArabicNamedHotels]);

  // Search hotels
  const searchHotels = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `${API_URL}/admin/hotel-arabic-names/search?q=${encodeURIComponent(query)}`,
        { headers: getAuthHeaders() }
      );
      const data = await response.json();
      if (data.success && data.data) {
        const hotels = data.data.hotels || [];
        setSearchResults(hotels);
        // Pre-fill existing Arabic names
        const map: Record<number, string> = {};
        hotels.forEach((h: HotelItem) => {
          if (h.nameAr) map[h.hid] = h.nameAr;
        });
        setArabicNamesMap(prev => ({ ...prev, ...map }));
      }
    } catch (err) {
      console.error('Error searching hotels:', err);
    } finally {
      setIsSearching(false);
    }
  }, [API_URL]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchHotels(searchQuery), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery, searchHotels]);

  // Save Arabic name
  const saveArabicName = async (hid: number) => {
    const nameAr = arabicNamesMap[hid]?.trim();
    if (!nameAr || nameAr.length < 2) {
      toast.error('Arabic name must be at least 2 characters');
      return;
    }

    setSavingHid(hid);
    try {
      const response = await fetch(`${API_URL}/admin/hotel-arabic-names/${hid}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nameAr })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('admin:dashboard.hotelArabicNames.saved'));
        setEditingHid(null);
        // Update the search results and arabic list
        setSearchResults(prev => prev.map(h => h.hid === hid ? { ...h, nameAr } : h));
        loadArabicNamedHotels();
      } else {
        toast.error(data.message || t('admin:dashboard.hotelArabicNames.error'));
      }
    } catch (err) {
      toast.error(t('admin:dashboard.hotelArabicNames.error'));
    } finally {
      setSavingHid(null);
    }
  };

  // Remove Arabic name
  const removeArabicName = async (hid: number) => {
    setSavingHid(hid);
    try {
      const response = await fetch(`${API_URL}/admin/hotel-arabic-names/${hid}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await response.json();
      if (data.success) {
        toast.success(t('admin:dashboard.hotelArabicNames.removed'));
        setArabicNamesMap(prev => {
          const updated = { ...prev };
          delete updated[hid];
          return updated;
        });
        setSearchResults(prev => prev.map(h => h.hid === hid ? { ...h, nameAr: '' } : h));
        loadArabicNamedHotels();
      } else {
        toast.error(data.message || t('admin:dashboard.hotelArabicNames.error'));
      }
    } catch (err) {
      toast.error(t('admin:dashboard.hotelArabicNames.error'));
    } finally {
      setSavingHid(null);
    }
  };

  // ============ BULK UPLOAD ============
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkParsed, setBulkParsed] = useState<{ hid: number; nameAr: string }[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ success: number; failed: number; errors: any[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV/text input into structured data
  const parseBulkInput = (text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: { hid: number; nameAr: string }[] = [];
    const errors: string[] = [];

    lines.forEach((line, idx) => {
      // Skip header row
      if (idx === 0 && (line.toLowerCase().includes('hid') || line.toLowerCase().includes('hotel'))) return;

      // Support: HID,ArabicName  or  HID\tArabicName  or  HID;ArabicName
      const parts = line.split(/[,\t;]/).map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length < 2) {
        errors.push(`Line ${idx + 1}: Invalid format - "${line}"`);
        return;
      }

      const hid = parseInt(parts[0]);
      const nameAr = parts[1];

      if (!hid || isNaN(hid)) {
        errors.push(`Line ${idx + 1}: Invalid HID "${parts[0]}"`);
        return;
      }

      if (!nameAr || nameAr.length < 2) {
        errors.push(`Line ${idx + 1}: Arabic name too short "${nameAr}"`);
        return;
      }

      parsed.push({ hid, nameAr });
    });

    setBulkParsed(parsed);
    setBulkErrors(errors);
    return { parsed, errors };
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setBulkText(text);
      parseBulkInput(text);
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Submit bulk update
  const submitBulkUpdate = async () => {
    if (bulkParsed.length === 0) {
      toast.error('No valid entries to upload');
      return;
    }

    setIsBulkUploading(true);
    setBulkResult(null);
    try {
      const response = await fetch(`${API_URL}/admin/hotel-arabic-names/bulk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ hotels: bulkParsed })
      });
      const data = await response.json();
      if (data.success && data.data) {
        setBulkResult(data.data);
        if (data.data.success > 0) {
          toast.success(`${data.data.success} hotels updated successfully`);
          loadArabicNamedHotels();
        }
        if (data.data.failed > 0) {
          toast.error(`${data.data.failed} hotels failed to update`);
        }
      } else {
        toast.error(data.message || 'Bulk update failed');
      }
    } catch (err) {
      toast.error('Failed to process bulk update');
    } finally {
      setIsBulkUploading(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < Math.min(rating || 0, 5); i++) {
      stars.push(<StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />);
    }
    return stars;
  };

  const renderHotelCard = (hotel: HotelItem, isFromArabicList = false) => {
    const isEditing = editingHid === hotel.hid;
    const isSaving = savingHid === hotel.hid;
    const currentArabic = arabicNamesMap[hotel.hid] ?? hotel.nameAr ?? '';

    return (
      <div
        key={`${isFromArabicList ? 'ar' : 'search'}_${hotel.hid}`}
        className="bg-white rounded-xl border border-gray-200 hover:border-orange-200 shadow-sm hover:shadow-md transition-all p-4"
      >
        <div className="flex items-start gap-4">
          {/* Hotel Image */}
          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {hotel.image ? (
              <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BuildingOffice2Icon className="h-8 w-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Hotel Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-semibold text-gray-800 truncate">{hotel.name}</h4>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex">{renderStars(hotel.starRating)}</div>
                  {hotel.city && (
                    <span className="text-xs text-gray-500">
                      {hotel.city}{hotel.country ? `, ${hotel.country}` : ''}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">HID: {hotel.hid}</div>
              </div>
            </div>

            {/* Arabic Name Input */}
            <div className="mt-3">
              <label className="text-xs font-medium text-gray-500 block mb-1">
                {t('admin:dashboard.hotelArabicNames.arabicName')}
              </label>
              {isEditing || !hotel.nameAr ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={currentArabic}
                    onChange={(e) => setArabicNamesMap(prev => ({ ...prev, [hotel.hid]: e.target.value }))}
                    placeholder={t('admin:dashboard.hotelArabicNames.arabicNamePlaceholder')}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-right"
                    dir="rtl"
                    disabled={isSaving}
                  />
                  <button
                    onClick={() => saveArabicName(hotel.hid)}
                    disabled={isSaving || !currentArabic?.trim()}
                    className="px-3 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                  >
                    {isSaving ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <CheckIcon className="h-4 w-4" />
                    )}
                    {t('admin:dashboard.hotelArabicNames.save')}
                  </button>
                  {isEditing && hotel.nameAr && (
                    <button
                      onClick={() => {
                        setEditingHid(null);
                        setArabicNamesMap(prev => ({ ...prev, [hotel.hid]: hotel.nameAr }));
                      }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-right" dir="rtl">
                    <span className="text-green-800 font-medium text-sm">{hotel.nameAr}</span>
                  </div>
                  <button
                    onClick={() => {
                      setEditingHid(hotel.hid);
                      setArabicNamesMap(prev => ({ ...prev, [hotel.hid]: hotel.nameAr }));
                    }}
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                    title={t('admin:dashboard.hotelArabicNames.editArabicName')}
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeArabicName(hotel.hid)}
                    disabled={isSaving}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                    title={t('admin:dashboard.hotelArabicNames.remove')}
                  >
                    {isSaving ? (
                      <div className="animate-spin h-4 w-4 border-2 border-red-500 border-t-transparent rounded-full" />
                    ) : (
                      <TrashIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg">
          <LanguageIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            {t('admin:dashboard.hotelArabicNames.title')}
          </h2>
          <p className="text-gray-500">
            {t('admin:dashboard.hotelArabicNames.subtitle')}
          </p>
        </div>
      </div>

      {/* Search Box */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('admin:dashboard.hotelArabicNames.searchLabel')}
          </label>
          <button
            onClick={() => { setShowBulkPanel(!showBulkPanel); setBulkResult(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showBulkPanel
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ArrowUpTrayIcon className="h-4 w-4" />
            {showBulkPanel ? t('admin:dashboard.hotelArabicNames.bulkClose', 'Close Bulk') : t('admin:dashboard.hotelArabicNames.bulkUpload', 'Bulk Upload')}
          </button>
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('admin:dashboard.hotelArabicNames.searchPlaceholder')}
            className={`w-full px-4 py-3 ${isRTL ? 'pr-12' : 'pl-12'} bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 placeholder-gray-400`}
          />
          <MagnifyingGlassIcon className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} h-5 w-5 text-gray-400`} />
          {isSearching && (
            <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'}`}>
              <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Upload Panel */}
      {showBulkPanel && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-orange-200 shadow-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowUpTrayIcon className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{t('admin:dashboard.hotelArabicNames.bulkTitle', 'Bulk Arabic Name Update')}</h3>
              <p className="text-xs text-gray-500">{t('admin:dashboard.hotelArabicNames.bulkSubtitle', 'Upload a CSV file or paste data to update multiple hotels at once')}</p>
            </div>
          </div>

          {/* Format Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">{t('admin:dashboard.hotelArabicNames.bulkFormat', 'CSV Format: HID,Arabic Name')}</p>
                <div className="bg-blue-100/50 rounded-lg p-2 font-mono text-xs space-y-0.5">
                  <p>HID,Arabic Name</p>
                  <p>10102425,ايوا اكسبريس - الروضة</p>
                  <p>12345678,فندق المدينة</p>
                  <p>87654321,منتجع الواحة</p>
                </div>
                <p className="mt-1 text-xs text-blue-600">{t('admin:dashboard.hotelArabicNames.bulkFormatHint', 'Supports comma, tab, or semicolon separators. Max 500 per batch.')}</p>
              </div>
            </div>
          </div>

          {/* File Upload + Paste */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Upload File */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.tsv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
              >
                <ArrowUpTrayIcon className="h-5 w-5" />
                {t('admin:dashboard.hotelArabicNames.bulkUploadFile', 'Upload CSV File')}
              </button>
            </div>

            {/* Paste from Clipboard */}
            <button
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    setBulkText(text);
                    parseBulkInput(text);
                    toast.success('Pasted from clipboard');
                  }
                } catch { toast.error('Cannot access clipboard'); }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <ClipboardDocumentIcon className="h-5 w-5" />
              {t('admin:dashboard.hotelArabicNames.bulkPaste', 'Paste from Clipboard')}
            </button>
          </div>

          {/* Text Area */}
          <textarea
            value={bulkText}
            onChange={(e) => {
              setBulkText(e.target.value);
              parseBulkInput(e.target.value);
            }}
            placeholder={`HID,Arabic Name\n10102425,ايوا اكسبريس - الروضة\n12345678,فندق المدينة`}
            className="w-full h-40 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm font-mono resize-y"
            dir="ltr"
          />

          {/* Parse Status */}
          {bulkText && (
            <div className="flex items-center gap-4 flex-wrap">
              {bulkParsed.length > 0 && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {bulkParsed.length} {t('admin:dashboard.hotelArabicNames.bulkValid', 'valid entries')}
                </span>
              )}
              {bulkErrors.length > 0 && (
                <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                  {bulkErrors.length} {t('admin:dashboard.hotelArabicNames.bulkInvalid', 'errors')}
                </span>
              )}
            </div>
          )}

          {/* Error Details */}
          {bulkErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 max-h-32 overflow-y-auto">
              <div className="text-xs text-red-700 space-y-1">
                {bulkErrors.slice(0, 10).map((err, i) => (
                  <p key={i}>{err}</p>
                ))}
                {bulkErrors.length > 10 && (
                  <p className="font-medium">... and {bulkErrors.length - 10} more errors</p>
                )}
              </div>
            </div>
          )}

          {/* Bulk Result */}
          {bulkResult && (
            <div className={`rounded-xl p-4 border ${bulkResult.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
              <div className="flex items-center gap-4">
                <CheckIcon className={`h-6 w-6 ${bulkResult.failed > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                <div className="text-sm">
                  <p className="font-medium text-gray-800">
                    {t('admin:dashboard.hotelArabicNames.bulkComplete', 'Bulk update complete')}
                  </p>
                  <p className="text-gray-600">
                    {bulkResult.success} {t('admin:dashboard.hotelArabicNames.bulkUpdated', 'updated')} — {bulkResult.failed} {t('admin:dashboard.hotelArabicNames.bulkFailed', 'failed')}
                  </p>
                </div>
              </div>
              {bulkResult.errors && bulkResult.errors.length > 0 && (
                <div className="mt-2 text-xs text-red-600 space-y-0.5">
                  {bulkResult.errors.slice(0, 5).map((e: any, i: number) => (
                    <p key={i}>HID {e.hid}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setBulkText('');
                setBulkParsed([]);
                setBulkErrors([]);
                setBulkResult(null);
              }}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm transition-colors"
            >
              {t('admin:dashboard.hotelArabicNames.bulkClear', 'Clear')}
            </button>
            <button
              onClick={submitBulkUpdate}
              disabled={isBulkUploading || bulkParsed.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-orange-200"
            >
              {isBulkUploading ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <ArrowUpTrayIcon className="h-4 w-4" />
              )}
              {t('admin:dashboard.hotelArabicNames.bulkSubmit', 'Update')} {bulkParsed.length > 0 && `(${bulkParsed.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-700">
            {searchResults.length} {t('admin:dashboard.hotelArabicNames.noResults') === 'No hotels found' ? 'hotels found' : 'فنادق'}
          </h3>
          <div className="grid gap-3">
            {searchResults.map(hotel => renderHotelCard(hotel))}
          </div>
        </div>
      )}

      {/* No results */}
      {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-yellow-700">{t('admin:dashboard.hotelArabicNames.noResults')}</p>
        </div>
      )}

      {/* Hotels with Arabic Names */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-700">
            {t('admin:dashboard.hotelArabicNames.withArabicNames')}
          </h3>
          {totalWithArabic > 0 && (
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              {t('admin:dashboard.hotelArabicNames.totalWithArabic', { count: totalWithArabic })}
            </span>
          )}
        </div>

        {isLoadingArabicList ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : arabicNamedHotels.length > 0 ? (
          <div className="grid gap-3">
            {arabicNamedHotels.map(hotel => renderHotelCard(hotel, true))}
          </div>
        ) : (
          <div className="text-center py-8">
            <LanguageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('admin:dashboard.hotelArabicNames.noArabicNames')}</p>
          </div>
        )}
      </div>

      {/* Empty State (when no search and no Arabic names) */}
      {!searchQuery && arabicNamedHotels.length === 0 && !isLoadingArabicList && (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-12 text-center">
          <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl w-fit mx-auto mb-4">
            <LanguageIcon className="h-12 w-12 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            {t('admin:dashboard.hotelArabicNames.emptyTitle')}
          </h3>
          <p className="text-gray-500">
            {t('admin:dashboard.hotelArabicNames.emptySubtitle')}
          </p>
        </div>
      )}
    </div>
  );
};
