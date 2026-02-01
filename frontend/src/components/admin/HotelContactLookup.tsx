import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  StarIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface HotelSuggestion {
  id: string;
  name: string;
  city?: string;
  country?: string;
}

interface HotelContactInfo {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
  rating?: number;
  phone?: string;
  email?: string;
}

export const HotelContactLookup: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<HotelSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingContact, setIsLoadingContact] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<HotelContactInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from API
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(query)}&language=${i18n.language}`);
      const data = await response.json();

      if (data.success && data.data) {
        const hotels = data.data.hotels || [];
        setSuggestions(hotels.slice(0, 10));
        setShowSuggestions(hotels.length > 0);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch hotel contact info
  const fetchHotelContact = async (hotelId: string, hotelName: string) => {
    setIsLoadingContact(true);
    setError(null);
    setShowSuggestions(false);
    setSearchQuery(hotelName);

    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const token = localStorage.getItem('token');

      const response = await fetch(`${API_URL}/admin/hotel-contact/${encodeURIComponent(hotelId)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.data) {
        setSelectedHotel(data.data);
      } else {
        setError(data.message || 'Failed to fetch hotel contact info');
        setSelectedHotel(null);
      }
    } catch (err: any) {
      console.error('Error fetching hotel contact:', err);
      setError(err.message || 'Failed to fetch hotel contact info');
      setSelectedHotel(null);
    } finally {
      setIsLoadingContact(false);
    }
  };

  const handleSelectHotel = (hotel: HotelSuggestion) => {
    fetchHotelContact(hotel.id, hotel.name);
  };

  const clearSelection = () => {
    setSelectedHotel(null);
    setSearchQuery('');
    setError(null);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        stars.push(<StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />);
      } else {
        stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg">
          <PhoneIcon className="h-8 w-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Hotel Contact Lookup</h2>
          <p className="text-gray-500">Search for hotels and view their contact information</p>
        </div>
      </div>

      {/* Search Box */}
      <div ref={searchRef} className="relative z-20">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Search Hotel
          </label>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type hotel name to search..."
              className="w-full px-4 py-3 pl-12 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-800 placeholder-gray-400"
            />
            <MagnifyingGlassIcon className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} h-5 w-5 text-gray-400`} />
            {isSearching && (
              <div className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'}`}>
                <div className="animate-spin h-5 w-5 border-2 border-orange-500 border-t-transparent rounded-full"></div>
              </div>
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={clearSelection}
                className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} p-1 hover:bg-gray-200 rounded-full transition-colors`}
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Suggestions Dropdown - positioned relative to search container */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50">
            {suggestions.map((hotel) => (
              <button
                key={hotel.id}
                onClick={() => handleSelectHotel(hotel)}
                className="w-full px-4 py-3 text-left hover:bg-orange-50 flex items-center gap-3 border-b border-gray-50 last:border-b-0 transition-colors"
              >
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 rounded-lg">
                  <BuildingOffice2Icon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-800">{hotel.name}</div>
                  {(hotel.city || hotel.country) && (
                    <div className="text-sm text-gray-500">
                      {[hotel.city, hotel.country].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoadingContact && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-8">
          <div className="flex items-center justify-center gap-4">
            <div className="animate-spin h-8 w-8 border-3 border-orange-500 border-t-transparent rounded-full"></div>
            <span className="text-gray-600 font-medium">Loading hotel contact info...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoadingContact && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 text-red-700">
            <XMarkIcon className="h-6 w-6" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Hotel Contact Card */}
      {selectedHotel && !isLoadingContact && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          {/* Hotel Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <BuildingOffice2Icon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedHotel.name}</h3>
                  {selectedHotel.rating && (
                    <div className="flex items-center gap-1 mt-1">
                      {renderStars(selectedHotel.rating)}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={clearSelection}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Hotel Details */}
          <div className="p-6 space-y-4">
            {/* Address */}
            {(selectedHotel.address || selectedHotel.city || selectedHotel.country) && (
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
                <MapPinIcon className="h-6 w-6 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">Address</div>
                  <div className="text-gray-800">
                    {selectedHotel.address && <div>{selectedHotel.address}</div>}
                    <div>{[selectedHotel.city, selectedHotel.country].filter(Boolean).join(', ')}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PhoneIcon className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-500">Phone</div>
                    {selectedHotel.phone ? (
                      <a
                        href={`tel:${selectedHotel.phone}`}
                        className="text-lg font-semibold text-green-700 hover:text-green-800 transition-colors block truncate"
                      >
                        {selectedHotel.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not available</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    {selectedHotel.email ? (
                      <a
                        href={`mailto:${selectedHotel.email}`}
                        className="text-lg font-semibold text-blue-700 hover:text-blue-800 transition-colors block truncate"
                      >
                        {selectedHotel.email}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not available</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Copy Buttons */}
            {(selectedHotel.phone || selectedHotel.email) && (
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                {selectedHotel.phone && (
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedHotel.phone!)}
                    className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    <PhoneIcon className="h-4 w-4" />
                    Copy Phone
                  </button>
                )}
                {selectedHotel.email && (
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedHotel.email!)}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium text-sm transition-colors flex items-center gap-2"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    Copy Email
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedHotel && !isLoadingContact && !error && (
        <div className="bg-white/60 backdrop-blur-xl rounded-2xl border border-white/20 p-12 text-center">
          <div className="p-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl w-fit mx-auto mb-4">
            <BuildingOffice2Icon className="h-12 w-12 text-orange-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Search for a Hotel</h3>
          <p className="text-gray-500">Start typing a hotel name above to find contact information</p>
        </div>
      )}
    </div>
  );
};
