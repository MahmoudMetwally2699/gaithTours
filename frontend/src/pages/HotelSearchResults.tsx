import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FunnelIcon,
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
import "../components/DateRangePicker.css";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../types/hotel';
import { useDirection } from '../hooks/useDirection';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelector } from '../components/CurrencySelector';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

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
  mealPlan: string[];        // 'breakfast', 'half_board', 'full_board', 'all_inclusive'
  cancellationPolicy: string; // 'any', 'free_cancellation', 'non_refundable'
  guestRating: number;       // 0 = any, 7 = 7+, 8 = 8+, 9 = 9+
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
  const { t, i18n } = useTranslation();
  const { direction } = useDirection();
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isRTL = direction === 'rtl';
  const { currency, currencySymbol } = useCurrency();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const childrenParam = searchParams.get('children') || '';
  const initialChildrenAges = childrenParam ? childrenParam.split(',').map(Number).filter(n => !isNaN(n)) : [];

  const searchQuery = {
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: initialChildrenAges.length,
    childrenAges: initialChildrenAges
  };

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [totalPages, setTotalPages] = useState(0);
  const [totalHotels, setTotalHotels] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showMap, setShowMap] = useState(false);
  const [fullscreenMap, setFullscreenMap] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [editableDestination, setEditableDestination] = useState(searchQuery.destination);

  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 5000],
    starRating: [],
    propertyTypes: [],
    facilities: [],
    sortBy: 'top_picks',
    mealPlan: [],
    cancellationPolicy: 'any',
    guestRating: 0
  });

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({ hotels: [], regions: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    children: searchQuery.children,
    childrenAges: searchQuery.childrenAges
  });
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isTravelingForWork, setIsTravelingForWork] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);

  // Sync state with URL if it changes externally
  useEffect(() => {
    setCheckInDate(searchQuery.checkIn ? new Date(searchQuery.checkIn) : null);
    setCheckOutDate(searchQuery.checkOut ? new Date(searchQuery.checkOut) : null);
    setGuestCounts({
        rooms: searchQuery.rooms,
        adults: searchQuery.adults,
        children: searchQuery.children,
        childrenAges: searchQuery.childrenAges
    });
    setEditableDestination(searchQuery.destination);
    // Reset to page 1 when search parameters change
    setCurrentPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery.checkIn, searchQuery.checkOut, searchQuery.rooms, searchQuery.adults, searchQuery.children, searchQuery.destination]);

  const handleUpdateSearch = () => {
    const params = new URLSearchParams(location.search);
    params.set('destination', editableDestination);
    if (checkInDate) params.set('checkIn', checkInDate.toISOString().split('T')[0]);
    if (checkOutDate) params.set('checkOut', checkOutDate.toISOString().split('T')[0]);
    params.set('rooms', guestCounts.rooms.toString());
    params.set('adults', guestCounts.adults.toString());
    if (guestCounts.childrenAges && guestCounts.childrenAges.length > 0) {
      params.set('children', guestCounts.childrenAges.join(','));
    } else {
      params.set('children', '');
    }

    // Reset page to 1 on new search
    params.set('page', '1');

    history.push({
       pathname: location.pathname,
       search: params.toString()
    });
  };

  const hotelsPerPage = 20;

  // Helper function to navigate to a page
  const goToPage = (page: number) => {
    const params = new URLSearchParams(location.search);
    params.set('page', page.toString());
    history.push({
      pathname: location.pathname,
      search: params.toString()
    });
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Generate page numbers for pagination
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Max page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  // Calculate results range
  const resultsStart = (currentPage - 1) * hotelsPerPage + 1;
  const resultsEnd = Math.min(currentPage * hotelsPerPage, totalHotels);

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

        // Smart detection: If query contains Arabic characters, use 'ar' regardless of app language
        const isArabic = /[\u0600-\u06FF]/.test(editableDestination);
        const searchLanguage = isArabic ? 'ar' : i18n.language;

        const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(editableDestination)}&language=${searchLanguage}`);
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
      setIsBackgroundLoading(false); // Reset background loading

      try {
        // Pass dates and guest count from URL parameters
        // Use currentPage state for pagination
        const response = await searchHotels(
          searchQuery.destination,
          currentPage,
          hotelsPerPage,
          {
            checkin: searchQuery.checkIn || undefined,
            checkout: searchQuery.checkOut || undefined,
            adults: searchQuery.adults,
            children: searchQuery.children > 0 ? searchQuery.children : undefined,
            currency: currency,
             // If destination has Arabic chars, prefer Arabic for results, otherwise use app language or existing param
             // We prioritize the smart detection on the search query over the i18n language
             language: /[\u0600-\u06FF]/.test(searchQuery.destination) ? 'ar' : (i18n.language || 'en')
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
    // currentPage dependency restored for standard pagination
  }, [searchQuery.destination, searchQuery.checkIn, searchQuery.checkOut, searchQuery.adults, searchQuery.children, currency, i18n.language, currentPage]);

  // Background loading removed - using standard pagination instead

  // Calculate max price for budget filter
  const maxPrice = useMemo(() => {
    const prices = hotels.filter(h => h.price && h.price > 0).map(h => h.price);
    return Math.max(...prices, 5000);
  }, [hotels]);

  // Budget histogram
  const budgetHistogram = useMemo(() => {
    return generateBudgetHistogram(hotels, maxPrice);
  }, [hotels, maxPrice]);

  // Update price filter when max price changes to ensure all hotels are visible
  useEffect(() => {
    if (maxPrice > 0) {
      setFilters(prev => ({
        ...prev,
        priceRange: [0, maxPrice]
      }));
    }
  }, [maxPrice]);

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

    // Apply meal plan filter
    if (filters.mealPlan.length > 0) {
      filtered = filtered.filter(hotel => {
        const hotelData = hotel as any;
        const hotelMeal = (hotelData.meal || hotelData.mealType || '').toLowerCase();
        return filters.mealPlan.some(meal => {
          switch (meal) {
            case 'breakfast':
              return hotelMeal.includes('breakfast') || hotelData.breakfast_included;
            case 'half_board':
              return hotelMeal.includes('half') || hotelMeal === 'hb';
            case 'full_board':
              return hotelMeal.includes('full') || hotelMeal === 'fb';
            case 'all_inclusive':
              return hotelMeal.includes('all') || hotelMeal === 'ai';
            default:
              return false;
          }
        });
      });
    }

    // Apply cancellation policy filter
    if (filters.cancellationPolicy !== 'any') {
      filtered = filtered.filter(hotel => {
        const hotelData = hotel as any;
        if (filters.cancellationPolicy === 'free_cancellation') {
          return hotelData.free_cancellation ||
                 hotelData.freeCancellation ||
                 hotelData.cancellation_policy === 'free' ||
                 (hotelData.free_cancellation_before && new Date(hotelData.free_cancellation_before) > new Date());
        } else if (filters.cancellationPolicy === 'non_refundable') {
          return !hotelData.free_cancellation && !hotelData.freeCancellation;
        }
        return true;
      });
    }

    // Apply guest rating filter
    if (filters.guestRating > 0) {
      filtered = filtered.filter(hotel => {
        const hotelData = hotel as any;
        const guestScore = hotelData.review_score || hotelData.guestRating || hotel.rating || 0;
        return guestScore >= filters.guestRating;
      });
    }

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        <div className="relative z-10 flex flex-col px-3 sm:px-6 lg:px-16 py-2 sm:py-3 pb-4 sm:pb-6">

          {/* Top Bar: Logo & Auth */}
          <header className="flex flex-row justify-between items-center w-full mb-3 sm:mb-4 relative z-[60]">
             {/* Logo */}
             <a href="/" className="flex-shrink-0 z-10">
                <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-7 sm:h-10 md:h-12 w-auto drop-shadow-lg hover:scale-105 transition-transform" />
             </a>

             {/* Right Side: Auth & Settings */}
             <div className="flex items-center gap-2 sm:gap-3 rtl:space-x-reverse text-white">
                {/* Currency & Language - Desktop Only */}
                <div className="hidden md:flex items-center gap-3 bg-white/15 backdrop-blur-md rounded-full px-4 py-2 border border-white/30 shadow-sm">
                   <CurrencySelector variant="light" />
                   <div className="w-px h-4 bg-white/40"></div>
                   <div className="flex items-center gap-1 cursor-pointer hover:text-orange-100 transition-colors">
                      <span className="text-sm font-semibold">EN</span>
                      <ChevronDownIcon className="w-3.5 h-3.5" />
                   </div>
                </div>

                {!user ? (
                   <>
                      {/* Sign in - Hidden on mobile */}
                      <Link
                        to="/login"
                        className="hidden sm:inline-flex items-center text-sm font-semibold hover:text-orange-100 transition-colors px-3 py-1.5 rounded-full hover:bg-white/10"
                      >
                        Sign in
                      </Link>
                      {/* Register Button - Modern Style */}
                      <Link
                        to="/register"
                        className="inline-flex items-center bg-white text-[#E67915] text-xs sm:text-sm font-bold px-3 py-2 sm:px-5 sm:py-2.5 rounded-full hover:bg-orange-50 active:scale-95 transition-all shadow-lg hover:shadow-xl"
                      >
                        <span className="hidden sm:inline">Register</span>
                        <span className="sm:hidden">Join</span>
                      </Link>
                   </>
                ) : (
                   <div className="flex items-center gap-2 sm:gap-3 rtl:space-x-reverse text-white">
                      {/* User Profile - Modern Card Style */}
                      <Link
                        to="/profile"
                        className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/30 hover:bg-white/25 transition-all shadow-sm"
                      >
                        <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/30 flex items-center justify-center">
                          <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </div>
                        <span className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-[120px]">
                          {user.name}
                        </span>
                      </Link>
                      {/* Logout Button - Icon on mobile */}
                      <button
                        onClick={logout}
                        className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-white/10 transition-colors"
                        title="Logout"
                      >
                        <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden sm:inline text-sm font-medium">Logout</span>
                      </button>
                   </div>
                )}
             </div>
          </header>

          {/* Mobile Search Bar - Compact & Expandable (md and below) */}
          <div className="md:hidden">
            {!isSearchExpanded ? (
              /* Compact Search Summary */
              <div className="w-full max-w-5xl mx-auto">
                <div
                  onClick={() => setIsSearchExpanded(true)}
                  className="bg-white rounded-xl p-4 shadow-lg border-2 border-orange-500 cursor-pointer hover:shadow-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{editableDestination || 'Where to?'}</div>
                      <div className="text-sm text-gray-600">
                        {checkInDate && checkOutDate ? (
                          `${checkInDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${checkOutDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (${Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} night${Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)) > 1 ? 's' : ''}) • ${guestCounts.adults} adult${guestCounts.adults > 1 ? 's' : ''}`
                        ) : 'Add dates and guests'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Expanded Search Form */
              <div className="w-full max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl p-6 shadow-2xl border-2 border-orange-500 relative">
                  {/* Close button */}
                  <button
                    onClick={() => setIsSearchExpanded(false)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors z-10"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* Destination Input */}
                  <div className="mb-4" ref={autocompleteRef}>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Destination
                    </label>
                    <div className="relative">
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
                            setIsSearchExpanded(false);
                          }
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium placeholder-gray-400"
                        placeholder="Where are you going?"
                      />
                      <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />

                      {/* Autocomplete Dropdown */}
                      {showAutocomplete && autocompleteResults.hotels.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-64 overflow-y-auto">
                          <div className="p-2">
                            {autocompleteResults.hotels.slice(0, 5).map((hotel) => (
                              <button
                                key={hotel.id}
                                type="button"
                                onClick={() => {
                                  handleSelectSuggestion(hotel);
                                  setShowAutocomplete(false);
                                }}
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
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* Check-in */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check-in date
                      </label>
                      <DatePicker
                        selected={checkInDate}
                        onChange={(date: Date | null) => setCheckInDate(date)}
                        selectsStart
                        startDate={checkInDate}
                        endDate={checkOutDate}
                        minDate={new Date()}
                        dateFormat="EEE, MMM d, yyyy"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium cursor-pointer"
                        placeholderText="Select date"
                        monthsShown={2}
                      />
                    </div>

                    {/* Check-out */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Check-out date
                      </label>
                      <DatePicker
                        selected={checkOutDate}
                        onChange={(date: Date | null) => setCheckOutDate(date)}
                        selectsEnd
                        startDate={checkInDate}
                        endDate={checkOutDate}
                        minDate={checkInDate || new Date()}
                        dateFormat="EEE, MMM d, yyyy"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium cursor-pointer"
                        placeholderText="Select date"
                        monthsShown={2}
                      />
                    </div>
                  </div>

                  {/* Guests Row */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {/* Adults */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Adults
                      </label>
                      <select
                        value={guestCounts.adults}
                        onChange={(e) => setGuestCounts(prev => ({ ...prev, adults: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium cursor-pointer"
                      >
                        {[...Array(30)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>

                    {/* Children */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Children
                      </label>
                      <select
                        value={guestCounts.children}
                        onChange={(e) => {
                          const count = parseInt(e.target.value);
                          setGuestCounts(prev => ({
                            ...prev,
                            children: count,
                            childrenAges: count > 0 ? [...Array(count)].map(() => 5) : []
                          }));
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium cursor-pointer"
                      >
                        {[...Array(11)].map((_, i) => (
                          <option key={i} value={i}>{i}</option>
                        ))}
                      </select>
                    </div>

                    {/* Rooms */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rooms
                      </label>
                      <select
                        value={guestCounts.rooms}
                        onChange={(e) => setGuestCounts(prev => ({ ...prev, rooms: parseInt(e.target.value) }))}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:ring-0 text-gray-900 font-medium cursor-pointer"
                      >
                        {[...Array(10)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Traveling for work */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-semibold text-gray-700">
                        Are you traveling for work?
                      </label>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="travelingForWork"
                            checked={isTravelingForWork === true}
                            onChange={() => setIsTravelingForWork(true)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Yes</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="radio"
                            name="travelingForWork"
                            checked={isTravelingForWork === false}
                            onChange={() => setIsTravelingForWork(false)}
                            className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">No</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={() => {
                      handleUpdateSearch();
                      setIsSearchExpanded(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg"
                  >
                    Search
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Search Bar - Inline (md and above) */}
          <div className="hidden md:block w-full max-w-5xl mx-auto">
            <div className="bg-white/10 backdrop-blur-md rounded-full p-1.5 border border-white/20 flex items-center relative z-50 gap-1 shadow-lg">
              {/* Destination */}
              <div className="flex-[1.5] px-4 py-0 border-r border-white/20 flex items-center gap-3 relative z-50" ref={autocompleteRef}>
                <MapPinIcon className="h-5 w-5 text-white/90 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-white/70 text-[10px] uppercase tracking-wide font-bold mb-0.5">{t('common.destination', 'Destination')}</span>
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
                    className="bg-transparent border-none p-0 text-white text-sm font-bold placeholder-white/50 focus:ring-0 w-full truncate focus:outline-none"
                    placeholder="Where are you going?"
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
              <div className="flex-[2] px-4 py-0 border-r border-white/20 flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-white/90 shrink-0" />
                <div className="flex flex-col w-full">
                  <span className="text-white/70 text-[10px] uppercase tracking-wide font-bold mb-0.5">Check-in - Check-out</span>
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
                      placeholderText="Add dates"
                      monthsShown={2}
                      customInput={
                        <input
                          value={
                            checkInDate && checkOutDate
                              ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                              : (checkInDate ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - Select checkout` : '')
                          }
                          readOnly
                          placeholder="Add your dates"
                          className="bg-transparent border-none p-0 text-white text-sm font-bold w-full focus:ring-0 cursor-pointer placeholder-white/50 focus:outline-none"
                        />
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Guests */}
              <div className="flex-[1.5] relative">
                <button
                  className="w-full px-4 py-0 flex items-center gap-3 text-left"
                  onClick={() => setShowGuestPopover(!showGuestPopover)}
                >
                  <UserIcon className="h-5 w-5 text-white/90 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-white/70 text-[10px] uppercase tracking-wide font-bold mb-0.5">{t('common.guests', 'Guests')}</span>
                    <span className="text-white text-sm font-bold truncate">
                      {guestCounts.adults + guestCounts.children} Guests · {guestCounts.rooms} Room{guestCounts.rooms > 1 ? 's' : ''}
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
                      <div className="mb-6">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col">
                            <span className="font-bold text-sm text-gray-800">Children</span>
                            <span className="text-xs text-gray-500">Ages 0-17</span>
                          </div>
                          <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1">
                            <button
                              onClick={() => setGuestCounts(prev => ({
                                ...prev,
                                children: Math.max(0, prev.children - 1),
                                childrenAges: (prev.childrenAges || []).slice(0, -1)
                              }))}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600 disabled:opacity-50"
                              disabled={guestCounts.children <= 0}
                            >
                              <MinusIcon className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="w-4 text-center font-bold text-sm">{guestCounts.children}</span>
                            <button
                              onClick={() => setGuestCounts(prev => ({
                                ...prev,
                                children: Math.min(10, prev.children + 1),
                                childrenAges: [...(prev.childrenAges || []), 5]
                              }))}
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-white shadow-sm text-gray-600 hover:text-orange-600"
                            >
                              <PlusIcon className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>
                        </div>

                        {/* Child Age Selectors */}
                        {guestCounts.childrenAges && guestCounts.childrenAges.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs text-gray-500 mb-2">Select age at check-in:</p>
                            <div className={`grid ${guestCounts.childrenAges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                              {guestCounts.childrenAges.map((age, index) => (
                                <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                  <span className="text-xs text-gray-500 whitespace-nowrap">Child {index + 1}</span>
                                  <select
                                    value={age}
                                    onChange={(e) => {
                                      const newAges = [...guestCounts.childrenAges];
                                      newAges[index] = parseInt(e.target.value);
                                      setGuestCounts(prev => ({ ...prev, childrenAges: newAges }));
                                    }}
                                    className="flex-1 min-w-0 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                                  >
                                    {[...Array(18)].map((_, i) => (
                                      <option key={i} value={i}>
                                        {i} {i === 1 ? 'yr' : 'yrs'}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
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
                  className="w-12 h-12 bg-white text-[#E67915] rounded-full flex items-center justify-center hover:bg-orange-50 transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
                  title="Update Search"
                >
                  <MagnifyingGlassIcon className="w-6 h-6 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </div>

          {/* Travelling for work checkbox */}
          <div className="hidden sm:flex items-center space-x-2 mt-2">
            <input type="checkbox" id="business" className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-white/30" />
            <label htmlFor="business" className="text-white text-xs sm:text-sm">I'm travelling for work</label>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="bg-white border-b">
        <div className="px-3 sm:px-6 py-3 sm:py-4">
          {/* Mobile Action Buttons - Only show when search is compact on mobile */}
          {!isSearchExpanded && (
            <div className="md:hidden flex items-center justify-center gap-3 mb-4 max-w-md mx-auto">
              <button
                onClick={() => {/* Add sort logic */}}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
                <span className="text-sm font-medium text-gray-700">Sort</span>
              </button>

              <button
                onClick={() => setShowMobileFilters(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <FunnelIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Filter</span>
              </button>

              <button
                onClick={() => setFullscreenMap(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <MapIcon className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Map</span>
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                {searchQuery.destination}: {totalHotels} properties found
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600 hidden sm:inline">Sort by:</span>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                  className="border border-gray-300 rounded-md px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 flex-1 sm:flex-none"
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
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-6">
        <div className="flex gap-3 sm:gap-6">
          {/* Filters Sidebar - Always visible on desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-24">
              {/* Show on Map */}
              {/* Map Preview Card */}
              <div
                className="relative h-24 sm:h-32 w-full rounded-xl overflow-hidden mb-6 cursor-pointer group shadow-sm hover:shadow-md transition-shadow border border-gray-200"
                onClick={() => setFullscreenMap(true)}
              >
                {/* Static Map Background */}
                <div className="absolute inset-0 pointer-events-none">
                  <MapContainer
                    center={getCityCoordinates(searchQuery.destination)}
                    zoom={13}
                    zoomControl={false}
                    dragging={false}
                    scrollWheelZoom={false}
                    doubleClickZoom={false}
                    attributionControl={false}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={getCityCoordinates(searchQuery.destination)} />
                  </MapContainer>
                </div>

                {/* Overlay Button */}
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-colors pointer-events-none">
                    <MapIcon className="h-4 w-4" />
                    Show on map
                  </button>
                </div>
              </div>

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
                                    {currency} {hotel.price}
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
                  <span>{currencySymbol} 0</span>
                  <span>{currencySymbol} {filters.priceRange[1].toLocaleString()}</span>
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

              {/* Meal Plan Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Meal Plan</h3>
                <div className="space-y-2">
                  {[
                    { id: 'breakfast', label: 'Breakfast included' },
                    { id: 'half_board', label: 'Half board' },
                    { id: 'full_board', label: 'Full board' },
                    { id: 'all_inclusive', label: 'All inclusive' }
                  ].map(meal => (
                    <label key={meal.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.mealPlan.includes(meal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilters(prev => ({
                              ...prev,
                              mealPlan: [...prev.mealPlan, meal.id]
                            }));
                          } else {
                            setFilters(prev => ({
                              ...prev,
                              mealPlan: prev.mealPlan.filter(m => m !== meal.id)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{meal.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Cancellation Policy Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cancellation Policy</h3>
                <div className="space-y-2">
                  {[
                    { id: 'any', label: 'Any' },
                    { id: 'free_cancellation', label: 'Free cancellation' },
                    { id: 'non_refundable', label: 'Non-refundable' }
                  ].map(policy => (
                    <label key={policy.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cancellationPolicy"
                        checked={filters.cancellationPolicy === policy.id}
                        onChange={() => setFilters(prev => ({ ...prev, cancellationPolicy: policy.id }))}
                        className="border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{policy.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Guest Rating Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Guest Rating</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 0, label: 'Any' },
                    { value: 7, label: '7+' },
                    { value: 8, label: '8+' },
                    { value: 9, label: '9+' }
                  ].map(rating => (
                    <button
                      key={rating.value}
                      onClick={() => setFilters(prev => ({ ...prev, guestRating: rating.value }))}
                      className={`px-3 py-1.5 rounded border text-sm transition-colors ${
                        filters.guestRating === rating.value
                          ? 'bg-orange-500 border-orange-500 text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-orange-300'
                      }`}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setFilters({
                  priceRange: [0, maxPrice],
                  starRating: [],
                  propertyTypes: [],
                  facilities: [],
                  sortBy: 'top_picks',
                  mealPlan: [],
                  cancellationPolicy: 'any',
                  guestRating: 0
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
            className="lg:hidden fixed bottom-4 left-4 right-4 bg-orange-500 text-white py-3 rounded-lg font-semibold shadow-xl z-40 flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters ({filters.starRating.length + filters.facilities.length + (filters.guestRating > 0 ? 1 : 0)})
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
                      className={`rounded-lg overflow-hidden transition-all duration-300 relative ${
                        (hotel as any).isSearchedHotel
                          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-[2px] shadow-lg shadow-orange-200/50 ring-2 ring-orange-400/30'
                          : 'bg-white shadow-sm hover:shadow-md border border-gray-200'
                      }`}
                    >
                      {/* Searched Hotel Badge */}
                      {(hotel as any).isSearchedHotel && (
                        <div className="absolute -top-0 left-4 z-10">
                          <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] sm:text-xs font-bold px-2 py-1 rounded-b-lg shadow-md flex items-center gap-1">
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      <div className={(hotel as any).isSearchedHotel ? 'bg-white rounded-[6px]' : ''}>
                      <div className="flex flex-col sm:flex-row h-full">
                        {/* Hotel Image with Heart Icon */}
                        <div className="relative w-full sm:w-48 md:w-56 lg:w-64 flex-shrink-0">
                          {hotel.image ? (
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              loading="lazy"
                              className="w-full h-48 sm:h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-48 sm:h-full bg-gray-100 flex items-center justify-center">
                              <BuildingOfficeIcon className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                          {/* Heart Icon */}
                          <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors">
                            <svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>

                        {/* Content Container - Split into Info and Price columns for desktop */}
                        <div className="flex-1 flex flex-col sm:flex-row min-w-0">
                          {/* Left: Hotel Info */}
                          <div className="flex-1 p-4 flex flex-col gap-3">
                            <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <h3
                                            onClick={() => handleHotelClick(hotel)}
                                            className="text-base sm:text-lg font-bold text-[#003B95] hover:text-[#cd924a] cursor-pointer leading-tight transition-colors"
                                        >
                                            {hotel.name}
                                        </h3>
                                        <div className="flex">
                                            {renderStars((hotel as any).star_rating || Math.round(hotel.rating / 2))}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 text-xs">
                                        <span className="text-[#003B95] underline cursor-pointer" onClick={() => setFullscreenMap(true)}>
                                            {hotel.city || searchQuery.destination}
                                        </span>
                                        <span className="text-[#003B95] cursor-pointer" onClick={() => setFullscreenMap(true)}>
                                            Show on map
                                        </span>
                                        {hotel.address && (
                                            <span className="text-gray-600 hidden sm:inline">· {hotel.address}</span>
                                        )}
                                    </div>
                                  </div>
                                </div>
                            </div>

                            {/* Room Info */}
                            <div className="border-l-2 border-gray-200 pl-3 mt-1">
                                {(hotel as any).room_name && (
                                    <div className="font-bold text-xs sm:text-sm text-gray-900 mb-1">
                                        {(hotel as any).room_name}
                                    </div>
                                )}
                                {(hotel as any).bed_type && (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" className="w-4 h-4 text-gray-500" fill="currentColor">
                                            <path d="M32 32c17.7 0 32 14.3 32 32l0 224 224 0 0-128c0-17.7 14.3-32 32-32l160 0c53 0 96 43 96 96l0 224c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64-448 0 0 64c0 17.7-14.3 32-32 32S0 465.7 0 448L0 64C0 46.3 14.3 32 32 32zm80 160a64 64 0 1 1 128 0 64 64 0 1 1 -128 0z"/>
                                        </svg>
                                        <span>{(hotel as any).bed_type}</span>
                                    </div>
                                )}
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {(hotel as any).free_cancellation && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Free cancellation
                                    </div>
                                )}
                                {((hotel as any).meal_included || (hotel as any).meal === 'breakfast' || (hotel as any).breakfast_included) && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                        </svg>
                                        Breakfast included
                                    </div>
                                )}
                            </div>
                          </div>

                          {/* Right: Price & Action */}
                          <div className="p-4 flex flex-row sm:flex-col justify-between items-end sm:border-l border-t sm:border-t-0 border-gray-100 sm:w-48 lg:w-60 bg-gray-50/50 sm:bg-transparent">
                            {/* Reviews */}
                            <div className="flex items-center gap-2 mb-auto order-1 sm:order-none">
                                <div className="text-right hidden sm:block">
                                    <div className="text-sm font-medium text-gray-900 leading-tight">
                                        {getScoreText(hotel.rating)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {hotel.reviewCount?.toLocaleString()} reviews
                                    </div>
                                </div>
                                <div className="bg-[#003580] text-white p-1.5 rounded-t-lg rounded-br-lg text-sm font-bold min-w-[2rem] text-center" style={{ backgroundColor: '#F7871D' }}>
                                    {Math.min(hotel.rating, 10).toFixed(1)}
                                </div>
                            </div>

                            {/* Price Block */}
                            <div className="flex flex-col items-end gap-2 mt-4 order-2 sm:order-none w-full sm:w-auto">
                                <div className="text-xs text-gray-500">
                                    1 night, {searchQuery.adults} adults
                                </div>
                                {(hotel as any).noRatesAvailable ? (
                                    <div className="text-sm font-bold text-red-600">No rates data</div>
                                ) : (
                                    <>
                                        <div className="text-xl sm:text-2xl font-bold text-gray-900 leading-none">
                                            {currencySymbol} {Math.round(hotel.price).toLocaleString()}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-medium mb-1">
                                            Total (incl. taxes & fees): {currencySymbol}{Math.round(hotel.price + ((hotel as any).booking_taxes || 0)).toLocaleString()}
                                        </div>
                                    </>
                                )}

                                <button
                                    onClick={() => handleHotelClick(hotel)}
                                    className="w-full sm:w-auto bg-[#F7871D] hover:bg-[#c5650f] text-white px-4 py-2 rounded-md font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                                >
                                    See availability
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            </div>
                          </div>
                        </div>
                      </div>
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex flex-col items-center gap-4 mt-8 mb-8">
                    {/* Results Summary */}
                    <div className="text-sm text-gray-600">
                      Showing <span className="font-semibold text-gray-900">{resultsStart}-{resultsEnd}</span> of <span className="font-semibold text-gray-900">{totalHotels.toLocaleString()}</span> properties
                    </div>

                    {/* Page Navigation */}
                    <div className="flex items-center gap-1 flex-wrap justify-center">
                      {/* Previous Button */}
                      <button
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 hover:border-orange-300 transition-colors font-medium text-sm min-w-[80px]"
                      >
                        Previous
                      </button>

                      {/* Page Numbers */}
                      {generatePageNumbers().map((page, index) => (
                        page === '...' ? (
                          <span key={`ellipsis-${index}`} className="px-2 py-2 text-gray-400">
                            ...
                          </span>
                        ) : (
                          <button
                            key={page}
                            onClick={() => goToPage(page as number)}
                            className={`px-3 py-2 rounded-lg font-medium text-sm min-w-[40px] transition-colors ${
                              currentPage === page
                                ? 'bg-orange-500 text-white border-2 border-orange-500'
                                : 'bg-white border border-gray-300 hover:bg-orange-50 hover:border-orange-300'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      ))}

                      {/* Next Button */}
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 bg-white border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-50 hover:border-orange-300 transition-colors font-medium text-sm min-w-[80px]"
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
          <div className="absolute inset-y-0 left-0 right-0 sm:right-auto sm:w-80 bg-white shadow-xl overflow-y-auto">
            <div className="p-4 pb-24">
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white pb-3 border-b z-10">
                <h2 className="text-lg font-semibold">Filters</h2>
                <button onClick={() => setShowMobileFilters(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
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
                  <span>{currencySymbol} 0</span>
                  <span>{currencySymbol} {filters.priceRange[1].toLocaleString()}</span>
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

              <div className="fixed bottom-0 left-0 right-0 sm:relative p-4 bg-white border-t sm:border-t-0 shadow-lg sm:shadow-none">
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Show {filteredHotels.length} results
                </button>
              </div>
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
                            {currencySymbol} {Math.round(hotel.price)}
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
                      ${hotel.price && hotel.price > 0 ? `${currencySymbol}${Math.round(hotel.price)}` : 'View'}
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
                                {currencySymbol} {Math.round(hotel.price)} <span className="text-xs font-normal text-gray-500">per night</span>
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
