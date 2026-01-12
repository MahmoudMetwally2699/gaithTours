import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FunnelIcon,
  StarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  MapIcon,
  UserIcon,
  ChevronDownIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, BuildingOffice2Icon } from '@heroicons/react/24/solid';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../types/hotel';
import { useDirection } from '../hooks/useDirection';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SearchFilters {
  priceRange: [number, number];
  starRating: number[];
  propertyTypes: string[];
  facilities: string[];
  sortBy: string;
}

// Autocomplete types
interface AutocompleteSuggestion {
  id: string | number;
  name: string;
  type: string;
  hid?: number;
}

interface AutocompleteResults {
  hotels: AutocompleteSuggestion[];
  regions: AutocompleteSuggestion[];
}

// Helper function to get review score text
const getScoreText = (rating: number): string => {
  if (rating >= 9) return 'Wonderful';
  if (rating >= 8) return 'Very good';
  if (rating >= 7) return 'Good';
  if (rating >= 6) return 'Pleasant';
  return 'Fair';
};

// Budget histogram data (mock - will be calculated from actual prices)
const generateBudgetHistogram = (hotels: Hotel[], maxPrice: number) => {
  const buckets = 20;
  const bucketSize = maxPrice / buckets;
  const histogram = new Array(buckets).fill(0);

  hotels.forEach(hotel => {
    if (hotel.price && hotel.price > 0) {
      const bucket = Math.min(Math.floor(hotel.price / bucketSize), buckets - 1);
      histogram[bucket]++;
    }
  });

  const maxCount = Math.max(...histogram, 1);
  return histogram.map(count => (count / maxCount) * 100);
};

// City coordinates for map centering
const cityCoordinates: { [key: string]: [number, number] } = {
  // Middle East
  'cairo': [30.0444, 31.2357],
  'mecca': [21.4225, 39.8262],
  'makkah': [21.4225, 39.8262],
  'medina': [24.4672, 39.6024],
  'riyadh': [24.7136, 46.6753],
  'jeddah': [21.5433, 39.1728],
  'dubai': [25.2048, 55.2708],
  'abu dhabi': [24.4539, 54.3773],
  'doha': [25.2867, 51.5333],
  'muscat': [23.5880, 58.3829],
  'amman': [31.9539, 35.9106],
  'beirut': [33.8938, 35.5018],
  'jerusalem': [31.7683, 35.2137],
  'kuwait city': [29.3759, 47.9774],
  'manama': [26.2285, 50.5860],
  // Africa
  'sharm el sheikh': [27.9158, 34.3300],
  'hurghada': [27.2579, 33.8116],
  'luxor': [25.6872, 32.6396],
  'aswan': [24.0889, 32.8998],
  'alexandria': [31.2001, 29.9187],
  'marrakech': [31.6295, 7.9811],
  'casablanca': [33.5731, 7.5898],
  'tunis': [36.8065, 10.1815],
  // Europe
  'london': [51.5074, -0.1278],
  'paris': [48.8566, 2.3522],
  'rome': [41.9028, 12.4964],
  'barcelona': [41.3851, 2.1734],
  'istanbul': [41.0082, 28.9784],
  // Asia
  'bangkok': [13.7563, 100.5018],
  'singapore': [1.3521, 103.8198],
  'tokyo': [35.6762, 139.6503],
  'kuala lumpur': [3.1390, 101.6869],
  'jakarta': [6.2088, 106.8456],
  'mumbai': [19.0760, 72.8777],
  'delhi': [28.7041, 77.1025],
  // Default
  'default': [25.0, 45.0] // Center of Middle East
};

const getCityCoordinates = (destination: string): [number, number] => {
  const normalizedDest = destination.toLowerCase().trim();

  // Try exact match first
  if (cityCoordinates[normalizedDest]) {
    return cityCoordinates[normalizedDest];
  }

  // Try partial match
  for (const [city, coords] of Object.entries(cityCoordinates)) {
    if (normalizedDest.includes(city) || city.includes(normalizedDest)) {
      return coords;
    }
  }

  return cityCoordinates['default'];
};

export const HotelSearchResults: React.FC = () => {
  const { t } = useTranslation();
  const { direction } = useDirection();
  const history = useHistory();
  const location = useLocation();
  const isRTL = direction === 'rtl';

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = {
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: parseInt(searchParams.get('children') || '0')
  };

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalHotels, setTotalHotels] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [editableDestination, setEditableDestination] = useState(searchQuery.destination);

  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 5000],
    starRating: [],
    propertyTypes: [],
    facilities: [],
    sortBy: 'top_picks'
  });

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({ hotels: [], regions: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const hasUserTyped = useRef(false); // Prevent dropdown on page load

  // New Search State
  const [checkInDate, setCheckInDate] = useState<Date | null>(
    searchQuery.checkIn ? new Date(searchQuery.checkIn) : null
  );
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(
    searchQuery.checkOut ? new Date(searchQuery.checkOut) : null
  );
  const [guestCounts, setGuestCounts] = useState({
    rooms: searchQuery.rooms,
    adults: searchQuery.adults,
    children: searchQuery.children
  });
  const [showGuestPopover, setShowGuestPopover] = useState(false);

  // Sync state with URL if it changes externally
  useEffect(() => {
    setCheckInDate(searchQuery.checkIn ? new Date(searchQuery.checkIn) : null);
    setCheckOutDate(searchQuery.checkOut ? new Date(searchQuery.checkOut) : null);
    setGuestCounts({
        rooms: searchQuery.rooms,
        adults: searchQuery.adults,
        children: searchQuery.children
    });
    setEditableDestination(searchQuery.destination);
  }, [searchQuery.checkIn, searchQuery.checkOut, searchQuery.rooms, searchQuery.adults, searchQuery.children, searchQuery.destination]);

  const handleUpdateSearch = () => {
    const params = new URLSearchParams(location.search);
    params.set('destination', editableDestination);
    if (checkInDate) params.set('checkIn', checkInDate.toISOString().split('T')[0]);
    if (checkOutDate) params.set('checkOut', checkOutDate.toISOString().split('T')[0]);
    params.set('rooms', guestCounts.rooms.toString());
    params.set('adults', guestCounts.adults.toString());
    params.set('children', guestCounts.children.toString());

    // Reset page to 1 on new search
    params.set('page', '1');

    history.push({
       pathname: location.pathname,
       search: params.toString()
    });
  };

  const hotelsPerPage = 20;

  // Facilities options
  const facilityOptions = [
    { id: 'free_breakfast', label: 'Free breakfast' },
    { id: 'free_cancellation', label: 'Free cancellation' },
    { id: 'no_prepayment', label: 'No prepayment' },
    { id: 'free_wifi', label: 'Free WiFi' },
    { id: 'parking', label: 'Parking' },
    { id: 'pool', label: 'Swimming pool' },
    { id: 'spa', label: 'Spa' },
    { id: 'gym', label: 'Fitness center' }
  ];

  // Autocomplete: debounced API call
  useEffect(() => {
    // Only fetch if user has actually typed
    if (!hasUserTyped.current) {
      return;
    }

    if (editableDestination.length < 2) {
      setAutocompleteResults({ hotels: [], regions: [] });
      setShowAutocomplete(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsLoadingAutocomplete(true);
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(editableDestination)}`);
        const data = await response.json();

        if (data.success && data.data) {
          const hotels = Array.isArray(data.data.hotels) ? data.data.hotels : [];
          setAutocompleteResults({ hotels, regions: [] });
          if (hotels.length > 0) {
            setShowAutocomplete(true);
          }
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setAutocompleteResults({ hotels: [], regions: [] });
      } finally {
        setIsLoadingAutocomplete(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [editableDestination]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    if (showAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete]);

  // Handle autocomplete selection
  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    hasUserTyped.current = false; // Reset so dropdown doesn't show on next page load
    setEditableDestination(suggestion.name);
    setShowAutocomplete(false);
    setAutocompleteResults({ hotels: [], regions: [] });
    // Navigate to search with the selected hotel
    const params = new URLSearchParams(location.search);
    params.set('destination', suggestion.name);
    history.push(`/hotels/search?${params.toString()}`);
  };

  // Search hotels
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.destination) {
        setError('Please enter a destination');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        // Pass dates and guest count from URL parameters
        const response = await searchHotels(
          searchQuery.destination,
          currentPage,
          hotelsPerPage,
          {
            checkin: searchQuery.checkIn || undefined,
            checkout: searchQuery.checkOut || undefined,
            adults: searchQuery.adults,
            children: searchQuery.children > 0 ? searchQuery.children : undefined
          }
        );

        if (response?.hotels) {
          setHotels(response.hotels);
          setTotalPages(response.totalPages || 0);
          setTotalHotels(response.total || 0);
        } else {
          setHotels([]);
          setTotalPages(0);
          setTotalHotels(0);
        }
      } catch (err: any) {
        console.error('Hotel search error:', err);
        setError(err.message || 'Failed to search hotels');
        setHotels([]);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchQuery.destination, searchQuery.checkIn, searchQuery.checkOut, searchQuery.adults, searchQuery.children, currentPage]);

  // Calculate max price for budget filter
  const maxPrice = useMemo(() => {
    const prices = hotels.filter(h => h.price && h.price > 0).map(h => h.price);
    return Math.max(...prices, 5000);
  }, [hotels]);

  // Budget histogram
  const budgetHistogram = useMemo(() => {
    return generateBudgetHistogram(hotels, maxPrice);
  }, [hotels, maxPrice]);

  // Filter and sort hotels
  const filteredHotels = useMemo(() => {
    let filtered = [...hotels];

    // Apply star rating filter
    if (filters.starRating.length > 0) {
      filtered = filtered.filter(hotel => {
        const starRating = (hotel as any).star_rating || Math.floor(hotel.rating);
        return filters.starRating.includes(starRating);
      });
    }

    // Apply facilities filter
    if (filters.facilities.length > 0) {
      filtered = filtered.filter(hotel => {
        const hotelData = hotel as any;
        const amenities = (hotelData.amenities || []).concat(hotelData.facilities || []);

        return filters.facilities.every(facility => {
          switch (facility) {
            case 'free_breakfast':
              return hotelData.meal_included || hotelData.meal === 'breakfast' || hotelData.breakfast_included;
            case 'free_cancellation':
              return hotelData.free_cancellation || hotelData.cancellation_policy === 'free';
            case 'no_prepayment':
              return hotelData.no_prepayment || hotelData.payment_options?.pay_at_hotel;
            case 'free_wifi':
              return hotelData.free_wifi || amenities.some((a: string) => a.toLowerCase().includes('wifi') || a.toLowerCase().includes('internet'));
            case 'parking':
              return hotelData.parking || amenities.some((a: string) => a.toLowerCase().includes('parking'));
            case 'pool':
              return hotelData.pool || amenities.some((a: string) => a.toLowerCase().includes('pool') || a.toLowerCase().includes('swimming'));
            case 'spa':
              return hotelData.spa || amenities.some((a: string) => a.toLowerCase().includes('spa') || a.toLowerCase().includes('wellness'));
            case 'gym':
              return hotelData.gym || amenities.some((a: string) => a.toLowerCase().includes('gym') || a.toLowerCase().includes('fitness'));
            default:
              return true;
          }
        });
      });
    }

    // Apply price range filter
    filtered = filtered.filter(hotel => {
      if (!hotel.price || hotel.price === 0) return true;
      return hotel.price >= filters.priceRange[0] && hotel.price <= filters.priceRange[1];
    });

    // Sort hotels - always keep searched hotel first
    filtered.sort((a, b) => {
      // Keep the searched hotel at the top - check isSearchedHotel flag OR match by name
      const destinationLower = searchQuery.destination.toLowerCase();
      const aIsSearched = (a as any).isSearchedHotel || a.name.toLowerCase().includes(destinationLower) || destinationLower.includes(a.name.toLowerCase());
      const bIsSearched = (b as any).isSearchedHotel || b.name.toLowerCase().includes(destinationLower) || destinationLower.includes(b.name.toLowerCase());

      if (aIsSearched && !bIsSearched) return -1;
      if (!aIsSearched && bIsSearched) return 1;

      switch (filters.sortBy) {
        case 'price_low':
          if (!a.price || a.price === 0) return 1;
          if (!b.price || b.price === 0) return -1;
          return a.price - b.price;
        case 'price_high':
          if (!a.price || a.price === 0) return 1;
          if (!b.price || b.price === 0) return -1;
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'top_picks':
        default:
          return b.rating - a.rating;
      }
    });

    return filtered;
  }, [hotels, filters]);

  const handleHotelClick = (hotel: Hotel) => {
    const hotelIdentifier = hotel.hid || hotel.id;
    const params = new URLSearchParams({
      ...Object.fromEntries(searchParams),
      hotelId: String(hotelIdentifier)
    });
    history.push(`/hotels/details/${hotelIdentifier}?${params.toString()}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <StarIconSolid
          key={i}
          className={`h-3 w-3 ${i < fullStars ? 'text-yellow-400' : 'text-gray-300'}`}
        />
      );
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Compact & Modern */}
      <div className="relative w-full overflow-visible font-sans">
        {/* Solid Background Color */}
        <div className="absolute inset-0 z-0 overflow-hidden bg-[#E67915] h-full shadow-md"></div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col px-4 sm:px-8 lg:px-16 py-3 pb-6">

          {/* Top Bar: Logo & Auth */}
          <header className="flex flex-row justify-between items-center w-full mb-4">
             {/* Logo */}
             <a href="/" className="flex-shrink-0">
                <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-10 sm:h-12 w-auto drop-shadow-md hover:scale-105 transition-transform" />
             </a>

             {/* Right Side: Auth & Settings */}
             <div className="flex items-center space-x-4 rtl:space-x-reverse text-white">
                <div className="hidden md:flex items-center space-x-4 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20">
                   <div className="flex items-center space-x-1 cursor-pointer hover:text-orange-100 transition-colors">
                      <span className="text-sm font-medium">USD</span>
                      <ChevronDownIcon className="w-3 h-3" />
                   </div>
                   <div className="w-px h-4 bg-white/30"></div>
                   <div className="flex items-center space-x-1 cursor-pointer hover:text-orange-100 transition-colors">
                      <span className="text-sm font-medium">EN</span>
                      <ChevronDownIcon className="w-3 h-3" />
                   </div>
                </div>

                <a href="/login" className="text-sm font-medium hover:text-orange-100 transition-colors hidden sm:block">Sign in</a>
                <a href="/register" className="bg-white text-[#E67915] text-sm font-bold px-4 py-2 rounded-full hover:bg-orange-50 transition shadow-sm">Register</a>
             </div>
          </header>

          {/* Compact Search Bar */}
          <div className="w-full max-w-5xl mx-auto">
             <div className="bg-white/10 backdrop-blur-md rounded-full p-1.5 border border-white/20 flex flex-col md:flex-row items-center relative gap-1 shadow-lg">

                {/* Destination */}
                <div className="w-full md:flex-[1.5] px-4 py-2 md:py-0 border-b md:border-b-0 md:border-r border-white/20 flex items-center gap-3 relative" ref={autocompleteRef}>
                   <MapPinIcon className="h-5 w-5 text-white/90 shrink-0" />
                   <div className="flex flex-col w-full min-w-0">
                      <span className="text-white/70 text-[10px] uppercase tracking-wider font-bold">{t('common.destination', 'Destination')}</span>
                      <input
                         type="text"
                         value={editableDestination}
                         onChange={(e) => {
                           hasUserTyped.current = true;
                           setEditableDestination(e.target.value);
                         }}
                         onFocus={() => {
                           if (hasUserTyped.current && editableDestination.length >= 2 && autocompleteResults.hotels.length > 0) {
                             setShowAutocomplete(true);
                           }
                         }}
                         onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               e.preventDefault();
                               setShowAutocomplete(false);
                               handleUpdateSearch();
                             }
                         }}
                         className="bg-transparent border-none p-0 text-white text-sm font-bold placeholder-white/50 focus:ring-0 w-full truncate"
                         placeholder="Where to?"
                      />
                   </div>

                   {/* Autocomplete Dropdown */}
                   {showAutocomplete && autocompleteResults.hotels.length > 0 && (
                     <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-64 overflow-y-auto animate-fadeIn">
                       <div className="p-2">
                         <p className="text-xs font-bold text-gray-400 px-3 py-1.5 uppercase tracking-wider">Hotels</p>
                         {autocompleteResults.hotels.slice(0, 5).map((hotel) => (
                           <button
                             key={hotel.id}
                             type="button"
                             onClick={() => handleSelectSuggestion(hotel)}
                             className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-orange-50 rounded-lg transition text-left group"
                           >
                             <BuildingOffice2Icon className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition-colors" />
                             <div>
                               <p className="text-gray-800 font-semibold text-sm group-hover:text-orange-700 transition-colors">{hotel.name}</p>
                               <p className="text-[10px] text-gray-400 uppercase tracking-wide">Hotel</p>
                             </div>
                           </button>
                         ))}
                       </div>
                     </div>
                   )}
                </div>

                {/* Dates - Unified Range */}
                <div className="w-full md:flex-[2] px-4 py-2 md:py-0 border-b md:border-b-0 md:border-r border-white/20 flex items-center gap-3">
                   <ClockIcon className="h-5 w-5 text-white/90 shrink-0" />
                   <div className="flex flex-col w-full">
                      <span className="text-white/70 text-[10px] uppercase tracking-wider font-bold">Check-in - Check-out</span>
                      <div className="w-full">
                         <DatePicker
                            selected={checkInDate}
                            onChange={(dates: [Date | null, Date | null]) => {
                               const [start, end] = dates;
                               setCheckInDate(start);
                               setCheckOutDate(end);
                            }}
                            startDate={checkInDate}
                            endDate={checkOutDate}
                            selectsRange
                            minDate={new Date()}
                            className="bg-transparent border-none p-0 text-white text-sm font-bold w-full focus:ring-0 cursor-pointer placeholder-white/50"
                            dateFormat="dd MMM"
                            placeholderText="Select dates"
                            customInput={
                               <input
                                  value={
                                     checkInDate && checkOutDate
                                     ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                     : (checkInDate ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - Select checkout` : '')
                                  }
                                  readOnly
                                  placeholder="Add dates"
                                  className="bg-transparent border-none p-0 text-white text-sm font-bold w-full focus:ring-0 cursor-pointer placeholder-white/50"
                               />
                            }
                         />
                      </div>
                   </div>
                </div>

                {/* Guests */}
                <div className="w-full md:flex-[1.5] relative">
                   <button
                      className="w-full px-4 py-2 md:py-0 flex items-center gap-3 text-left"
                      onClick={() => setShowGuestPopover(!showGuestPopover)}
                   >
                      <UserIcon className="h-5 w-5 text-white/90 shrink-0" />
                      <div className="flex flex-col min-w-0">
                         <span className="text-white/70 text-[10px] uppercase tracking-wider font-bold">{t('common.guests', 'Guests')}</span>
                         <span className="text-white text-sm font-bold truncate">
                            {guestCounts.adults + guestCounts.children} Guests, {guestCounts.rooms} Rm
                         </span>
                      </div>
                   </button>

                   {/* Guest Popover */}
                   {showGuestPopover && (
                      <>
                         <div className="fixed inset-0 z-40" onClick={() => setShowGuestPopover(false)}></div>
                         <div className="absolute top-full right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-5 z-50 text-gray-800 animate-fadeIn cursor-default">
                            {/* Rooms */}
                            <div className="flex justify-between items-center mb-4">
                               <div className="flex flex-col">
                                  <span className="font-bold text-sm text-gray-800">Rooms</span>
                                  <span className="text-xs text-gray-500">Number of rooms</span>
                               </div>
                               <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.max(1, prev.rooms - 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
                                     disabled={guestCounts.rooms <= 1}
                                  >
                                     <MinusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                  <span className="w-4 text-center font-bold text-sm">{guestCounts.rooms}</span>
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.min(10, prev.rooms + 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600"
                                  >
                                     <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                               </div>
                            </div>
                            {/* Adults */}
                            <div className="flex justify-between items-center mb-4">
                               <div className="flex flex-col">
                                  <span className="font-bold text-sm text-gray-800">Adults</span>
                                  <span className="text-xs text-gray-500">Ages 18 or above</span>
                               </div>
                               <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, adults: Math.max(1, prev.adults - 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
                                     disabled={guestCounts.adults <= 1}
                                  >
                                     <MinusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                  <span className="w-4 text-center font-bold text-sm">{guestCounts.adults}</span>
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, adults: Math.min(30, prev.adults + 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600"
                                  >
                                     <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                               </div>
                            </div>
                            {/* Children */}
                            <div className="flex justify-between items-center mb-6">
                               <div className="flex flex-col">
                                  <span className="font-bold text-sm text-gray-800">Children</span>
                                  <span className="text-xs text-gray-500">Ages 0-17</span>
                               </div>
                               <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, children: Math.max(0, prev.children - 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
                                     disabled={guestCounts.children <= 0}
                                  >
                                     <MinusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                                  <span className="w-4 text-center font-bold text-sm">{guestCounts.children}</span>
                                  <button
                                     onClick={() => setGuestCounts(prev => ({...prev, children: Math.min(10, prev.children + 1)}))}
                                     className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600"
                                  >
                                     <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                                  </button>
                               </div>
                            </div>

                            <button
                               className="w-full bg-[#E67915] text-white text-sm font-bold py-2.5 rounded-lg hover:bg-orange-600 transition-colors shadow-md"
                               onClick={() => setShowGuestPopover(false)}
                            >
                               Done
                            </button>
                         </div>
                      </>
                   )}
                </div>

                {/* Search Button */}
                <div className="p-1">
                   <button
                     onClick={handleUpdateSearch}
                     className="bg-white text-[#E67915] w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center hover:bg-orange-50 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                     title="Update Search"
                   >
                      <MagnifyingGlassIcon className="w-5 h-5 md:w-6 md:h-6 stroke-[2.5]" />
                   </button>
                </div>

             </div>
          </div>




          {/* Travelling for work checkbox */}
          <div className="flex items-center space-x-2 mb-2">
            <input type="checkbox" id="business" className="w-4 h-4 rounded border-gray-300" />
            <label htmlFor="business" className="text-white text-sm">I'm travelling for work</label>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">
              {searchQuery.destination}: {totalHotels} properties found
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="top_picks">Top picks</option>
                <option value="price_low">Price (lowest first)</option>
                <option value="price_high">Price (highest first)</option>
                <option value="rating">Best reviewed</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Filters Sidebar - Always visible on desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              {/* Show on Map */}
              <button
                onClick={() => setFullscreenMap(true)}
                className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-center gap-2 transition-colors"
              >
                <MapIcon className="h-5 w-5 text-blue-600" />
                <span className="text-blue-600 font-medium text-sm">Show on map</span>
              </button>

              {/* Map Preview - Interactive Leaflet Map */}
              {showMap && (
                <div className="mb-4 rounded-lg overflow-hidden border border-gray-200">
                  <MapContainer
                    center={getCityCoordinates(searchQuery.destination)}
                    zoom={12}
                    style={{ height: '200px', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    />
                    {filteredHotels.slice(0, 20).map((hotel) => {
                      const coords = (hotel as any).coordinates;
                      if (coords && coords.latitude && coords.longitude) {
                        return (
                          <Marker
                            key={hotel.id}
                            position={[coords.latitude, coords.longitude]}
                          >
                            <Popup>
                              <div className="text-sm">
                                <strong>{hotel.name}</strong>
                                {hotel.price && hotel.price > 0 && (
                                  <div className="text-orange-600 font-bold">
                                    SAR {hotel.price}
                                  </div>
                                )}
                              </div>
                            </Popup>
                          </Marker>
                        );
                      }
                      return null;
                    })}
                  </MapContainer>
                </div>
              )}

              {/* Budget Filter with Histogram */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Your budget (per night)</h3>

                {/* Histogram */}
                <div className="h-16 flex items-end gap-0.5 mb-2">
                  {budgetHistogram.map((height, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-orange-200 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(height, 5)}%` }}
                    />
                  ))}
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: [0, parseInt(e.target.value)]
                  }))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>SAR 0</span>
                  <span>SAR {filters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              {/* Star Rating */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Hotel Stars</h3>
                <div className="flex flex-wrap gap-2">
                  {[5, 4, 3, 2, 1].map(star => (
                    <button
                      key={star}
                      onClick={() => {
                        if (filters.starRating.includes(star)) {
                          setFilters(prev => ({
                            ...prev,
                            starRating: prev.starRating.filter(s => s !== star)
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            starRating: [...prev.starRating, star]
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 transition-colors ${
                        filters.starRating.includes(star)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      {star} <StarIconSolid className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Facilities */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Facilities</h3>
                <div className="space-y-2">
                  {facilityOptions.slice(0, 6).map(facility => (
                    <label key={facility.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.facilities.includes(facility.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              facilities: [...prev.facilities, facility.id]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              facilities: prev.facilities.filter(f => f !== facility.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{facility.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <button
                onClick={() => setFilters({
                  priceRange: [0, maxPrice],
                  starRating: [],
                  propertyTypes: [],
                  facilities: [],
                  sortBy: 'top_picks'
                })}
                className="w-full text-orange-500 hover:text-orange-600 text-sm font-medium py-2"
              >
                Clear all filters
              </button>
            </div>
          </div>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden fixed bottom-4 left-4 right-4 bg-orange-500 text-white py-3 rounded-lg font-medium shadow-lg z-40 flex items-center justify-center gap-2"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters
          </button>

          {/* Hotel Results */}
          <div className="flex-1">
            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg shadow-sm p-4 animate-pulse">
                    <div className="flex gap-4">
                      <div className="w-48 h-32 bg-gray-200 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-gray-200 rounded w-2/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/3" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                      <div className="w-32 space-y-2">
                        <div className="h-6 bg-gray-200 rounded" />
                        <div className="h-8 bg-gray-200 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <p className="text-red-600">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 text-orange-500 hover:text-orange-600 font-medium"
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Hotel Cards */}
            {!loading && !error && (
              <div className="space-y-4">
                {filteredHotels.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <BuildingOfficeIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No hotels found</h3>
                    <p className="text-gray-600">Try adjusting your filters</p>
                  </div>
                ) : (
                  filteredHotels.map((hotel, index) => (
                    <motion.div
                      key={hotel.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-200"
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Hotel Image with Heart Icon */}
                        <div className="relative sm:w-52 lg:w-60 flex-shrink-0">
                          {hotel.image ? (
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              className="w-full h-48 sm:h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 sm:h-full bg-gray-100 flex items-center justify-center">
                              <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                          {/* Heart Icon */}
                          <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>

                        {/* Hotel Info */}
                        <div className="flex-1 p-4">
                          <div className="flex justify-between gap-4">
                            {/* Left Content */}
                            <div className="flex-1">
                              {/* Name and Stars */}
                              <div className="flex items-center gap-2 mb-1">
                                <h3
                                  onClick={() => handleHotelClick(hotel)}
                                  className="text-lg font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
                                >
                                  {hotel.name}
                                </h3>
                                <div className="flex">
                                  {renderStars((hotel as any).star_rating || Math.round(hotel.rating / 2))}
                                </div>
                              </div>

                              {/* Location with Show on map */}
                              <div className="flex items-center gap-2 text-xs mb-3">
                                <span className="text-orange-500 font-medium">{hotel.city || searchQuery.destination}</span>
                                <span
                                  className="text-orange-500 hover:underline cursor-pointer"
                                  onClick={() => setFullscreenMap(true)}
                                >
                                  Show on map
                                </span>
                                {hotel.address && (
                                  <span className="text-gray-500">· {hotel.address}</span>
                                )}
                              </div>

                              {/* Room Info */}
                              <div className="border-l-2 border-gray-200 pl-3 mb-3">
                                <div className="font-semibold text-sm text-gray-900">
                                  {(hotel as any).room_name || 'King room'}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-600 mt-1">
                                  <span>🛏️</span>
                                  <span>🛏️</span>
                                  <span className="ml-1">{(hotel as any).bed_type || '1 double bed'}</span>
                                </div>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-2">
                                {((hotel as any).meal_included || (hotel as any).meal === 'breakfast' || (hotel as any).breakfast_included) && (
                                  <span className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                                    Free Breakfast
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right Content - Review Score */}
                            <div className="text-right flex-shrink-0">
                              <div className="flex items-start gap-2">
                                <div className="text-right">
                                  <div className="text-sm font-medium text-gray-900">
                                    {getScoreText(hotel.rating)}
                                  </div>
                                  {(hotel.reviewCount ?? 0) > 0 && (
                                    <div className="text-xs text-gray-500">
                                      {hotel.reviewCount?.toLocaleString()} reviews
                                    </div>
                                  )}
                                </div>
                                <div className="bg-[#F7871D] text-white px-2.5 py-1.5 rounded-tl-lg rounded-tr-lg rounded-br-lg text-sm font-bold">
                                  {Math.min(hotel.rating, 10).toFixed(1)}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Price and Action */}
                          <div className="flex items-end justify-end mt-4 pt-3 border-t border-gray-100 gap-4">
                            <div className="text-right">
                              {(hotel as any).noRatesAvailable ? (
                                <div className="text-sm font-medium text-red-500">
                                  No rooms available
                                </div>
                              ) : hotel.price && hotel.price > 0 ? (
                                <>
                                  <div className="text-xs text-gray-500">1 night, {searchQuery.adults} adults</div>
                                  <div className="text-xl font-bold text-gray-900">
                                    SAR {Math.round(hotel.price).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Total inc. tax & fees: SAR {Math.round(hotel.price).toLocaleString()}
                                  </div>
                                </>
                              ) : (
                                <div className="text-sm text-gray-500">
                                  See availability for prices
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleHotelClick(hotel)}
                              className="bg-[#F7871D] hover:bg-[#e67915] text-white px-4 py-2.5 rounded font-medium text-sm transition-colors whitespace-nowrap flex items-center gap-1"
                            >
                              See availability
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center mt-8">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-4 py-2 text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute inset-y-0 left-0 w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)}>
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Same filter content as desktop */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Your budget (per night)</h3>
                <input
                  type="range"
                  min="0"
                  max={maxPrice}
                  value={filters.priceRange[1]}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    priceRange: [0, parseInt(e.target.value)]
                  }))}
                  className="w-full accent-orange-500"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>SAR 0</span>
                  <span>SAR {filters.priceRange[1].toLocaleString()}</span>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Hotel Stars</h3>
                <div className="flex flex-wrap gap-2">
                  {[5, 4, 3, 2, 1].map(star => (
                    <button
                      key={star}
                      onClick={() => {
                        if (filters.starRating.includes(star)) {
                          setFilters(prev => ({
                            ...prev,
                            starRating: prev.starRating.filter(s => s !== star)
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            starRating: [...prev.starRating, star]
                          }));
                        }
                      }}
                      className={`px-3 py-1.5 rounded border text-sm flex items-center gap-1 ${
                        filters.starRating.includes(star)
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      {star} <StarIconSolid className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium"
              >
                Show {filteredHotels.length} results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Map View */}
      {fullscreenMap && (
        <div className="fixed inset-0 z-50 bg-white">
          {/* Header */}
          <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setFullscreenMap(false)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <XMarkIcon className="h-5 w-5" />
                <span>Close map</span>
              </button>
              <div className="text-sm text-gray-600">
                {filteredHotels.length} properties
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                <option value="top_picks">Top picks</option>
                <option value="price_low">Price (lowest)</option>
                <option value="price_high">Price (highest)</option>
                <option value="rating">Best reviewed</option>
              </select>
            </div>
          </div>

          {/* Split View: Hotels List + Map */}
          <div className="flex h-[calc(100vh-57px)]">
            {/* Hotels List - Left Side */}
            <div className="w-80 lg:w-96 border-r overflow-y-auto bg-gray-50">
              {filteredHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  onClick={() => {
                    setSelectedHotel(hotel);
                    handleHotelClick(hotel);
                  }}
                  onMouseEnter={() => setSelectedHotel(hotel)}
                  className={`p-3 border-b bg-white hover:bg-blue-50 cursor-pointer transition-colors ${
                    selectedHotel?.id === hotel.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Hotel Image */}
                    <div className="w-24 h-20 flex-shrink-0">
                      {hotel.image ? (
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                          <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Hotel Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-blue-700 text-sm truncate">
                        {hotel.name}
                      </h4>
                      <div className="flex items-center gap-1 mt-0.5">
                        {renderStars((hotel as any).star_rating || Math.round(hotel.rating / 2))}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-blue-900 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                          {Math.min(hotel.rating, 10).toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600">
                          {getScoreText(hotel.rating)}
                        </span>
                      </div>
                      {hotel.price && hotel.price > 0 && (
                        <div className="mt-1.5">
                          <span className="font-bold text-gray-900">
                            US$ {Math.round(hotel.price / 3.75)}
                          </span>
                          <span className="text-xs text-gray-500 ml-1">per night</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Map - Right Side */}
            <div className="flex-1 relative">
              <MapContainer
                center={getCityCoordinates(searchQuery.destination)}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                {filteredHotels.map((hotel, index) => {
                  const coords = (hotel as any).coordinates;
                  // If no coordinates, generate stable fake ones based on hotel index
                  const cityCenter = getCityCoordinates(searchQuery.destination);
                  // Use index-based offset to create stable, spread-out positions
                  const angle = (index * 137.5) * (Math.PI / 180); // Golden angle for good distribution
                  const radius = 0.01 + (index % 10) * 0.003; // Varying radius
                  const lat = coords?.latitude || cityCenter[0] + Math.cos(angle) * radius;
                  const lng = coords?.longitude || cityCenter[1] + Math.sin(angle) * radius;

                  // Create custom price marker
                  const priceIcon = L.divIcon({
                    className: 'custom-price-marker',
                    html: `<div class="px-2 py-1 rounded-lg text-xs font-bold shadow-lg whitespace-nowrap ${
                      selectedHotel?.id === hotel.id
                        ? 'bg-blue-600 text-white scale-110'
                        : 'bg-white text-gray-900 border border-gray-300'
                    }" style="transform: translate(-50%, -50%);">
                      ${hotel.price && hotel.price > 0 ? `US$${Math.round(hotel.price / 3.75)}` : 'View'}
                    </div>`,
                    iconSize: [80, 30],
                    iconAnchor: [40, 15],
                  });

                  return (
                    <Marker
                      key={hotel.id}
                      position={[lat, lng]}
                      icon={priceIcon}
                      eventHandlers={{
                        click: () => {
                          setSelectedHotel(hotel);
                        },
                        mouseover: () => {
                          setSelectedHotel(hotel);
                        }
                      }}
                    >
                      <Popup>
                        <div className="w-48">
                          {hotel.image && (
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              className="w-full h-24 object-cover rounded-t"
                            />
                          )}
                          <div className="p-2">
                            <h4 className="font-bold text-sm text-blue-700">{hotel.name}</h4>
                            <div className="flex items-center gap-1 mt-1">
                              <span className="bg-blue-900 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                                {Math.min(hotel.rating, 10).toFixed(1)}
                              </span>
                              <span className="text-xs text-gray-600">{getScoreText(hotel.rating)}</span>
                            </div>
                            {hotel.price && hotel.price > 0 && (
                              <div className="mt-2 font-bold">
                                US$ {Math.round(hotel.price / 3.75)} <span className="text-xs font-normal text-gray-500">per night</span>
                              </div>
                            )}
                            <button
                              onClick={() => handleHotelClick(hotel)}
                              className="mt-2 w-full bg-blue-600 text-white text-xs py-1.5 rounded font-medium"
                            >
                              See availability
                            </button>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
