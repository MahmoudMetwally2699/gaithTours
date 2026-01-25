import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  PlusIcon,
  WifiIcon,
  SparklesIcon,
  UserGroupIcon,
  TruckIcon,
  CheckIcon,
  FireIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, BuildingOffice2Icon } from '@heroicons/react/24/solid';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBed, faBedPulse, faUtensils, faWifi, faPersonSwimming, faSquareParking, faDumbbell, faSpa, faSnowflake, faElevator, faBanSmoking, faPaw } from '@fortawesome/free-solid-svg-icons';
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
  country_code?: string;
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

// Helper function to get amenity icon
const getAmenityIcon = (amenity: string): { icon: React.ReactNode; label: string } | null => {
  const lower = amenity.toLowerCase();
  const iconClass = "w-4 h-4";

  if (lower.includes('wifi') || lower.includes('internet') || lower.includes('wi-fi')) {
    return { icon: <FontAwesomeIcon icon={faWifi} className={iconClass} />, label: amenity };
  }
  if (lower.includes('pool') || lower.includes('swimming')) {
    return { icon: <FontAwesomeIcon icon={faPersonSwimming} className={iconClass} />, label: amenity };
  }
  if (lower.includes('parking') || lower.includes('garage')) {
    return { icon: <FontAwesomeIcon icon={faSquareParking} className={iconClass} />, label: amenity };
  }
  if (lower.includes('gym') || lower.includes('fitness') || lower.includes('sport')) {
    return { icon: <FontAwesomeIcon icon={faDumbbell} className={iconClass} />, label: amenity };
  }
  if (lower.includes('spa') || lower.includes('wellness') || lower.includes('massage')) {
    return { icon: <FontAwesomeIcon icon={faSpa} className={iconClass} />, label: amenity };
  }
  if (lower.includes('restaurant') || lower.includes('dining')) {
    return { icon: <FontAwesomeIcon icon={faUtensils} className={iconClass} />, label: amenity };
  }
  if (lower.includes('air condition') || lower.includes('a/c') || lower.includes('ac') || lower.includes('climate')) {
    return { icon: <FontAwesomeIcon icon={faSnowflake} className={iconClass} />, label: amenity };
  }
  if (lower.includes('elevator') || lower.includes('lift')) {
    return { icon: <FontAwesomeIcon icon={faElevator} className={iconClass} />, label: amenity };
  }
  if (lower.includes('heating')) {
    return { icon: <FireIcon className={iconClass} />, label: amenity };
  }
  if (lower.includes('non-smoking') || lower.includes('smoke-free') || lower.includes('no smoking')) {
    return { icon: <FontAwesomeIcon icon={faBanSmoking} className={iconClass} />, label: amenity };
  }
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('animal')) {
    return { icon: <FontAwesomeIcon icon={faPaw} className={iconClass} />, label: amenity };
  }
  if (lower.includes('family')) {
    return { icon: <UserGroupIcon className={iconClass} />, label: amenity };
  }
  // Return null for amenities we don't have icons for
  return null;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalHotels, setTotalHotels] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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

  // Collapsible filter sections state - budget, stars, facilities open by default
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    budget: true,
    stars: true,
    facilities: false,
    mealPlan: false,
    cancellation: false,
    guestRating: false
  });

  const toggleFilterSection = (section: string) => {
    setExpandedFilters(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Performance optimization: skip animations when many hotels need to render
  const [skipAnimations, setSkipAnimations] = useState(false);
  const prevFilteredCountRef = useRef<number>(0);

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
  const [showMobileDateModal, setShowMobileDateModal] = useState(false);

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

  const hotelsPerPage = 50;



  // Calculate results range for infinite scroll
  const resultsEnd = hotels.length;
  const resultsStart = resultsEnd > 0 ? 1 : 0;

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
          const regions = Array.isArray(data.data.regions) ? data.data.regions : [];
          setAutocompleteResults({ hotels, regions });
          if (hotels.length > 0 || regions.length > 0) {
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

    const debounceTimer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounceTimer);
  }, [editableDestination, i18n.language]);

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
  // Search hotels with infinite scroll
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.destination) {
        setError('Please enter a destination');
        setLoading(false);
        return;
      }

      // If it's page 1 (new search), show main loader, otherwise show bottom loader
      if (currentPage === 1) {
        setLoading(true);
        setHotels([]); // Clear existing hotels on new search
        console.log('🔄 Initial load - page 1');
      } else {
        setLoadingMore(true);
        console.log('🔄 Loading more - page', currentPage, '- loadingMore:', true);
      }
      setError('');
      setIsBackgroundLoading(false);

      try {
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
            language: /[\u0600-\u06FF]/.test(searchQuery.destination) ? 'ar' : (i18n.language || 'en'),
            starRating: filters.starRating.length > 0 ? filters.starRating : undefined,
            facilities: filters.facilities.length > 0 ? filters.facilities : undefined,
            mealPlan: filters.mealPlan.length > 0 ? filters.mealPlan : undefined,
            cancellationPolicy: filters.cancellationPolicy !== 'any' ? filters.cancellationPolicy : undefined,
            guestRating: filters.guestRating > 0 ? filters.guestRating : undefined
          }
        );

        if (response?.hotels) {
          // Append new hotels to existing list (infinite scroll) with deduplication
          setHotels(prev => {
            if (currentPage === 1) {
              return response.hotels;
            }
            // Deduplicate: use hid or id as unique key
            const existingIds = new Set(prev.map(h => h.hid || h.id));
            const newHotels = response.hotels.filter(h => !existingIds.has(h.hid || h.id));
            return [...prev, ...newHotels];
          });
          setTotalPages(response.totalPages || 0);
          setTotalHotels(response.total || 0);
          setHasMore(currentPage < (response.totalPages || 0));
        } else {
          setHotels([]);
          setTotalPages(0);
          setTotalHotels(0);
          setHasMore(false);
        }
      } catch (err: any) {
        console.error('Hotel search error:', err);
        setError(err.message || 'Failed to search hotels');
        if (currentPage === 1) setHotels([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };

    performSearch();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery.destination, searchQuery.checkIn, searchQuery.checkOut, searchQuery.adults, searchQuery.children, currency, i18n.language, currentPage,
      filters.starRating.join(','), filters.facilities.join(','), filters.mealPlan.join(','), filters.cancellationPolicy, filters.guestRating]);

  // Build a filter signature for change detection
  const getFilterSignature = useCallback(() => {
    return `${filters.starRating.join(',')}_${filters.facilities.join(',')}_${filters.mealPlan.join(',')}_${filters.cancellationPolicy}_${filters.guestRating}`;
  }, [filters.starRating, filters.facilities, filters.mealPlan, filters.cancellationPolicy, filters.guestRating]);

  // Reset to page 1 when any server-side filter changes (triggers new server-side search)
  const prevFilterSignatureRef = useRef<string>('');
  useEffect(() => {
    const currentSignature = getFilterSignature();
    if (prevFilterSignatureRef.current !== '' && prevFilterSignatureRef.current !== currentSignature) {
      // Filter changed - reset to page 1 and clear hotels
      setCurrentPage(1);
      setHotels([]);
      console.log('🔍 Filter changed, resetting search');
    }
    prevFilterSignatureRef.current = currentSignature;
  }, [getFilterSignature]);

  // Infinite Scroll: Detect when user scrolls near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current || loading || loadingMore || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          console.log('🔄 Loading more hotels... (page', currentPage + 1, ')');
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0, rootMargin: '600px' } // OPTIMIZED: Reduced from 1500px for less aggressive pre-loading
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [loading, loadingMore, hasMore, currentPage]);

  // Reset to page 1 when search params change
  useEffect(() => {
    setCurrentPage(1);
    setHotels([]);
  }, [searchQuery.destination, searchQuery.checkIn, searchQuery.checkOut, searchQuery.adults, searchQuery.children]);

  // Calculate max price for budget filter
  const maxPrice = useMemo(() => {
    const prices = hotels.filter(h => h.price && h.price > 0).map(h => h.price);
    return Math.max(...prices, 5000);
  }, [hotels]);

  // Budget histogram - OPTIMIZED: Only calculate when budget filter is expanded
  const budgetHistogram = useMemo(() => {
    if (!expandedFilters.budget || hotels.length === 0) return [];
    return generateBudgetHistogram(hotels, maxPrice);
  }, [hotels, maxPrice, expandedFilters.budget]);

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
  // NOTE: Most filters (star rating, facilities, meal plan, cancellation, guest rating)
  // are now handled server-side. Only price range filter is applied client-side.
  const filteredHotels = useMemo(() => {
    // Deduplicate hotels first (by hid or id)
    const seenIds = new Set<string | number>();
    let filtered = hotels.filter(hotel => {
      const uniqueId = hotel.hid || hotel.id;
      if (seenIds.has(uniqueId)) {
        return false; // Duplicate, skip
      }
      seenIds.add(uniqueId);
      return true;
    });

    // Apply price range filter (client-side only - not sent to server)
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
          return 0; // Preserve backend order for top picks to avoid layout shifts/popping
      }
    });

    return filtered;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels, filters]);

  // Check if any filters are active (for UI decisions like showing skeletons)
  const hasActiveFilters = useMemo(() => {
    return filters.starRating.length > 0 ||
           filters.facilities.length > 0 ||
           filters.guestRating > 0 ||
           filters.mealPlan.length > 0 ||
           filters.cancellationPolicy !== 'any';
  }, [filters.starRating, filters.facilities, filters.guestRating, filters.mealPlan, filters.cancellationPolicy]);

  // Performance optimization: skip animations when filter change causes many hotels to appear at once
  useEffect(() => {
    const currentCount = filteredHotels.length;
    const prevCount = prevFilteredCountRef.current;

    // If going from few hotels to many (filter removed), skip animations
    if (currentCount > 30 && currentCount > prevCount * 2) {
      setSkipAnimations(true);
      // Re-enable animations after a short delay
      const timer = setTimeout(() => setSkipAnimations(false), 500);
      return () => clearTimeout(timer);
    }

    prevFilteredCountRef.current = currentCount;
  }, [filteredHotels.length]);

  // Optimized star rating toggle handler
  const handleStarRatingToggle = useCallback((star: number) => {
    setFilters(prev => {
      const newStarRating = prev.starRating.includes(star)
        ? prev.starRating.filter(s => s !== star)
        : [...prev.starRating, star];

      return {
        ...prev,
        starRating: newStarRating
      };
    });
  }, []);

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
        <div className="relative z-10 flex flex-col px-3 sm:px-6 lg:px-16 py-3 pb-6">

          {/* Top Bar: Logo & Auth */}
          <header className="flex flex-row justify-between items-center w-full mb-4 relative z-[60]">
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
                   <div
                     onClick={toggleLanguage}
                     className="flex items-center gap-1 cursor-pointer hover:text-orange-100 transition-colors"
                   >
                      <span className="text-sm font-semibold">{i18n.language.toUpperCase()}</span>
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
            {/* Mobile Currency & Language Row - Added for visibility */}
            <div className="flex items-center justify-end gap-3 mb-3 px-1">
               <div className="bg-white/10 backdrop-blur-sm rounded-full px-3 py-1 border border-white/20 flex items-center gap-2">
                 <CurrencySelector variant="light" />
                 <div className="w-px h-3 bg-white/30"></div>
                 <button
                   onClick={toggleLanguage}
                   className="flex items-center gap-1 text-white hover:text-orange-100 transition-colors"
                 >
                    <GlobeAltIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{i18n.language.toUpperCase()}</span>
                 </button>
               </div>
            </div>
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
                          if (hasUserTyped.current && editableDestination.length >= 2 && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0)) {
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
                      {showAutocomplete && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-64 overflow-y-auto">
                          <div className="p-2">
                            {/* Regions Section */}
                            {autocompleteResults.regions.length > 0 && (
                              <>
                                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 rounded-md mb-1">
                                  Cities & Regions
                                </div>
                                {autocompleteResults.regions.map((region) => (
                                  <button
                                    key={region.id}
                                    type="button"
                                    onClick={() => {
                                      handleSelectSuggestion(region);
                                      setShowAutocomplete(false);
                                    }}
                                    className="w-full flex items-center space-x-3 px-3 py-2.5 hover:bg-orange-50 rounded-lg transition text-left group"
                                  >
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                                      <MapPinIcon className="w-4 h-4 text-orange-600 group-hover:text-orange-700 transition-colors" />
                                    </div>
                                    <div>
                                      <p className="text-gray-900 font-semibold text-sm group-hover:text-orange-700 transition-colors">{region.name}</p>
                                      <p className="text-[10px] text-gray-500">{region.country_code || 'Region'}</p>
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}

                            {/* Hotels Section */}
                            {autocompleteResults.hotels.length > 0 && (
                              <>
                                {autocompleteResults.regions.length > 0 && <div className="my-2 border-t border-gray-100" />}
                                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50/50 rounded-md mb-1">
                                  Hotels
                                </div>
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
                                    <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                                      <BuildingOffice2Icon className="w-4 h-4 text-blue-500 group-hover:text-orange-500 transition-colors" />
                                    </div>
                                    <div>
                                      <p className="text-gray-900 font-semibold text-sm group-hover:text-orange-700 transition-colors">{hotel.name}</p>
                                      <p className="text-[10px] text-gray-500">Hotel</p>
                                    </div>
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dates Row - Click to open modal */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div onClick={() => setShowMobileDateModal(true)}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check-in date</label>
                      <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-medium bg-gray-50 flex items-center">
                         {checkInDate ? checkInDate.toLocaleDateString() : 'Select date'}
                      </div>
                    </div>
                    <div onClick={() => setShowMobileDateModal(true)}>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Check-out date</label>
                      <div className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-gray-900 font-medium bg-gray-50 flex items-center">
                         {checkOutDate ? checkOutDate.toLocaleDateString() : 'Select date'}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Date Selection Modal - Moved to root */}

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
                            className="w-4 h-4 text-[#E67915] border-gray-300 focus:ring-orange-500"
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
                    className="w-full bg-[#E67915] hover:bg-orange-600 text-white font-bold py-4 px-6 rounded-lg transition-colors text-lg shadow-lg"
                  >
                    Search
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Search Bar - Inline (md and above) */}
          <div className="hidden md:block w-full max-w-5xl mx-auto">
            <div className="bg-white rounded-full p-2 shadow-xl flex items-center relative z-50 gap-0 border border-gray-100">
              {/* Destination */}
              <div className="flex-[1.5] px-6 py-2 border-r border-gray-100 flex items-center gap-4 relative z-50 hover:bg-gray-50 rounded-full transition-colors cursor-pointer" ref={autocompleteRef}>
                <MapPinIcon className="h-6 w-6 text-gray-400 shrink-0" />
                <div className="flex flex-col w-full min-w-0">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-0.5">{t('common.destination', 'Destination')}</span>
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
                    className="bg-transparent border-none p-0 text-gray-600 text-sm font-medium placeholder-gray-400 focus:ring-0 w-full truncate focus:outline-none"
                    placeholder="Where are you going?"
                  />
                </div>

                {/* Autocomplete Dropdown */}
                {showAutocomplete && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0) && (
                  <div className="absolute top-full left-0 right-0 mt-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-80 overflow-y-auto animate-fadeIn ring-1 ring-black ring-opacity-5">
                    <div className="p-2">
                      {/* Regions Section */}
                      {autocompleteResults.regions.length > 0 && (
                        <>
                          <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Cities & Regions
                          </div>
                          {autocompleteResults.regions.map((region) => (
                            <button
                              key={region.id}
                              type="button"
                              onClick={() => {
                                handleSelectSuggestion(region);
                                setShowAutocomplete(false);
                              }}
                              className="w-full flex items-center space-x-4 px-4 py-3 hover:bg-orange-50 rounded-xl transition-all text-left group"
                            >
                              <div className="w-10 h-10 rounded-full bg-orange-100/50 flex items-center justify-center shrink-0 group-hover:bg-orange-100 transition-colors">
                                <MapPinIcon className="w-5 h-5 text-orange-500 group-hover:text-orange-600 transition-colors" />
                              </div>
                              <div>
                                <p className="text-gray-900 font-bold text-sm group-hover:text-orange-700 transition-colors">{region.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{region.country_code || 'Region'}</p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Hotels Section */}
                      {autocompleteResults.hotels.length > 0 && (
                        <>
                          {autocompleteResults.regions.length > 0 && <div className="my-2 border-t border-gray-100" />}
                          <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                            Hotels
                          </div>
                          {autocompleteResults.hotels.slice(0, 5).map((hotel) => (
                            <button
                              key={hotel.id}
                              type="button"
                              onClick={() => {
                                handleSelectSuggestion(hotel);
                                setShowAutocomplete(false);
                              }}
                              className="w-full flex items-center space-x-4 px-4 py-3 hover:bg-blue-50 rounded-xl transition-all text-left group"
                            >
                              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                                <BuildingOffice2Icon className="w-5 h-5 text-blue-500 group-hover:text-blue-600 transition-colors" />
                              </div>
                              <div>
                                <p className="text-gray-900 font-bold text-sm group-hover:text-blue-700 transition-colors">{hotel.name}</p>
                                <p className="text-xs text-gray-500 mt-0.5">Hotel</p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Dates - Unified Range */}
              <div className="flex-[2] px-6 py-2 border-r border-gray-100 flex items-center gap-4 hover:bg-gray-50 rounded-full transition-colors cursor-pointer">
                <ClockIcon className="h-6 w-6 text-gray-400 shrink-0" />
                <div className="flex flex-col w-full pointer-events-none"> {/* Disable pointer events to let datepicker handle clicks properly via custom input */}
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-0.5">Check-in - Check-out</span>
                  <div className="w-full pointer-events-auto">
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
                      className="bg-transparent border-none p-0 text-gray-600 text-sm font-medium w-full focus:ring-0 cursor-pointer placeholder-gray-400"
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
                          placeholder="Add dates"
                          className="bg-transparent border-none p-0 text-gray-600 text-sm font-medium w-full focus:ring-0 cursor-pointer placeholder-gray-400 focus:outline-none"
                        />
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Guests */}
              <div className="flex-[1.5] relative">
                <button
                  className="w-full px-6 py-2 flex items-center gap-4 text-left hover:bg-gray-50 rounded-full transition-colors"
                  onClick={() => setShowGuestPopover(!showGuestPopover)}
                >
                  <UserIcon className="h-6 w-6 text-gray-400 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-0.5">{t('common.guests', 'Guests')}</span>
                    <span className="text-gray-600 text-sm font-medium truncate">
                      {guestCounts.adults + guestCounts.children} Guests · {guestCounts.rooms} Room{guestCounts.rooms > 1 ? 's' : ''}
                    </span>
                  </div>
                </button>

                {/* Guest Popover */}
                {showGuestPopover && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowGuestPopover(false)}></div>
                    <div className="absolute top-full right-0 mt-4 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 z-50 text-gray-800 animate-fadeIn cursor-default ring-1 ring-black ring-opacity-5">
                      {/* Rooms */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">Rooms</span>
                          <span className="text-xs text-gray-500 mt-0.5">Number of rooms</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.max(1, prev.rooms - 1)}))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors"
                            disabled={guestCounts.rooms <= 1}
                          >
                            <MinusIcon className="w-4 h-4 stroke-2" />
                          </button>
                          <span className="w-6 text-center font-bold text-gray-900">{guestCounts.rooms}</span>
                          <button
                            onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.min(10, prev.rooms + 1)}))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
                          >
                            <PlusIcon className="w-4 h-4 stroke-2" />
                          </button>
                        </div>
                      </div>

                      {/* Adults */}
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">Adults</span>
                          <span className="text-xs text-gray-500 mt-0.5">Ages 18 or above</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setGuestCounts(prev => ({...prev, adults: Math.max(1, prev.adults - 1)}))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors"
                            disabled={guestCounts.adults <= 1}
                          >
                            <MinusIcon className="w-4 h-4 stroke-2" />
                          </button>
                          <span className="w-6 text-center font-bold text-gray-900">{guestCounts.adults}</span>
                          <button
                            onClick={() => setGuestCounts(prev => ({...prev, adults: Math.min(30, prev.adults + 1)}))}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
                          >
                            <PlusIcon className="w-4 h-4 stroke-2" />
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="mb-6">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900">Children</span>
                            <span className="text-xs text-gray-500 mt-0.5">Ages 0-17</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setGuestCounts(prev => ({
                                ...prev,
                                children: Math.max(0, prev.children - 1),
                                childrenAges: (prev.childrenAges || []).slice(0, -1)
                              }))}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 disabled:opacity-30 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-colors"
                              disabled={guestCounts.children <= 0}
                            >
                              <MinusIcon className="w-4 h-4 stroke-2" />
                            </button>
                            <span className="w-6 text-center font-bold text-gray-900">{guestCounts.children}</span>
                            <button
                              onClick={() => setGuestCounts(prev => ({
                                ...prev,
                                children: Math.min(10, prev.children + 1),
                                childrenAges: [...(prev.childrenAges || []), 5]
                              }))}
                              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:border-orange-500 hover:text-orange-500 transition-colors"
                            >
                              <PlusIcon className="w-4 h-4 stroke-2" />
                            </button>
                          </div>
                        </div>

                        {/* Child Age Selectors */}
                        {guestCounts.childrenAges && guestCounts.childrenAges.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100 animate-fadeIn">
                            <p className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Age at check-in</p>
                            <div className={`grid ${guestCounts.childrenAges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                              {guestCounts.childrenAges.map((age, index) => (
                                <div key={index} className="flex flex-col gap-1">
                                  <span className="text-xs text-gray-500">Child {index + 1}</span>
                                  <select
                                    value={age}
                                    onChange={(e) => {
                                      const newAges = [...guestCounts.childrenAges];
                                      newAges[index] = parseInt(e.target.value);
                                      setGuestCounts(prev => ({ ...prev, childrenAges: newAges }));
                                    }}
                                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent cursor-pointer transition-shadow"
                                  >
                                    {[...Array(18)].map((_, i) => (
                                      <option key={i} value={i}>
                                        {i} {i === 1 ? 'year' : 'years'}
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
                        className="w-full bg-[#E67915] text-white text-sm font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors shadow-lg hover:shadow-orange-500/30"
                        onClick={() => setShowGuestPopover(false)}
                      >
                        Apply
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Search Button */}
              <div className="p-1.5 pl-0">
                <button
                  onClick={handleUpdateSearch}
                  className="w-14 h-14 bg-[#E67915] text-white rounded-full flex items-center justify-center hover:bg-orange-600 transition-all shadow-lg hover:shadow-orange-500/40 hover:scale-105 active:scale-95"
                  title="Search"
                >
                  <MagnifyingGlassIcon className="w-6 h-6 stroke-[3]" />
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
                {searchQuery.destination}: {totalHotels.toLocaleString()} properties found
                {hotels.length > 0 && (
                  <span className="ml-2 text-xs sm:text-sm font-normal text-gray-600">
                    (Showing {filteredHotels.length} of {hotels.length} loaded)
                  </span>
                )}
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
              <div className="mb-4 border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleFilterSection('budget')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Your budget (per night)</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.budget ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.budget && (
                  <>
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
                  </>
                )}
              </div>

              {/* Star Rating */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleFilterSection('stars')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Hotel Stars {filters.starRating.length > 0 && <span className="text-orange-500 ml-1">({filters.starRating.length})</span>}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.stars ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.stars && (
                  <div className="flex flex-wrap gap-2">
                    {[5, 4, 3, 2, 1].map(star => (
                      <button
                        key={star}
                        onClick={() => handleStarRatingToggle(star)}
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
                )}
              </div>

              {/* Facilities */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleFilterSection('facilities')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Facilities {filters.facilities.length > 0 && <span className="text-orange-500 ml-1">({filters.facilities.length})</span>}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.facilities ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.facilities && (
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
                )}
              </div>

              {/* Meal Plan Filter */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleFilterSection('mealPlan')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Meal Plan {filters.mealPlan.length > 0 && <span className="text-orange-500 ml-1">({filters.mealPlan.length})</span>}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.mealPlan ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.mealPlan && (
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
                )}
              </div>

              {/* Cancellation Policy Filter */}
              <div className="mb-4 border-b border-gray-200 pb-4">
                <button
                  onClick={() => toggleFilterSection('cancellation')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Cancellation Policy {filters.cancellationPolicy !== 'any' && <span className="text-orange-500 ml-1">(1)</span>}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.cancellation ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.cancellation && (
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
                )}
              </div>

              {/* Guest Rating Filter */}
              <div className="mb-4">
                <button
                  onClick={() => toggleFilterSection('guestRating')}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-900 mb-2 hover:text-orange-600 transition-colors"
                >
                  <span>Guest Rating {filters.guestRating > 0 && <span className="text-orange-500 ml-1">({filters.guestRating}+)</span>}</span>
                  <svg className={`w-4 h-4 transition-transform ${expandedFilters.guestRating ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {expandedFilters.guestRating && (
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
                )}
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
          {/* Mobile Filter Button */}
          {!showMobileDateModal && (
          <button
            onClick={() => setShowMobileFilters(true)}
            className="lg:hidden fixed bottom-4 left-4 right-4 bg-orange-500 text-white py-3 rounded-lg font-semibold shadow-xl z-40 flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-95 transition-all"
          >
            <FunnelIcon className="h-5 w-5" />
            Filters ({filters.starRating.length + filters.facilities.length + (filters.guestRating > 0 ? 1 : 0)})
          </button>
          )}

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
              <div className="space-y-4" key={`hotels-${filters.starRating.join('-')}-${filters.facilities.join('-')}-${filters.guestRating}`}>
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
                      initial={skipAnimations ? false : { opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={skipAnimations ? { duration: 0 } : { duration: 0.3, delay: Math.min(index, 10) * 0.03 }}
                      className={`rounded-lg transition-all duration-300 relative ${
                        (hotel as any).isSearchedHotel
                          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 p-[2px] shadow-lg shadow-orange-200/50 ring-2 ring-orange-400/30'
                          : 'bg-white shadow-sm hover:shadow-md border border-gray-200'
                      }`}
                    >
                      <div className={(hotel as any).isSearchedHotel ? 'bg-white rounded-[6px]' : ''}>
                      <div className="flex flex-col sm:flex-row h-full">
                        {/* Hotel Image with Heart Icon */}
                        <div className="relative w-full sm:w-48 md:w-56 lg:w-64 flex-shrink-0">
                          {hotel.image ? (
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              loading="lazy"
                              className="w-full h-48 sm:h-full object-cover rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none"
                            />
                          ) : (
                            <div className="w-full h-48 sm:h-full bg-gray-100 flex items-center justify-center rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none">
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
                                {/* Bed type from amenities_data or room_name */}
                                {(() => {
                                  const amenities = (hotel as any).amenities_data || [];
                                  const roomName = ((hotel as any).room_name || '').toLowerCase();

                                  // Check for bed types in amenities_data
                                  const bedTypes: { type: string; label: string; icon: 'king' | 'queen' | 'twin' | 'single' | 'double' }[] = [];

                                  if (amenities.includes('king-bed') || roomName.includes('king')) {
                                    bedTypes.push({ type: 'king', label: 'King bed', icon: 'king' });
                                  }
                                  if (amenities.includes('queen-bed') || roomName.includes('queen')) {
                                    bedTypes.push({ type: 'queen', label: 'Queen bed', icon: 'queen' });
                                  }
                                  if (amenities.includes('twin-bed') || roomName.includes('twin')) {
                                    bedTypes.push({ type: 'twin', label: 'Twin beds', icon: 'twin' });
                                  }
                                  if (amenities.includes('single-bed') || roomName.includes('single')) {
                                    bedTypes.push({ type: 'single', label: 'Single bed', icon: 'single' });
                                  }
                                  if (amenities.includes('double-bed') || roomName.includes('double')) {
                                    bedTypes.push({ type: 'double', label: 'Double bed', icon: 'double' });
                                  }

                                  if (bedTypes.length === 0) return null;

                                  return (
                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                      <div className="flex gap-0.5">
                                        {bedTypes.some(b => b.type === 'twin' || b.label.toLowerCase().includes('twin')) ? (
                                          <>
                                            <FontAwesomeIcon icon={faBed} className="w-4 h-4 text-gray-500" />
                                            <FontAwesomeIcon icon={faBed} className="w-4 h-4 text-gray-500" />
                                          </>
                                        ) : (
                                          <FontAwesomeIcon icon={faBed} className="w-4 h-4 text-gray-500" />
                                        )}
                                      </div>
                                      <span>{bedTypes.map(b => b.label).join(' · ')}</span>
                                    </div>
                                  );
                                })()}
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mt-auto">
                                {(hotel as any).free_cancellation && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Free cancellation
                                    </div>
                                )}
                                {/* Meal type badge - ETG meal values: 'breakfast', 'halfboard', 'fullboard', 'allinclusive' */}
                                {(hotel as any).meal && (hotel as any).meal !== 'nomeal' && (
                                    <div className="flex items-center gap-1 text-xs font-bold text-green-700">
                                        <FontAwesomeIcon icon={faUtensils} className="w-3 h-3" />
                                        {(hotel as any).meal === 'breakfast' && 'Breakfast included'}
                                        {(hotel as any).meal === 'halfboard' && 'Half board'}
                                        {(hotel as any).meal === 'fullboard' && 'Full board'}
                                        {(hotel as any).meal === 'allinclusive' && 'All inclusive'}
                                    </div>
                                )}
                            </div>

                            {/* Amenities Icons with Tooltips */}
                            {(hotel as any).amenities && (hotel as any).amenities.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1 mt-2">
                                  {((hotel as any).amenities as string[])
                                    .map((amenity: string) => getAmenityIcon(amenity))
                                    .filter((result): result is { icon: React.ReactNode; label: string } => result !== null)
                                    .slice(0, 5)
                                    .map((amenityData, idx) => (
                                      <div
                                        key={idx}
                                        className="group relative p-1.5 bg-gray-100 rounded-md text-gray-600 hover:bg-orange-100 hover:text-orange-600 transition-colors cursor-default"
                                        title={amenityData.label}
                                      >
                                        {amenityData.icon}
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                          {amenityData.label}
                                        </div>
                                      </div>
                                    ))}
                                  {((hotel as any).amenities as string[])
                                    .map((amenity: string) => getAmenityIcon(amenity))
                                    .filter((result): result is { icon: React.ReactNode; label: string } => result !== null)
                                    .length > 5 && (
                                      <div className="group relative ml-1 cursor-pointer">
                                          <span className="text-xs text-gray-500 font-medium hover:text-orange-600 transition-colors">
                                            +{((hotel as any).amenities as string[])
                                              .map((amenity: string) => getAmenityIcon(amenity))
                                              .filter((result): result is { icon: React.ReactNode; label: string } => result !== null)
                                              .length - 5} more
                                          </span>
                                          {/* Detailed Tooltip for extra amenities - Displayed ABOVE the text */}
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-auto">
                                            {/* Invisible bridge to prevent closing when moving to tooltip */}
                                            <div className="absolute top-full left-0 w-full h-2 bg-transparent"></div>

                                            {/* Arrow properly positioned at bottom of tooltip */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>

                                            <div className="font-semibold mb-1 border-b border-gray-600 pb-1">More amenities:</div>
                                            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                              {((hotel as any).amenities as string[])
                                                .map((amenity: string) => getAmenityIcon(amenity))
                                                .filter((result): result is { icon: React.ReactNode; label: string } => result !== null)
                                                .slice(5)
                                                .map((extra, i) => (
                                                  <div key={i} className="truncate flex items-center gap-1">
                                                    <span className="shrink-0">•</span>
                                                    <span>{extra.label}</span>
                                                  </div>
                                                ))}
                                            </div>
                                          </div>
                                      </div>
                                    )}
                                </div>
                            )}
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
                                    {(() => {
                                        const checkIn = new Date(searchQuery.checkIn);
                                        const checkOut = new Date(searchQuery.checkOut);
                                        const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        return `${diffDays} night${diffDays !== 1 ? 's' : ''}, ${searchQuery.adults} adults`;
                                    })()}
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

                {/* Infinite Scroll Loading Indicator */}
                <div ref={loadMoreRef} className="py-4 relative" style={{ minHeight: '100px' }}>
                  {/* Only show skeletons if no filters are active - otherwise we're just filtering loaded hotels */}
                  {hasMore && hotels.length > 0 && !hasActiveFilters && (
                    <div className="space-y-4 relative">
                      {/* Skeleton hotel cards - always show when more content available */}
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden flex flex-col sm:flex-row min-h-[220px] animate-pulse">
                          {/* Image Skeleton */}
                          <div className="w-full sm:w-48 md:w-56 lg:w-64 h-48 sm:h-auto bg-gray-200 flex-shrink-0" />

                          <div className="flex-1 flex flex-col sm:flex-row min-w-0">
                             {/* Left: Info */}
                             <div className="flex-1 p-4 flex flex-col gap-3">
                                <div className="h-6 bg-gray-200 rounded w-3/4" />
                                <div className="flex gap-2">
                                    <div className="h-4 bg-gray-200 rounded w-20" />
                                    <div className="h-4 bg-gray-200 rounded w-32" />
                                </div>
                                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2" />
                                <div className="flex gap-2 mt-auto">
                                    <div className="h-5 bg-gray-200 rounded w-20" />
                                    <div className="h-5 bg-gray-200 rounded w-24" />
                                </div>
                             </div>

                             {/* Right: Price */}
                             <div className="p-4 sm:w-48 lg:w-60 flex flex-row sm:flex-col justify-between sm:border-l border-gray-100">
                                <div className="flex justify-end w-full">
                                    <div className="h-10 w-10 bg-gray-200 rounded-lg" />
                                </div>
                                <div className="flex flex-col items-end gap-2 w-full mt-auto">
                                    <div className="h-4 bg-gray-200 rounded w-20" />
                                    <div className="h-8 bg-gray-200 rounded w-32" />
                                    <div className="h-10 bg-gray-200 rounded w-full mt-1" />
                                </div>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Show message when filters are active and there are more hotels but filtered results are complete */}
                  {hasMore && hotels.length > 0 && hasActiveFilters && filteredHotels.length < hotels.length && (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-600 font-medium">
                        Showing {filteredHotels.length} filtered results from {hotels.length} loaded hotels
                      </p>
                      <button
                        onClick={() => setFilters(prev => ({
                          ...prev,
                          starRating: [],
                          facilities: [],
                          guestRating: 0,
                          mealPlan: [],
                          cancellationPolicy: 'any'
                        }))}
                        className="text-orange-500 hover:text-orange-600 text-sm mt-2 underline"
                      >
                        Clear filters to see all hotels
                      </button>
                    </div>
                  )}
                  {!hasMore && hotels.length > 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-600 font-medium">
                        ✓ All {totalHotels.toLocaleString()} properties loaded
                      </p>
                      <p className="text-xs text-gray-500 mt-1">You've reached the end of the results</p>
                    </div>
                  )}
                </div>
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
                      onClick={() => handleStarRatingToggle(star)}
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

              {/* Facilities */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 block">Facilities</h3>
                <div className="space-y-3">
                    {facilityOptions.slice(0, 6).map(facility => (
                      <label key={facility.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.facilities.includes(facility.id)}
                          onChange={(e) => {
                             if (e.target.checked) {
                               setFilters(prev => ({ ...prev, facilities: [...prev.facilities, facility.id] }));
                             } else {
                               setFilters(prev => ({ ...prev, facilities: prev.facilities.filter(f => f !== facility.id) }));
                             }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{facility.label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Meal Plan */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 block">Meal Plan</h3>
                <div className="space-y-3">
                    {[
                      { id: 'breakfast', label: 'Breakfast included' },
                      { id: 'half_board', label: 'Half board' },
                      { id: 'full_board', label: 'Full board' },
                      { id: 'all_inclusive', label: 'All inclusive' }
                    ].map(meal => (
                      <label key={meal.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.mealPlan.includes(meal.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({ ...prev, mealPlan: [...prev.mealPlan, meal.id] }));
                            } else {
                              setFilters(prev => ({ ...prev, mealPlan: prev.mealPlan.filter(m => m !== meal.id) }));
                            }
                          }}
                          className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{meal.label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Cancellation Policy */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 block">Cancellation Policy</h3>
                <div className="space-y-3">
                    {[
                      { id: 'any', label: 'Any' },
                      { id: 'free_cancellation', label: 'Free cancellation' },
                      { id: 'non_refundable', label: 'Non-refundable' }
                    ].map(policy => (
                      <label key={policy.id} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="mobileCancellationPolicy"
                          checked={filters.cancellationPolicy === policy.id}
                          onChange={() => setFilters(prev => ({ ...prev, cancellationPolicy: policy.id }))}
                          className="w-5 h-5 border-gray-300 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{policy.label}</span>
                      </label>
                    ))}
                </div>
              </div>

              {/* Guest Rating */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3 block">Guest Rating</h3>
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
                            : 'bg-white border-gray-300 text-gray-700'
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
                className="w-full text-orange-500 hover:text-orange-600 text-sm font-medium py-2 mb-4"
              >
                Clear all filters
              </button>

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
            <div className="hidden md:block w-80 lg:w-96 border-r overflow-y-auto bg-gray-50">
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

              {/* Mobile Hotel Carousel */}
              <div className="md:hidden absolute bottom-4 left-0 right-0 z-[1000] flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory safe-area-bottom">
                  {filteredHotels.map((hotel) => (
                    <div
                      key={hotel.id}
                      onClick={() => {
                        setSelectedHotel(hotel);
                        // handleHotelClick(hotel); // Optional: go to details on click or just select? Standard map behavior is select first click, details second. Keeping simple select for now.
                      }}
                      className={`min-w-[85%] sm:min-w-[300px] bg-white rounded-xl shadow-xl snap-center flex overflow-hidden border transition-all ${
                        selectedHotel?.id === hotel.id ? 'border-orange-500 ring-2 ring-orange-500 ring-opacity-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="w-24 bg-gray-200 shrink-0 relative">
                         {hotel.image ? (
                           <img src={hotel.image} className="w-full h-full object-cover" loading="lazy" alt={hotel.name} />
                         ) : (
                           <div className="w-full h-full flex items-center justify-center text-gray-400"><BuildingOfficeIcon className="w-8 h-8"/></div>
                         )}
                      </div>
                      <div className="p-3 flex-1 min-w-0 flex flex-col justify-center relative">
                         <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{hotel.name}</h4>
                         <div className="flex items-center gap-1 mb-1">
                            <span className="bg-blue-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{Math.min(hotel.rating, 10).toFixed(1)}</span>
                            <span className="text-xs text-gray-500 truncate">{getScoreText(hotel.rating)}</span>
                         </div>
                         <div className="flex items-center justify-between mt-auto">
                            <div className="font-bold text-[#E67915] text-lg leading-none">
                                {currencySymbol} {Math.round(hotel.price)}
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleHotelClick(hotel);
                                }}
                                className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm"
                            >
                                View
                            </button>
                         </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Mobile Date Selection Modal - Root Level */}
      {showMobileDateModal && (
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">Select Dates</h2>
            <button
                onClick={() => setShowMobileDateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
            </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center pt-8 bg-gray-50">
            <DatePicker
                selected={checkInDate}
                onChange={(dates) => {
                const [start, end] = dates as [Date | null, Date | null];
                setCheckInDate(start);
                setCheckOutDate(end);
                }}
                startDate={checkInDate}
                endDate={checkOutDate}
                selectsRange
                inline
                monthsShown={1}
                minDate={new Date()}
            />
                <div className="mt-6 text-sm text-gray-500 text-center">
                {checkInDate && checkOutDate ? (
                    <span className="font-medium text-green-600">
                        {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} nights selected
                    </span>
                ) : (
                    "Select check-in and check-out dates"
                )}
                </div>
            </div>

            <div className="p-4 border-t bg-white safe-area-bottom">
            <button
                onClick={() => setShowMobileDateModal(false)}
                className="w-full bg-[#E67915] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 active:scale-95 transition-all shadow-lg text-lg"
            >
                Done
            </button>
            </div>
        </div>
      )}
    </div>
  );
};
