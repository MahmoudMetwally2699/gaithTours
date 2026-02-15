import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { useParams, useHistory, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import {
  StarIcon,
  MapPinIcon,
  PhotoIcon,
  ShareIcon,
  HeartIcon,
  WifiIcon,
  UserGroupIcon,
  HomeIcon,
  CogIcon,
  ClockIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  SparklesIcon,
  CakeIcon,
  LifebuoyIcon,
  UserIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PlusIcon,
  GlobeAltIcon,
  CalendarIcon,
  BellIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  NoSymbolIcon,
  FireIcon,
  ShieldCheckIcon,
  NewspaperIcon,
  TvIcon,
  SunIcon,
  BeakerIcon,
  TruckIcon,
  ChatBubbleLeftRightIcon,
  MusicalNoteIcon,
  BriefcaseIcon,
  ShieldExclamationIcon,
  PhoneIcon,
  LockClosedIcon,
  ScaleIcon,
  KeyIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid, BuildingOffice2Icon } from '@heroicons/react/24/solid';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { registerLocale } from "react-datepicker";
import { format } from "date-fns";
import ar from 'date-fns/locale/ar-SA';
import en from 'date-fns/locale/en-US';
import { Hotel } from '../types/hotel';
import { getHotelDetails } from '../services/hotelService';
import { RoomCard } from '../components/RoomCard';
import { PriceBreakdownCard } from '../components/PriceBreakdownCard';
import { CancellationPolicyCard } from '../components/CancellationPolicyCard';
import { HotelPoliciesCard } from '../components/HotelPoliciesCard';
import { HotelAreaInfo } from '../components/HotelAreaInfo';
import { LazySection } from '../components/LazySection';
import { LazyImage } from '../components/LazyImage';
import { smartPreload, clearPreloadLinks } from '../utils/imagePreloader';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelector } from '../components/CurrencySelector';
import { GuestReviews } from '../components/GuestReviews';
import { TripAdvisorReviews } from '../components/TripAdvisorReviews';
import { getTripAdvisorRatings, TripAdvisorRating } from '../services/tripadvisorService';
import { SimilarHotels } from '../components/SimilarHotels';
import { ShareSaveActions, isFavorited, toggleFavoriteWithData } from '../components/ShareSaveActions';
import { PriceWatchButton } from '../components/PriceWatchButton';
import { formatNumber } from '../utils/numberFormatter';

// Lazy-loaded components — only downloaded when actually needed
const LazyMapContainer = React.lazy(() => import('react-leaflet').then(m => ({ default: m.MapContainer })));
const LazyTileLayer = React.lazy(() => import('react-leaflet').then(m => ({ default: m.TileLayer })));
const LazyMarker = React.lazy(() => import('react-leaflet').then(m => ({ default: m.Marker })));
const LazyPopup = React.lazy(() => import('react-leaflet').then(m => ({ default: m.Popup })));
const CompareRooms = React.lazy(() => import('../components/CompareRooms').then(m => ({ default: m.CompareRooms })));

// Leaflet icon fix and CSS are deferred until map actually renders
let leafletInitialized = false;
const initLeaflet = () => {
  if (leafletInitialized) return;
  leafletInitialized = true;
  // Inject Leaflet CSS on demand
  if (!document.querySelector('link[href*="leaflet"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
  }
  import('leaflet').then(L => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
  });
};


registerLocale('ar', ar);
registerLocale('en', en);

interface HotelDetailsParams {
  hotelId: string;
}

interface RoomRate {
  match_hash: string;
  room_name: string;
  bed_groups?: any[];
  room_size?: number;
  max_occupancy?: number;
  room_amenities?: string[];
  meal_data?: any;
  price: number;
  original_price?: number;
  currency: string;
  is_free_cancellation?: boolean;
  requires_prepayment?: boolean;
  requires_credit_card?: boolean;
  room_images?: string[];
  room_image_count?: number;
  taxes?: any[];
  cancellation_details?: any;
  daily_prices?: string[];
  amenities_data?: string[];
  room_data_trans?: {
    main_room_type?: string;
    main_name?: string;
    bathroom?: string | null;
    bedding_type?: string | null;
    misc_room_type?: string | null;
  };
}

const getResizedImageUrl = (url: string, size: string = '1024x768') => {
  if (!url) return '';
  // Check if URL has the size pattern we expect (from backend it might come as '..._1024x768.jpg')
  // We want to replace '1024x768' with the requested size
  if (url.includes('1024x768')) {
    return url.replace('1024x768', size);
  }
  return url;
};

export const HotelDetails: React.FC = () => {
  const { t, i18n } = useTranslation(['hotelDetails', 'common']);
  const { hotelId } = useParams<HotelDetailsParams>();
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Check if current language is RTL (used for potential RTL layout adjustments)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const isRTL = i18n.language === 'ar';
  const { currency, currencySymbol } = useCurrency();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const childrenParam = searchParams.get('children') || '';
  const initialChildrenAges = childrenParam ? childrenParam.split(',').map(Number).filter(n => !isNaN(n)) : [];

  // Generate default dates if not provided
  const getDefaultCheckIn = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getDefaultCheckOut = () => {
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    return dayAfter.toISOString().split('T')[0];
  };

  // State for editable search params
  const [checkInDate, setCheckInDate] = useState<Date | null>(
    searchParams.get('checkIn') ? new Date(searchParams.get('checkIn')!) : new Date(getDefaultCheckIn())
  );
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(
    searchParams.get('checkOut') ? new Date(searchParams.get('checkOut')!) : new Date(getDefaultCheckOut())
  );

  const [guestCounts, setGuestCounts] = useState({
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: initialChildrenAges.length,
    childrenAges: initialChildrenAges
  });

  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [isTravelingForWork, setIsTravelingForWork] = useState(false);

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<{hotels: any[], regions: any[]}>({ hotels: [], regions: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const hasUserTyped = useRef(false);
  const searchNameRef = useRef<string>(''); // English name for search when Arabic is displayed
  const [editableDestination, setEditableDestination] = useState('');

  // Mobile Date Modal State
  const [showMobileDateModal, setShowMobileDateModal] = useState(false);

  // Room Comparison State
  const [comparedRooms, setComparedRooms] = useState<Map<string, RoomRate>>(new Map());
  const [showCompareRooms, setShowCompareRooms] = useState(false);

  // Map Modal State
  const [showMapModal, setShowMapModal] = useState(false);

  const handleToggleCompare = (rate: RoomRate) => {
    setComparedRooms(prev => {
      const newMap = new Map(prev);
      if (newMap.has(rate.match_hash)) {
        newMap.delete(rate.match_hash);
      } else {
        if (newMap.size >= 3) {
           // Optional: Show toast
        }
        newMap.set(rate.match_hash, rate);
      }
      return newMap;
    });
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  // Autocomplete: debounced API call
  useEffect(() => {
    if (!hasUserTyped.current) return;

    if (editableDestination.length < 2) {
      setAutocompleteResults({ hotels: [], regions: [] });
      setShowAutocomplete(false);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const isArabic = /[\u0600-\u06FF]/.test(editableDestination);
        const searchLanguage = isArabic ? 'ar' : i18n.language;

        const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(editableDestination)}&language=${searchLanguage}`);
        const data = await response.json();

        if (data.success && data.data) {
          setAutocompleteResults(data.data);
          if (data.data.hotels.length > 0 || data.data.regions.length > 0) {
            setShowAutocomplete(true);
          }
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 350);
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAutocomplete]);

  const handleSelectSuggestion = (suggestion: any) => {
    const displayName = (i18n.language === 'ar' && suggestion.nameAr) ? suggestion.nameAr : suggestion.name;
    setEditableDestination(displayName);
    searchNameRef.current = suggestion.name; // Store English name for search
    setShowAutocomplete(false);
  };

  const bookingParams = {
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || getDefaultCheckIn(),
    checkOut: searchParams.get('checkOut') || getDefaultCheckOut(),
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: initialChildrenAges.length,
    childrenAges: initialChildrenAges
  };

  // Sync state with URL params when they change (e.g. back button)
  useEffect(() => {
     if(searchParams.get('checkIn')) setCheckInDate(new Date(searchParams.get('checkIn')!));
     if(searchParams.get('checkOut')) setCheckOutDate(new Date(searchParams.get('checkOut')!));

     const currentChildrenParam = searchParams.get('children') || '';
     const currentChildrenAges = currentChildrenParam ? currentChildrenParam.split(',').map(Number).filter(n => !isNaN(n)) : [];

     setGuestCounts({
        rooms: parseInt(searchParams.get('rooms') || '1'),
        adults: parseInt(searchParams.get('adults') || '2'),
        children: currentChildrenAges.length,
        childrenAges: currentChildrenAges
     });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);


  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(() => hotelId ? isFavorited(hotelId) : false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [selectedRates, setSelectedRates] = useState<Map<string, number>>(new Map()); // match_hash -> count
  const [taHeaderRating, setTaHeaderRating] = useState<TripAdvisorRating | null>(null);

  // Scroll to top when component mounts and disable scroll restoration
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'auto';
      }
    };
  }, []);

  const handleUpdateSearch = () => {
    if (!checkInDate || !checkOutDate) return;

    // Create new params object to avoid carrying over header/other params like hotelId
    const params = new URLSearchParams();

    // Update destination if changed in editable field
    const searchDest = searchNameRef.current || editableDestination;
    searchNameRef.current = ''; // Reset after use
    if (searchDest) {
      params.set('destination', searchDest);
    } else {
        params.set('destination', bookingParams.destination || '');
    }

    params.set('checkIn', checkInDate.toISOString().split('T')[0]);
    params.set('checkOut', checkOutDate.toISOString().split('T')[0]);
    params.set('rooms', guestCounts.rooms.toString());
    params.set('adults', guestCounts.adults.toString());
    if (guestCounts.childrenAges && guestCounts.childrenAges.length > 0) {
      params.set('children', guestCounts.childrenAges.join(','));
    } else {
      params.set('children', '');
    }

    // Add language if available
    params.set('language', i18n.language);

    history.push({
       pathname: '/hotels/search',
       search: params.toString()
    });
  };

  // Function to get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    const className = "h-5 w-5 text-gray-700";

    // Core Amenities
    if (lower.includes('wifi') || lower.includes('internet') || lower.includes('connection')) return <WifiIcon className={className} />;
    if (lower.includes('pool') || lower.includes('swimming')) return <LifebuoyIcon className={className} />;
    if (lower.includes('gym') || lower.includes('fitness') || lower.includes('workout')) return <UserGroupIcon className={className} />;
    if (lower.includes('restaurant') || lower.includes('dining') || lower.includes('breakfast') || lower.includes('meal') || lower.includes('kitchen') || lower.includes('lunch') || lower.includes('cafe') || lower.includes('diet')) return <CakeIcon className={className} />;
    if (lower.includes('spa') || lower.includes('massage') || lower.includes('sauna') || lower.includes('wellness') || lower.includes('beauty')) return <SparklesIcon className={className} />;
    if (lower.includes('room service') || lower.includes('service') || lower.includes('concierge') || lower.includes('clean') || lower.includes('storage') || lower.includes('luggage')) return <ClockIcon className={className} />;
    if (lower.includes('bar') || lower.includes('lounge') || lower.includes('drink') || lower.includes('minibar')) return <div className="h-5 w-5 text-gray-700 flex items-center justify-center"><CakeIcon className={className} /></div>;

    // Shopping & Business
    if (lower.includes('shop') || lower.includes('store') || lower.includes('market')) return <ShoppingBagIcon className={className} />;
    if (lower.includes('money') || lower.includes('currency') || lower.includes('exchange')) return <CurrencyDollarIcon className={className} />;
    if (lower.includes('business') || lower.includes('meeting') || lower.includes('conference') || lower.includes('fax') || lower.includes('printer') || lower.includes('copy')) return <BriefcaseIcon className={className} />;

    // Room Features & Safety
    if (lower.includes('smoke') || lower.includes('smoking')) return <NoSymbolIcon className={className} />;
    if (lower.includes('heat') || lower.includes('fire') || lower.includes('flame')) return <FireIcon className={className} />;
    if (lower.includes('safe') || lower.includes('lock') || lower.includes('security') || lower.includes('guard') || lower.includes('protect')) return <ShieldCheckIcon className={className} />;
    if (lower.includes('aid') || lower.includes('health') || lower.includes('doctor') || lower.includes('pharmacy') || lower.includes('decontamination')) return <ShieldExclamationIcon className={className} />;
    if (lower.includes('news') || lower.includes('paper')) return <NewspaperIcon className={className} />;
    if (lower.includes('tv') || lower.includes('television') || lower.includes('cable') || lower.includes('channel')) return <TvIcon className={className} />;
    if (lower.includes('phone') || lower.includes('telephone') || lower.includes('call')) return <PhoneIcon className={className} />;
    if (lower.includes('terrace') || lower.includes('balcony') || lower.includes('garden') || lower.includes('patio')) return <SunIcon className={className} />;

    // Services
    if (lower.includes('reception') || lower.includes('desk') || lower.includes('lobby') || lower.includes('check-in')) return <BellIcon className={className} />;
    if (lower.includes('parking') || lower.includes('garage') || lower.includes('valet')) return <BuildingOffice2Icon className={className} />;
    if (lower.includes('car') || lower.includes('rental') || lower.includes('transport') || lower.includes('shuttle')) return <TruckIcon className={className} />;
    if (lower.includes('language') || lower.includes('speak') || lower.includes('english') || lower.includes('spanish') || lower.includes('russian') || lower.includes('italian')) return <ChatBubbleLeftRightIcon className={className} />;
    if (lower.includes('iron') || lower.includes('laundry') || lower.includes('dry')) return <SparklesIcon className={className} />;

    // Entertainment & Family
    if (lower.includes('family') || lower.includes('kid') || lower.includes('child')) return <UserGroupIcon className={className} />;
    if (lower.includes('night') || lower.includes('club') || lower.includes('music') || lower.includes('dj') || lower.includes('billiards') || lower.includes('game')) return <MusicalNoteIcon className={className} />;
    if (lower.includes('bridal') || lower.includes('wedding') || lower.includes('vip') || lower.includes('honeymoon')) return <HeartIcon className={className} />;
    if (lower.includes('accessibility') || lower.includes('disabled') || lower.includes('wheelchair') || lower.includes('elevator') || lower.includes('lift')) return <ArrowLeftIcon className={`${className} rotate-90`} />; // Using arrow as makeshift elevator/ramp symbol if lift
    if (lower.includes('coffee') || lower.includes('tea') || lower.includes('kettle')) return <BeakerIcon className={className} />;
    if (lower.includes('air') || lower.includes('ac') || lower.includes('cool') || lower.includes('temperature') || lower.includes('climate')) return <SunIcon className={className} />;

    // Additional Amenities
    if (lower.includes('beach') || lower.includes('sea') || lower.includes('view') || lower.includes('ocean')) return <GlobeAltIcon className={className} />;
    if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat') || lower.includes('animal')) return <UserGroupIcon className={className} />;

    // Default fallback
    return <CheckIcon className={className} />;
  };

   // Fetch real hotel data from API
  useEffect(() => {
    const fetchHotelDetails = async () => {
      // Scroll to top when fetching new data
      window.scrollTo({ top: 0, behavior: 'smooth' });

      if (!hotelId) {
        setError(t('hotelDetails:error.idRequired', 'Hotel ID is required'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
        try {
        // Use the service function with date parameters
        const hotelData = await getHotelDetails(hotelId, {
          checkin: bookingParams.checkIn,
          checkout: bookingParams.checkOut,
          adults: bookingParams.adults,
          children: bookingParams.children > 0 ? bookingParams.children.toString() : undefined,
          currency: currency,
          language: i18n.language
        });

        // Transform the API response to match our Hotel interface
        const transformedHotel: Hotel = {
          id: hotelData.id || hotelId,
          hid: hotelData.hid, // Numeric hotel ID for API calls (fetching contact info, etc.)
          name: hotelData.name || t('hotelDetails:hotel.nameUnavailable', 'Hotel Name Not Available'),
          nameAr: hotelData.nameAr || null,
          address: hotelData.address || t('hotelDetails:location.addressUnavailable', 'Address not available'),
          city: hotelData.city || bookingParams.destination || '',
          country: hotelData.country || t('hotelDetails:location.saudiArabia', 'Saudi Arabia'),
          price: 0,
          currency: currency,
          rating: hotelData.rating || hotelData.reviewScore || null,
          image: hotelData.images?.[0] || hotelData.mainImage || null,
          images: hotelData.images || (hotelData.mainImage ? [hotelData.mainImage] : []),
          description: hotelData.description || '',
          reviewScore: hotelData.reviewScore || hotelData.rating || null,
          reviewCount: hotelData.reviewCount || 0,
          amenities: hotelData.amenities || [],
          facilities: hotelData.facilities || [],
          propertyClass: hotelData.star_rating || hotelData.propertyClass || 0,
          reviewScoreWord: hotelData.reviewScoreWord || null,
          isPreferred: hotelData.isPreferred || false,
          checkIn: hotelData.check_in_time || hotelData.checkInTime || null,
          checkOut: hotelData.check_out_time || hotelData.checkOutTime || null,
          coordinates: hotelData.coordinates || { latitude: 0, longitude: 0 },
          rates: hotelData.rates || [],
          metapolicy_extra_info: hotelData.metapolicy_extra_info || '',
          metapolicy_struct: hotelData.metapolicy_struct || null,
          poi_data: hotelData.poi_data || null,
          // Review data from hotel_reviews collection
          detailed_ratings: hotelData.detailed_ratings || null,
          reviews: hotelData.reviews || []
        } as Hotel & { detailed_ratings?: any; reviews?: any[]; poi_data?: any };

        setHotel(transformedHotel);

        // Initialize editable destination
        setEditableDestination(bookingParams.destination || transformedHotel.city || '');

        // Preload hotel images for better performance
        const imagesToPreload = transformedHotel.images || [];
        if (imagesToPreload.length > 0) {
          // Use requestIdleCallback or setTimeout to avoid blocking main thread
          if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
              smartPreload(imagesToPreload, {
                maxImages: 10,
                respectDataSaver: true
              });
            });
          } else {
            setTimeout(() => {
              smartPreload(imagesToPreload, {
                maxImages: 10,
                respectDataSaver: true
              });
            }, 100);
          }
        }
      } catch (err: any) {
        console.error('Failed to fetch hotel details:', err);
        setError(err.message || t('hotelDetails:error.loadFailed', 'Failed to load hotel details'));
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetails();
  }, [hotelId, bookingParams.checkIn, bookingParams.checkOut, bookingParams.adults, bookingParams.children, bookingParams.destination, currency, i18n.language]);

  // Fetch TripAdvisor rating for header display
  useEffect(() => {
    if (hotel?.name && hotel?.city) {
      getTripAdvisorRatings([hotel.name], hotel.city)
        .then(ratings => {
          if (ratings[hotel.name]) {
            setTaHeaderRating(ratings[hotel.name]);
          }
        })
        .catch(err => console.error('TripAdvisor header rating error:', err));
    }
  }, [hotel?.name, hotel?.city]);

  // Helper to clean room name for grouping
  const normalizeRoomName = (name: string) => {
    // Remove the last parenthesized group if it looks like a bed type or availability info
    // Examples:
    // "Deluxe Room (King)" -> "Deluxe Room"
    // "Standard Room (bed type subject to availability)" -> "Standard Room"
    // Keep doing it in case there are nested or multiple suffixes like "(Full Bed) (King)"
    let normalized = name;

    // Pattern to match common suffixes in parentheses at the end of string
    // We loop to handle cases like "Room (View) (Bed)" -> "Room"
    while (true) {
      const newName = normalized.replace(/\s*\([^)]*(?:bed|size|avail|view|only)[^)]*\)\s*$/i, '');
      if (newName === normalized) break;
      normalized = newName;
    }

    return normalized.trim() || name; // Fallback to original if empty
  };

  // Group rates by normalized room name
  const groupedRates = useMemo(() => {
    if (!hotel || !hotel.rates) return {};

    const groups: { [key: string]: RoomRate[] } = {};

    hotel.rates.forEach((rate: any) => {
      // Use normalized name for the key
      const roomName = normalizeRoomName(rate.room_name);
      if (!groups[roomName]) {
        groups[roomName] = [];
      }
      groups[roomName].push(rate);
    });

    return groups;
  }, [hotel]);

  // Handle rate selection
  const handleRateSelect = (rate: RoomRate, count: number) => {
    const newSelection = new Map(selectedRates);

    if (count > 0) {
      newSelection.set(rate.match_hash, count);
    } else {
      newSelection.delete(rate.match_hash);
    }

    setSelectedRates(newSelection);
  };

  const handleBookNow = () => {
    const selectedHashes = Array.from(selectedRates.keys());
    if (selectedHashes.length === 0) {
       alert(t('hotelDetails:error.selectRoomFirst', 'Please select a room first'));
       return;
    }

    // Build array of all selected rooms with their counts
    const selectedRoomsData = selectedHashes.map(hash => {
      const rate = hotel?.rates?.find((r: any) => r.match_hash === hash);
      const count = selectedRates.get(hash) || 1;
      return { ...rate, count };
    }).filter(Boolean);

    // IMPORTANT: RateHawk API limitation - Can only book same room type in one request
    // For different room types, separate booking requests will be made automatically
    // Group rooms by room type
    const roomsByType = new Map();
    selectedRoomsData.forEach(room => {
      const key = room.room_name;
      if (!roomsByType.has(key)) {
        roomsByType.set(key, []);
      }
      roomsByType.get(key).push(room);
    });

    // For URL params, use the first rate as primary but include total rooms
    const primaryRate = selectedRoomsData[0];
    const totalRooms = selectedRoomsData.reduce((sum, r) => sum + (r.count || 1), 0);

    // Build URL with booking params (using bookingParams object which has default dates)
    const urlParams = new URLSearchParams({
      hotelId: hotel?.hid?.toString() || hotel?.id || '',
      hotelName: hotel?.name || '',
      hotelAddress: hotel?.address || '',
      hotelCity: hotel?.city || '',
      hotelCountry: hotel?.country || '',
      hotelRating: hotel?.rating?.toString() || '0',
      hotelImage: hotel?.images?.[0] || '',
      checkIn: bookingParams.checkIn,
      checkOut: bookingParams.checkOut,
      rooms: totalRooms.toString(),
      adults: bookingParams.adults.toString(),
      children: bookingParams.childrenAges && bookingParams.childrenAges.length > 0 ? bookingParams.childrenAges.join(',') : '',
      // Primary room details
      matchHash: primaryRate?.match_hash || '',
      roomName: primaryRate?.room_name || '',
      meal: primaryRate?.meal || '',
      price: primaryRate?.price?.toString() || '0',
      currency: primaryRate?.currency || 'SAR',
      // Multiroom flag
      isMultiroom: (selectedRoomsData.length > 1 || totalRooms > 1).toString()
    });

    // Navigate with state containing full room data
    history.push(`/hotels/booking/${hotel?.id}?${urlParams.toString()}`, {
      hotel,
      selectedRooms: selectedRoomsData,
      selectedRate: primaryRate,
      checkIn: bookingParams.checkIn,
      checkOut: bookingParams.checkOut,
      guests: bookingParams.adults,
      children: bookingParams.children,
      childrenAges: bookingParams.childrenAges
    });
  };

  const renderStars = (rating: number) => {
     const stars = [];
     const fullStars = Math.floor(rating);
     const hasHalfStar = rating % 1 !== 0;

     for (let i = 0; i < 5; i++) {
       if (i < fullStars) {
         stars.push(<StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />);
       } else if (i === fullStars && hasHalfStar) {
         stars.push(
           <div key={i} className="relative">
             <StarIcon className="h-5 w-5 text-gray-300" />
             <div className="absolute inset-0 overflow-hidden w-1/2">
               <StarIconSolid className="h-5 w-5 text-yellow-500" />
             </div>
           </div>
         );
       } else {
         stars.push(<StarIcon key={i} className="h-5 w-5 text-gray-300" />);
       }
     }
     return stars;
  };

  const hotelImages = useMemo(() => {
    if (hotel && hotel.images && hotel.images.length > 0) return hotel.images;
    if (hotel && hotel.image) return [hotel.image];
    return [];
  }, [hotel]);

  // Calculate lowest price for header
  const lowestPrice = useMemo(() => {
     if (!hotel || !hotel.rates || hotel.rates.length === 0) return 0;
     return Math.min(...hotel.rates.map((r: any) => Number(r.price)));
  }, [hotel]);

  // Calculate number of nights for display
  const numberOfNights = useMemo(() => {
    if (!bookingParams.checkIn || !bookingParams.checkOut) return 1;
    const checkIn = new Date(bookingParams.checkIn);
    const checkOut = new Date(bookingParams.checkOut);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return nights > 0 ? nights : 1;
  }, [bookingParams.checkIn, bookingParams.checkOut]);

  if (loading) {
     return (
       <div className="min-h-screen bg-white">
         {/* Skeleton Header */}
         <div className="w-full bg-[#E67915] h-14 md:h-16" />
         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8">
           {/* Skeleton Title */}
           <div className="mb-6">
             <div className="h-8 bg-gray-200 rounded-lg w-72 mb-2 animate-pulse" />
             <div className="h-4 bg-gray-200 rounded w-96 mb-3 animate-pulse" />
             <div className="flex gap-2">
               <div className="h-6 w-10 bg-gray-200 rounded animate-pulse" />
               <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" />
               <div className="h-6 w-24 bg-gray-200 rounded animate-pulse" />
             </div>
           </div>
           {/* Skeleton Gallery */}
           <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] md:h-[500px] rounded-xl overflow-hidden mb-8">
             <div className="bg-gray-200 animate-pulse md:col-span-2 md:row-span-2" />
             <div className="hidden md:block bg-gray-100 animate-pulse" />
             <div className="hidden md:block bg-gray-100 animate-pulse" />
             <div className="hidden md:block bg-gray-100 animate-pulse" />
             <div className="hidden md:block bg-gray-100 animate-pulse" />
           </div>
           {/* Skeleton Description */}
           <div className="mb-10">
             <div className="h-7 bg-gray-200 rounded w-56 mb-4 animate-pulse" />
             <div className="space-y-2">
               <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
               <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse" />
               <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse" />
             </div>
           </div>
           {/* Skeleton Rooms */}
           <div className="mb-12">
             <div className="h-7 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
             {[1,2,3].map(i => (
               <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 mb-4 animate-pulse">
                 <div className="flex gap-4">
                   <div className="w-32 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
                   <div className="flex-1">
                     <div className="h-5 bg-gray-200 rounded w-48 mb-2" />
                     <div className="h-4 bg-gray-100 rounded w-32 mb-3" />
                     <div className="h-8 bg-gray-200 rounded w-24" />
                   </div>
                 </div>
               </div>
             ))}
           </div>
         </div>
       </div>
     );
  }

  if (error || !hotel) {
     return <div className="text-center py-20 text-red-500">{error || t('hotelDetails:error.notFound', 'Hotel not found')}</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-20 font-sans overflow-x-hidden">
      {/* Header Section - Same as Search Results */}
      {/* Compact Header Section */}
      <div className="relative w-full bg-[#E67915] shadow-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between py-2 md:py-3 gap-2 md:gap-4">

            {/* Logo & Mobile Top Bar */}
            <div className="flex items-center justify-between w-full md:w-auto shrink-0">
               <a href="/" className="flex-shrink-0">
                 <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-8 md:h-10 w-auto brightness-0 invert" />
               </a>

               {/* Mobile Auth & Lang Controls (Visible only on Mobile) */}
               <div className="flex md:hidden items-center gap-3">
                 <CurrencySelector variant="light" />
                 <div className="flex items-center gap-1 text-white/90" onClick={toggleLanguage}>
                    <span className="text-xs font-bold">{i18n.language.toUpperCase()}</span>
                 </div>
                 <div className="h-4 w-px bg-white/20"></div>
                 {!user ? (
                   <Link to="/login" className="text-sm font-bold text-white hover:text-orange-100">{t('common:nav.login', 'Sign In')}</Link>
                 ) : (
                   <Link to="/profile" className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/25 transition-all shadow-sm text-white">
                     <div className="w-6 h-6 rounded-full bg-white/30 flex items-center justify-center">
                       <UserIcon className="w-3.5 h-3.5" />
                     </div>
                     <span className="text-xs font-semibold truncate max-w-[80px]">
                       {user.name?.split(' ')[0]}
                     </span>
                   </Link>
                 )}
               </div>
            </div>

            {/* Compact Search Bar - Editable (Desktop) */}
            <div className="flex-1 max-w-3xl w-full hidden md:block">
               <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20 flex items-center rtl:flex-row-reverse relative gap-1">
                  {/* Destination - Editable with Autocomplete */}
                  <div className="flex-[1.5] px-4 border-r rtl:border-r-0 border-white/20 flex items-center gap-2 min-w-0 relative" ref={autocompleteRef}>
                     <MapPinIcon className="h-4 w-4 text-white/80 shrink-0" />
                     <div className="flex flex-col min-w-0 overflow-visible w-full">
                        <span className="text-white text-xs font-medium opacity-70 text-start">{t('hotelDetails:location.destination', 'Destination')}</span>
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
                           placeholder={loading ? t('hotelDetails:loading', "Loading...") : t('hotelDetails:location.destination', "Destination")}
                           className="bg-transparent border-none p-0 text-white text-sm font-semibold placeholder-white/50 focus:ring-0 w-full truncate focus:outline-none"
                        />

                            {/* Autocomplete Dropdown - Desktop */}
                            {showAutocomplete && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0) && (
                              <div className="absolute top-full left-0 mt-4 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-[100] max-h-80 overflow-y-auto">
                                <div className="p-2">
                                  {autocompleteResults.regions.length > 0 && (
                                    <>
                                      <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase">{t('hotelDetails:location.regions', 'Regions')}</div>
                                      {autocompleteResults.regions.map(r => (
                                        <button key={r.id} onClick={() => handleSelectSuggestion(r)} className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg text-gray-800 text-sm font-medium flex items-center gap-2">
                                          <MapPinIcon className="w-4 h-4 text-orange-500" /> {r.name}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                  {autocompleteResults.hotels.length > 0 && (
                                    <>
                                      <div className="px-3 py-1 text-xs font-bold text-gray-400 uppercase mt-2">{t('hotelDetails:location.hotels', 'Hotels')}</div>
                                      {autocompleteResults.hotels.map(h => (
                                        <button key={h.id} onClick={() => handleSelectSuggestion(h)} className="w-full text-left px-3 py-2 hover:bg-orange-50 rounded-lg text-gray-800 text-sm font-medium flex items-center gap-2">
                                          <BuildingOffice2Icon className="w-4 h-4 text-gray-500" /> {(i18n.language === 'ar' && h.nameAr) ? h.nameAr : h.name}
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                         </div>
                      </div>

                      {/* Dates - Unified Range Picker */}
                      <div className="flex-[2] px-4 border-r rtl:border-l border-white/20 flex items-center gap-2">
                         <ClockIcon className="h-4 w-4 text-white/80 shrink-0" />
                         <div className="flex flex-col w-full">
                            <span className="text-white text-xs font-medium opacity-70">{t('hotelDetails:dates.checkInCheckOut', 'Check-in - Check-out')}</span>
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
                                  className="bg-transparent border-none p-0 text-white text-sm font-semibold w-full focus:ring-0 cursor-pointer"
                                  dateFormat="dd MMM"
                                  placeholderText="Select dates"
                                  customInput={
                                     <input
                                        value={
                                           checkInDate && checkOutDate
                                           ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                           : (checkInDate ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${t('hotelDetails:dates.selectCheckout', 'Select checkout')}` : t('hotelDetails:dates.selectDates', 'Select dates'))
                                        }
                                        readOnly
                                        className="bg-transparent border-none p-0 text-white text-sm font-semibold w-full focus:ring-0 cursor-pointer" dir="ltr"
                                     />
                                  }
                               />
                            </div>
                         </div>
                      </div>

                      {/* Guests - Editable Popover Trigger */}
                      <div className="relative flex-[1.2]">
                         <button
                            className="px-4 flex items-center gap-2 w-full text-left"
                            onClick={() => setShowGuestPopover(!showGuestPopover)}
                         >
                            <UserIcon className="h-4 w-4 text-white/80 shrink-0" />
                            <div className="flex flex-col">
                               <span className="text-white text-xs font-medium opacity-70">{t('hotelDetails:guests.label', 'Guests')}</span>
                               <span className="text-white text-sm font-semibold truncate">
                                  {guestCounts.adults + guestCounts.children} {t('hotelDetails:guests.label', 'Guests')}, {guestCounts.rooms} {t('hotelDetails:guests.rooms', 'Rm')}
                               </span>
                            </div>
                         </button>

                         {/* Guest Selection Popover */}
                         {showGuestPopover && (
                            <>
                               <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setShowGuestPopover(false)}
                               ></div>
                               <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 text-gray-800 animate-fadeIn">
                                  {/* Rooms */}
                                  <div className="flex justify-between items-center mb-4">
                                     <span className="font-medium text-sm">{t('hotelDetails:guests.rooms', 'Rooms')}</span>
                                     <div className="flex items-center gap-3">
                                        <button
                                           onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.max(1, prev.rooms - 1)}))}
                                           className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                        >
                                           <MinusIcon className="w-4 h-4" />
                                        </button>
                                        <span className="w-4 text-center font-bold text-sm">{guestCounts.rooms}</span>
                                        <button
                                           onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.min(10, prev.rooms + 1)}))}
                                           className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                        >
                                           <PlusIcon className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                                  {/* Adults */}
                                  <div className="flex justify-between items-center mb-4">
                                     <span className="font-medium text-sm">{t('hotelDetails:guests.adults', 'Adults')}</span>
                                     <div className="flex items-center gap-3">
                                        <button
                                           onClick={() => setGuestCounts(prev => ({...prev, adults: Math.max(1, prev.adults - 1)}))}
                                           className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                        >
                                           <MinusIcon className="w-4 h-4" />
                                        </button>
                                        <span className="w-4 text-center font-bold text-sm">{guestCounts.adults}</span>
                                        <button
                                           onClick={() => setGuestCounts(prev => ({...prev, adults: Math.min(30, prev.adults + 1)}))}
                                           className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                        >
                                           <PlusIcon className="w-4 h-4" />
                                        </button>
                                     </div>
                                  </div>
                                  {/* Children */}
                                  <div className="mb-0">
                                     <div className="flex justify-between items-center">
                                        <span className="font-medium text-sm">{t('hotelDetails:guests.children', 'Children')}</span>
                                        <div className="flex items-center gap-3">
                                           <button
                                              onClick={() => setGuestCounts(prev => ({
                                                 ...prev,
                                                 children: Math.max(0, prev.children - 1),
                                                 childrenAges: (prev.childrenAges || []).slice(0, -1)
                                              }))}
                                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                           >
                                              <MinusIcon className="w-4 h-4" />
                                           </button>
                                           <span className="w-4 text-center font-bold text-sm">{guestCounts.children}</span>
                                           <button
                                              onClick={() => setGuestCounts(prev => ({
                                                 ...prev,
                                                 children: Math.min(10, prev.children + 1),
                                                 childrenAges: [...(prev.childrenAges || []), 5]
                                              }))}
                                              className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                           >
                                              <PlusIcon className="w-4 h-4" />
                                           </button>
                                        </div>
                                     </div>

                                     {/* Child Age Selectors */}
                                     {guestCounts.childrenAges && guestCounts.childrenAges.length > 0 && (
                                       <div className="mt-4 pt-3 border-t border-gray-100">
                                         <p className="text-xs text-gray-500 mb-2">{t('hotelDetails:guests.ages', 'Select age at check-in')}:</p>
                                         <div className={`grid ${guestCounts.childrenAges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                           {guestCounts.childrenAges.map((age, index) => (
                                             <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                               <span className="text-xs text-gray-500 whitespace-nowrap">{t('hotelDetails:guests.children', 'Child')} {index + 1}</span>
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
                                     className="w-full mt-4 bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition-colors"
                                     onClick={() => setShowGuestPopover(false)}
                                  >
                                     {t('common.done', 'Done')}
                                  </button>
                               </div>
                            </>
                         )}
                      </div>

                      {/* Search Button */}
                      <button
                        onClick={handleUpdateSearch}
                        className="bg-white text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors ml-2 shadow-sm shrink-0"
                        title={t('common:common.search', 'Update Search')}
                      >
                         <MagnifyingGlassIcon className="w-5 h-5 stroke-[2.5]" />
                      </button>
                   </div>
                </div>

                {/* Mobile Search Modal - Full Overlay Implementation */}
                <div className="md:hidden w-full mt-1">
                  {!isSearchExpanded ? (
                    <div className="w-full max-w-5xl mx-auto">
                      <div
                        onClick={() => setIsSearchExpanded(true)}
                        className="bg-white rounded-lg p-3 shadow-lg border-2 border-orange-500 cursor-pointer hover:shadow-xl transition-all"
                      >
                        <div className="flex items-center gap-3 rtl:flex-row-reverse">
                          <MagnifyingGlassIcon className="h-5 w-5 text-gray-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate text-sm text-start">{editableDestination || 'Where to?'}</div>
                            <div className="text-xs text-gray-600 text-start">
                               {checkInDate && checkOutDate ? (checkInDate.toLocaleDateString() + ' - ' + checkOutDate.toLocaleDateString()) : 'Add dates'} • {guestCounts.adults} Ad, {guestCounts.children} Ch
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
                         {/* Full Screen Mobile Modal */}
                      <div className="p-4">
                         <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">{t('common:common.search', 'Search')}</h2>
                            <button
                              onClick={() => setIsSearchExpanded(false)}
                              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                            >
                              <XMarkIcon className="w-6 h-6 text-gray-600" />
                            </button>
                         </div>

                         {/* Destination */}
                         <div className="mb-6 relative">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('hotelDetails:location.destination', 'Destination')}</label>
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
                                  placeholder="Where are you going?"
                                  className="w-full px-4 py-4 md:py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-0 text-lg md:text-base font-semibold text-gray-900"
                               />
                               {/* Mobile Autocomplete Dropdown */}
                               {showAutocomplete && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0) && (
                                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-[110] max-h-60 overflow-y-auto">
                                    {autocompleteResults.regions.map(r => (
                                       <div key={r.id} onClick={() => handleSelectSuggestion(r)} className="p-3 border-b border-gray-100 flex items-center gap-3 active:bg-orange-50">
                                          <MapPinIcon className="w-5 h-5 text-orange-500" />
                                          <div className="text-sm font-bold text-gray-900">{r.name}</div>
                                       </div>
                                    ))}
                                    {autocompleteResults.hotels.map(h => (
                                       <div key={h.id} onClick={() => handleSelectSuggestion(h)} className="p-3 border-b border-gray-100 flex items-center gap-3 active:bg-orange-50">
                                          <BuildingOffice2Icon className="w-5 h-5 text-gray-400" />
                                          <div className="text-sm font-bold text-gray-900">{(i18n.language === 'ar' && h.nameAr) ? h.nameAr : h.name}</div>
                                       </div>
                                    ))}
                                  </div>
                               )}
                            </div>
                         </div>

                         {/* Dates - Click to open modal */}
                         <div className="grid grid-cols-2 gap-3 mb-6">
                            <div onClick={() => setShowMobileDateModal(true)}>
                               <label className="block text-sm font-semibold text-gray-700 mb-2">{t('search.checkIn', 'Check-in date')}</label>
                               <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium bg-gray-50 flex items-center">
                                  {checkInDate ? checkInDate.toLocaleDateString() : 'Select date'}
                               </div>
                            </div>
                            <div onClick={() => setShowMobileDateModal(true)}>
                               <label className="block text-sm font-semibold text-gray-700 mb-2">{t('search.checkOut', 'Check-out date')}</label>
                               <div className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 font-medium bg-gray-50 flex items-center">
                                  {checkOutDate ? checkOutDate.toLocaleDateString() : 'Select date'}
                               </div>
                            </div>
                         </div>

                         {/* Guests */}
                         <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('hotelDetails:guests.label', 'Guests')}</label>
                            <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                               <div className="flex justify-between items-center mb-4">
                                  <span className="font-bold text-gray-900">{t('hotelDetails:guests.adults', 'Adults')}</span>
                                  <div className="flex items-center gap-4">
                                     <button onClick={() => setGuestCounts(p => ({...p, adults: Math.max(1, p.adults - 1)}))} className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600"><MinusIcon className="w-4 h-4" /></button>
                                     <span className="font-bold text-lg">{guestCounts.adults}</span>
                                     <button onClick={() => setGuestCounts(p => ({...p, adults: Math.min(30, p.adults + 1)}))} className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600"><PlusIcon className="w-4 h-4" /></button>
                                  </div>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="font-bold text-gray-900">{t('hotelDetails:guests.children', 'Children')}</span>
                                  <div className="flex items-center gap-4">
                                     <button onClick={() => setGuestCounts(p => ({...p, children: Math.max(0, p.children - 1), childrenAges: p.childrenAges.slice(0, -1)}))} className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600"><MinusIcon className="w-4 h-4" /></button>
                                     <span className="font-bold text-lg">{guestCounts.children}</span>
                                     <button onClick={() => setGuestCounts(p => ({...p, children: Math.min(10, p.children + 1), childrenAges: [...p.childrenAges, 5]}))} className="w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-gray-600"><PlusIcon className="w-4 h-4" /></button>
                                  </div>
                               </div>
                            </div>
                         </div>

                         {/* Search Action */}
                         <button
                           onClick={() => {
                             handleUpdateSearch();
                             setIsSearchExpanded(false);
                           }}
                           className="w-full bg-[#E67915] text-white font-bold py-4 rounded-xl shadow-lg text-lg active:scale-95 transition-transform"
                         >
                           {t('common:common.search', 'Update Search')}
                         </button>

                      </div>
                    </div>
                  )}
                </div>

            {/* Auth & Settings - Desktop Only (Hidden on Mobile as it's now in top bar) */}
            <div className="hidden md:flex items-center gap-4 shrink-0 text-white">
               {/* Desktop Only Currency/Language */}
               <div className="hidden md:flex items-center gap-4">
                  <CurrencySelector variant="light" />
                  <button
                    onClick={toggleLanguage}
                    className="text-sm font-medium hover:text-orange-100 flex items-center gap-1"
                  >
                      <span className="font-bold">{i18n.language.toUpperCase()}</span>
                      <ChevronDownIcon className="w-3 h-3" />
                  </button>
                  <div className="h-4 w-px bg-white/30"></div>
               </div>
               {!user ? (
                  <>
                     <Link to="/login" className="text-sm font-medium hover:text-orange-100">{t('common:nav.login', 'Sign In')}</Link>
                     <Link to="/register" className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors">
                        {t('common:nav.register', 'Register')}
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
                         {user.name?.split(' ')[0]}
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
                       <span className="hidden sm:inline text-sm font-medium">{t('nav.logout', 'Logout')}</span>
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 md:mt-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-4 md:mb-6">
           <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mb-2 md:mb-1">
                 <h1 className="text-2xl md:text-3xl font-bold text-orange-500 leading-tight">{(i18n.language === 'ar' && (hotel as any).nameAr) ? (hotel as any).nameAr : hotel.name}</h1>
                 <div className="flex items-center mt-1 md:mt-0">{renderStars((hotel as any).propertyClass || Math.round((hotel.rating || 0) / 2))}</div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 mb-2">
                  <MapPinIcon className="h-4 w-4 text-orange-500 flex-shrink-0" />
                  <span>{hotel.address}</span>
                  {hotel.city && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-blue-600 font-medium">{hotel.city}</span>
                    </>
                  )}
                  {(hotel as any).country && (
                    <>
                      <span className="mx-1">•</span>
                      <span className="text-gray-500">{(hotel as any).country}</span>
                    </>
                  )}
                  <span className="mx-1">•</span>
                  <button onClick={() => setShowMapModal(true)} type="button" className="text-blue-600 underline hover:text-blue-700">{t('common:hotels.showOnMap', 'Show on map')}</button>
               </div>

              <div className="flex items-center gap-4">
                 {/* Only show rating if there are actual reviews */}
                 {(() => {
                   const taRating = taHeaderRating?.rating;
                   const taReviews = taHeaderRating?.num_reviews ? Number(taHeaderRating.num_reviews) : 0;
                   const ratingValue = taRating ? taRating * 2 : (hotel.reviewScore || hotel.rating);
                   const displayScore = formatNumber(ratingValue, i18n.language === 'ar');
                   const displayReviews = taReviews > 0 ? taReviews : hotel.reviewCount;
                   const hasRating = taRating || hotel.reviewScore || hotel.rating;

                   if (hasRating) {
                     // Score word on 10-point scale for both TA and native
                     const ratingOn10 = taRating ? taRating * 2 : (hotel.reviewScore || hotel.rating || 0);
                     const scoreWord = hotel.reviewScoreWord || (ratingOn10 >= 9 ? 'Excellent' : ratingOn10 >= 8 ? 'Very Good' : ratingOn10 >= 7 ? 'Good' : 'Pleasant');

                     return (
                       <>
                         <span className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-bold">
                           {displayScore}
                         </span>
                         <span className="font-bold text-gray-800">
                           {scoreWord}
                         </span>
                         <span className="text-gray-500 text-sm">
                           {displayReviews} {t('common:hotels.reviews', 'reviews')}
                         </span>
                         <div className="h-4 w-px bg-gray-300 mx-2"></div>
                       </>
                     );
                   }

                   return (
                     <>
                       <span className="text-gray-500 text-sm italic">
                         {t('common:hotels.noReviews', 'No reviews yet')}
                       </span>
                       <div className="h-4 w-px bg-gray-300 mx-2"></div>
                     </>
                   );
                 })()}
              </div>

              {/* Share, Save & Price Watch Actions */}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <ShareSaveActions
                  hotelId={hotelId || ''}
                  hotelName={hotel.name}
                  hotelImage={hotel.images?.[0]}
                  isFavorite={isFavorite}
                  onToggleFavorite={() => {
                    const newState = toggleFavoriteWithData(hotelId || '', hotel.name, hotel.images?.[0]);
                    setIsFavorite(newState);
                  }}
                />
                {/* Price Watch Button */}
                <PriceWatchButton
                  hotelId={hotelId || ''}
                  hotelName={hotel.name}
                  hotelImage={hotel.images?.[0]}
                  destination={bookingParams.destination || hotel.city || ''}
                  checkIn={bookingParams.checkIn}
                  checkOut={bookingParams.checkOut}
                  adults={bookingParams.adults}
                  children={bookingParams.children}
                  currentPrice={lowestPrice}
                  currency={currency}
                  size="md"
                />
              </div>
           </div>

           {/* Price & Book Button (Right Side) - Only show if rates available */}
           {hotel.rates && hotel.rates.length > 0 && (
           <div className="hidden md:flex flex-col items-end">
              <div className="flex items-baseline mb-2">
                 <span className="text-gray-500 text-lg ltr:mr-2 rtl:ml-2">{t('common:hotels.from', 'From')}</span>
                 <span className="text-3xl font-bold text-black font-price">
                    {new Intl.NumberFormat(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
                       style: 'currency',
                       currency: currency || 'USD',
                       minimumFractionDigits: 0,
                       maximumFractionDigits: 0,
                    }).format(lowestPrice)}
                 </span>
              </div>
              <button
                 onClick={() => document.getElementById('room-selection')?.scrollIntoView({ behavior: 'smooth' })}
                 className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors"
              >
                 {t('common:hotels.selectRoom', 'Select a room')}
              </button>
           </div>
           )}
        </div>

        {/* Gallery Section - New Design */}
        {/* Gallery Section - New Design */}
        {/* Gallery Section - Modern Bento CSS Grid */}
        {/* Gallery Section - Modern Bento CSS Grid */}
        <div className="w-full mb-4 md:mb-8">
            <div className={`relative grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] md:h-[500px] rounded-xl overflow-hidden`}>

              {/* Main Image - Takes full height on left half (2 cols, 2 rows) */}
              <div
                className={`relative cursor-pointer overflow-hidden bg-gray-200 group md:col-span-2 md:row-span-2 ${hotelImages.length === 1 ? 'col-span-full row-span-full' : ''}`}
                onClick={() => { setSelectedImageIndex(0); setShowAllPhotos(true); }}
              >
                <LazyImage
                  src={hotelImages[0]}
                  alt={hotel.name}
                  className="w-full h-full transition-transform duration-700 group-hover:scale-105"
                  priority={true}
                  objectFit="cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Secondary Images - Hidden on mobile, shown on grid for md+ */}
              {hotelImages.slice(1, 5).map((img : string, idx: number) => (
                 <div
                   key={idx}
                   className="hidden md:block relative cursor-pointer overflow-hidden bg-gray-200 group"
                   onClick={() => { setSelectedImageIndex(idx + 1); setShowAllPhotos(true); }}
                 >
                   <LazyImage
                     src={getResizedImageUrl(img, '640x400')}
                     alt={`View ${idx + 2}`}
                     className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                     loading="lazy"
                     objectFit="cover"
                     sizes="(max-width: 768px) 0vw, 25vw"
                   />

                   {/* Overlay for the last visible grid item if there are more photos */}
                   {idx === 3 && hotelImages.length > 5 && (
                     <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex flex-col items-center justify-center text-white backdrop-blur-[1px]">
                        <span className="text-2xl font-bold">+{hotelImages.length - 5}</span>
                        <span className="text-sm font-medium">{t('common:hotels.photos', 'Photos')}</span>
                     </div>
                   )}
                 </div>
              ))}

              {/* Mobile View All Button (if hidden images exist) */}
              <div className="md:hidden absolute bottom-4 right-4 z-10">
                 <button
                   onClick={() => setShowAllPhotos(true)}
                   className="bg-white/90 backdrop-blur text-gray-800 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2"
                 >
                   <PhotoIcon className="w-4 h-4" />
                   {t('common:common.viewAll', 'View All')}
                 </button>
              </div>

            </div>

            {/* Fallback for very few images (desktop fix) - if we have 2, 3, or 4 images total, we need to ensure the empty grid cells don't look broken */}
            {/* The CSS Grid above automatically handles 1 image. For 2-4 images, we might want to conditionally render a simpler layout, but the current grid will just leave empty spots or we can use dynamic classes.
                Let's make it robust by actually rendering simple placeholders or just changing the class if needed.
                Actually, slicing safe handles missing images, they just won't render.
                But to prevent white space, we should ideally change the col-span if images are missing.
            */}
        </div>

        {/* Exclusive Banner */}
        <div className="bg-gradient-to-r from-orange-400 to-orange-300 rounded-lg p-3 md:p-4 mb-6 md:mb-8 flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm relative overflow-hidden gap-3 md:gap-0">
           <div className="relative z-10 flex flex-col md:flex-row md:items-center text-white gap-2 md:gap-4">
              <span className="bg-red-500 text-white font-bold px-3 py-1 rounded text-sm uppercase shadow-sm w-fit animate-pulse">
                {t('common:common.joinNow', 'Join now')}
              </span>
              <span className="font-bold text-base md:text-lg leading-snug">
                {t('hotels.exclusivePrices', 'Exclusive prices for Gaith Tours members')}
              </span>
           </div>
           {/* Decoration */}
           <div className="absolute right-0 bottom-0 opacity-20 transform translate-y-1/4 translate-x-1/4">
              <img src="/airplane-icon.png" className="w-32 h-32" alt="" />
           </div>
        </div>

        {/* Property Description */}
        <div className="mb-6 md:mb-10">
           <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-3 md:mb-4">{t('hotels.propertyDescription', 'Property Description')}</h2>
           <p className="text-gray-700 leading-relaxed max-w-4xl text-sm md:text-base">
              {hotel.description}
           </p>
        </div>

        {/* Amenities Section */}
        <div className="mb-6 md:mb-10">
           <div className="flex justify-between items-center mb-4 md:mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('common:hotels.amenities', 'Amenities')}</h2>
              {hotel.amenities && hotel.amenities.length > 12 && (
                <button
                  onClick={() => setShowAmenitiesModal(true)}
                  className="text-orange-500 font-bold hover:underline"
                >
                  {t('common:common.viewAll', 'View All')}
                </button>
              )}
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-4 gap-x-4 md:gap-x-8">
              {hotel.amenities?.slice(0, 12).map((amenity, idx) => (
                 <div key={idx} className="flex items-center text-gray-700 min-w-0">
                    <div className="w-6 md:w-8 shrink-0">{getAmenityIcon(amenity)}</div>
                    <span className="text-xs md:text-sm font-medium truncate">{amenity}</span>
                 </div>
              ))}
           </div>
           {hotel.amenities && hotel.amenities.length > 12 && (
              <button
                onClick={() => setShowAmenitiesModal(true)}
                className="mt-4 text-orange-500 font-medium hover:underline text-sm"
              >
                 +{hotel.amenities.length - 12} {t('common:common.more', 'more')}
              </button>
           )}
        </div>



        {/* Amenities Modal */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col relative animate-fadeIn">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="text-2xl font-bold text-gray-800">{t('common:hotels.amenities', 'Amenities')}</h3>
                   <button
                      onClick={() => setShowAmenitiesModal(false)}
                      className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                   >
                      <XMarkIcon className="w-6 h-6 text-gray-600" />
                   </button>
                </div>

                <div className="p-8 overflow-y-auto">
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {hotel.amenities?.map((amenity, idx) => (
                         <div key={idx} className="flex items-center text-gray-700 p-2 hover:bg-gray-50 rounded-lg transition-colors">
                            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center mr-3 flex-shrink-0 text-orange-500">
                               {getAmenityIcon(amenity)}
                            </div>
                            <span className="font-medium">{amenity}</span>
                         </div>
                      ))}
                   </div>
                </div>
              </div>
           </div>
        )}

        {/* Hotel Area Info - Nearby POI (lazy-loaded, below fold) */}
        {(hotel as any).poi_data && (
          <LazySection height="200px" skeleton="simple">
            <HotelAreaInfo
              poiData={(hotel as any).poi_data}
              neighborhoodDescription={t('hotels.neighborhoodInfo', 'Guests loved walking around the neighborhood!')}
              onShowMap={() => setShowMapModal(true)}
            />
          </LazySection>
        )}

        {/* Active Search Bar for Availability (Updates content in place) */}
        <div className="mb-8 border-2 border-orange-400 rounded-lg p-1 flex flex-col md:flex-row bg-white">
           {/* Date Picker Section */}
           <div className="flex-1 flex items-center px-4 py-2 border-b md:border-b-0 md:border-r border-gray-100 relative">
              <CalendarIcon className="w-5 h-5 text-gray-500 ltr:mr-3 rtl:ml-3" />
              <div className="w-full relative">
                 {/* Mobile Overlay to trigger Modal */}
                 <div
                    className="absolute inset-0 z-10 md:hidden"
                    onClick={() => setShowMobileDateModal(true)}
                 ></div>

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
                     placeholderText={t('hotelDetails:dates.checkInCheckOut', "Check-in - Check-out")}
                     className="w-full border-none p-0 text-gray-900 font-medium focus:ring-0 text-sm placeholder-gray-400"
                     dateFormat="EEE, MMM d"
                     locale={i18n.language === 'ar' ? 'ar' : 'en'}
                     customInput={
                        <input
                           readOnly
                           className="w-full border-none p-0 text-gray-900 font-medium focus:ring-0 text-sm placeholder-gray-400 bg-transparent cursor-pointer"
                           value={
                              checkInDate && checkOutDate
                                 ? i18n.language === 'ar'
                                    ? `${format(checkInDate, 'EEEE، d MMMM', { locale: ar })} - ${format(checkOutDate, 'EEEE، d MMMM', { locale: ar })}`
                                    : `${format(checkInDate, 'EEE, MMM d', { locale: en })} - ${format(checkOutDate, 'EEE, MMM d', { locale: en })}`
                                 : (checkInDate
                                    ? i18n.language === 'ar'
                                       ? `${format(checkInDate, 'EEEE، d MMMM', { locale: ar })} - ${t('hotelDetails:dates.selectCheckout', 'Select checkout')}`
                                       : `${format(checkInDate, 'EEE, MMM d', { locale: en })} - ${t('hotelDetails:dates.selectCheckout', 'Select checkout')}`
                                    : '')
                           }
                        />
                     }
                  />
              </div>
           </div>

           {/* Guest Selector Section */}
           <div className="flex-1 flex items-center px-4 py-2 relative">
             <UserIcon className="w-5 h-5 text-gray-500 ltr:mr-3 rtl:ml-3" />
             <div className="flex-1">
                <button
                  onClick={() => setShowGuestPopover(!showGuestPopover)}
                  className="w-full text-left font-medium text-sm text-gray-900"
                >
                   {guestCounts.adults} {t('hotelDetails:guests.adults', 'adults')} · {guestCounts.children} {t('hotelDetails:guests.children', 'children')} · {guestCounts.rooms} {t('hotelDetails:guests.rooms', 'room')}
                </button>
             </div>
             <ChevronDownIcon className="w-4 h-4 text-gray-400 ml-2" />

             {/* Reusing existing Guest Popover Logic but positioned for this bar */}
             {showGuestPopover && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 text-gray-800">
                   <div className="space-y-4">
                      {/* Adults */}
                      <div className="flex justify-between items-center">
                         <span className="font-semibold text-sm">{t('hotelDetails:guests.adults', 'Adults')}</span>
                         <div className="flex items-center gap-3">
                            <button onClick={() => setGuestCounts(p => ({...p, adults: Math.max(1, p.adults - 1)}))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><MinusIcon className="w-3 h-3" /></button>
                            <span className="w-4 text-center font-bold text-sm">{guestCounts.adults}</span>
                            <button onClick={() => setGuestCounts(p => ({...p, adults: Math.min(30, p.adults + 1)}))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><PlusIcon className="w-3 h-3" /></button>
                         </div>
                      </div>
                      {/* Children */}
                      <div className="flex justify-between items-center">
                         <span className="font-semibold text-sm">{t('hotelDetails:guests.children', 'Children')}</span>
                         <div className="flex items-center gap-3">
                            <button onClick={() => setGuestCounts(p => ({
                                ...p,
                                children: Math.max(0, p.children - 1),
                                childrenAges: p.childrenAges.slice(0, -1)
                            }))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><MinusIcon className="w-3 h-3" /></button>
                            <span className="w-4 text-center font-bold text-sm">{guestCounts.children}</span>
                            <button onClick={() => setGuestCounts(p => ({
                                ...p,
                                children: Math.min(10, p.children + 1),
                                childrenAges: [...(p.childrenAges || []), 5]
                            }))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><PlusIcon className="w-3 h-3" /></button>
                         </div>
                      </div>

                      {/* Child Ages */}
                      {guestCounts.children > 0 && (
                          <div className="pt-2 border-t border-gray-100 max-h-32 overflow-y-auto">
                              <p className="text-xs font-semibold text-gray-500 mb-2">{t('hotelDetails:guests.ages', 'Age at check-in')}</p>
                              <div className="grid grid-cols-2 gap-2">
                                  {guestCounts.childrenAges?.map((age, idx) => (
                                      <div key={idx} className="flex flex-col">
                                          <label className="text-[10px] text-gray-500 mb-0.5">{t('hotelDetails:guests.children', 'Child')} {idx + 1}</label>
                                          <select
                                            value={age}
                                            onChange={(e) => {
                                                const newAges = [...(guestCounts.childrenAges || [])];
                                                newAges[idx] = parseInt(e.target.value);
                                                setGuestCounts(p => ({...p, childrenAges: newAges}));
                                            }}
                                            className="w-full text-xs py-1 px-1 border border-gray-200 rounded focus:border-orange-500 focus:ring-0"
                                          >
                                              {[...Array(18)].map((_, i) => (
                                                  <option key={i} value={i}>{i} {i === 1 ? t('hotelDetails:guests.yearAbbr', 'yr') : t('hotelDetails:guests.yearsAbbr', 'yrs')}</option>
                                              ))}
                                          </select>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                      {/* Rooms */}
                      <div className="flex justify-between items-center">
                         <span className="font-semibold text-sm">{t('hotelDetails:guests.rooms', 'Rooms')}</span>
                         <div className="flex items-center gap-3">
                            <button onClick={() => setGuestCounts(p => ({...p, rooms: Math.max(1, p.rooms - 1)}))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><MinusIcon className="w-3 h-3" /></button>
                            <span className="w-4 text-center font-bold text-sm">{guestCounts.rooms}</span>
                            <button onClick={() => setGuestCounts(p => ({...p, rooms: Math.min(10, p.rooms + 1)}))} className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-gray-50"><PlusIcon className="w-3 h-3" /></button>
                         </div>
                      </div>
                      <button onClick={() => setShowGuestPopover(false)} className="w-full bg-orange-500 text-white font-bold py-2 rounded-lg text-sm mt-2">{t('common.done', 'Done')}</button>
                   </div>
                </div>
             )}
           </div>

           {/* Update Button */}
           <button
             onClick={() => {
                // Determine which search handler to use based on context or create a local one
                // Since handleUpdateSearch redirects to /hotels/search, we need a local update
                // that pushes to CURRENT history instead.

                const params = new URLSearchParams(location.search);
                params.set('checkIn', checkInDate?.toISOString().split('T')[0] || '');
                params.set('checkOut', checkOutDate?.toISOString().split('T')[0] || '');
                params.set('adults', guestCounts.adults.toString());
                params.set('children', guestCounts.children > 0 ? (guestCounts.childrenAges?.join(',') || '') : '');
                params.set('rooms', guestCounts.rooms.toString());

                // Push to current path (Hotel Details) to trigger re-fetch via useEffect
                history.push({
                   pathname: location.pathname,
                   search: params.toString()
                });
             }}
             className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-3 md:py-0 md:rounded-r-md rounded-b-md md:rounded-bl-none transition-colors whitespace-nowrap"
           >
              {t('common:common.changeSearch', 'Change search')}
           </button>
        </div>

        {/* Room Selection */}
        <div id="room-selection" className="mb-12">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('common:hotels.availableRooms', 'Available Rooms')}</h2>
           </div>

           {Object.keys(groupedRates).length > 0 ? (
              <div className="space-y-6">
                 {Object.keys(groupedRates).map((roomName) => (
                    <RoomCard
                       key={roomName}
                       roomType={roomName}
                       rates={groupedRates[roomName]}
                       onSelectResult={handleRateSelect}
                       selectedRates={selectedRates}
                       nights={numberOfNights}
                       adults={guestCounts.adults}
                       children={guestCounts.children}
                       onToggleCompare={handleToggleCompare}
                       comparedRates={new Set(comparedRooms.keys())}
                    />
                 ))}
              </div>
           ) : (
              <div className="text-center py-12 bg-gradient-to-b from-orange-50 to-white rounded-2xl border border-orange-100 shadow-sm">
                 {/* Icon */}
                 <div className="w-20 h-20 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                 </div>

                 {/* Title */}
                 <h3 className="text-xl font-bold text-gray-800 mb-2">
                    {t('hotels.noRoomsTitle', 'No rooms available for tonight')}
                 </h3>

                 {/* Description */}
                 <p className="text-gray-500 mb-6 max-w-md mx-auto">
                    {t('hotels.noRoomsDescription', 'This hotel may not accept same-day bookings or all rooms are sold out for today. Please try searching for a different date.')}
                 </p>

                 {/* Action Button */}
                 <button
                    onClick={() => history.push('/')}
                    className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors inline-flex items-center gap-2"
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {t('hotels.searchDifferentDates', 'Search for different dates')}
                 </button>
              </div>
           )}
        </div>

        {/* Guest Reviews Section (lazy — below fold) */}
        <LazySection height="300px" skeleton="simple">
          <GuestReviews
            rating={hotel.reviewScore || hotel.rating || null}
            reviewCount={hotel.reviewCount || 0}
            detailedRatings={(hotel as any).detailed_ratings}
            reviews={(hotel as any).reviews}
          />
        </LazySection>

        {/* TripAdvisor Reviews Section (lazy — defers API call until visible) */}
        <LazySection height="300px" skeleton="simple">
          <TripAdvisorReviews
            hotelName={hotel.name}
            city={hotel.city || bookingParams.destination}
          />
        </LazySection>

        {/* Hotel Policies Section */}
        <div className="mb-12">
          <HotelPoliciesCard
            checkInTime={hotel.checkIn || undefined}
            checkOutTime={hotel.checkOut || undefined}
            metapolicyInfo={(hotel as any).metapolicy_extra_info || undefined}
            metapolicyStruct={(hotel as any).metapolicy_struct || undefined}
            policyStruct={(hotel as any).policy_struct || undefined}
          />
        </div>

        {/* Similar Hotels Section (lazy — defers API call until visible) */}
        <LazySection height="250px" skeleton="hotel-cards">
          <div className="mb-12">
            <SimilarHotels
              city={hotel.city || bookingParams.destination}
              currentHotelId={hotelId || ''}
              checkIn={bookingParams.checkIn}
              checkOut={bookingParams.checkOut}
              adults={bookingParams.adults}
              children={bookingParams.children}
            />
          </div>
        </LazySection>

        {/* Sticky Mobile Book Button */}
        {selectedRates.size > 0 && (
           <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg md:hidden z-50 flex justify-between items-center">
              <div>
                 <div className="text-xs text-gray-500">{selectedRates.size} {t('hotels.roomsSelected', 'rooms selected')}</div>
              </div>
              <button
                 onClick={handleBookNow}
                 className="bg-orange-500 text-white font-bold py-2 px-6 rounded-lg shadow-sm"
              >
                 {t('common:common.reserve', 'Reserve')}
              </button>
           </div>
        )}

        {/* Single Reserve Button Floating Action (Desktop) */}
        {selectedRates.size > 0 && (
          <div className="hidden md:block fixed bottom-8 right-8 z-50">
             <button
                onClick={handleBookNow}
                className="bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold py-4 px-8 rounded-full shadow-2xl transition-transform hover:scale-105 flex items-center gap-2 animate-fadeIn"
             >
                <span>{t('common:common.reserve', 'Reserve')} ({selectedRates.size})</span>
                <ArrowLeftIcon className={`w-5 h-5 ${isRTL ? '' : 'rotate-180'}`} />
             </button>
          </div>
        )}

        {/* Full Screen Photo Gallery Modal (Reusing existing logic) */}
        {showAllPhotos && (
          <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
             {/* ... (Existing modal code optimized) ... */}
             <div className="relative w-full h-full max-w-6xl flex flex-col items-center justify-center">
               <button onClick={() => setShowAllPhotos(false)} className="absolute top-4 right-4 text-white z-50 p-2 bg-white/10 rounded-full hover:bg-white/20">
                  <XMarkIcon className="h-8 w-8" />
               </button>

               <div className="relative w-full flex-1 flex items-center justify-center">
                  <LazyImage
                    src={hotelImages[selectedImageIndex]}
                    className="max-h-[85vh] max-w-full"
                    alt={`${hotel.name} - Image ${selectedImageIndex + 1}`}
                    priority={true}
                    objectFit="contain"
                  />

                  <button onClick={() => setSelectedImageIndex((i) => i > 0 ? i - 1 : hotelImages.length - 1)} className="absolute left-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white">
                     <ArrowLeftIcon className="h-8 w-8" />
                  </button>
                  <button onClick={() => setSelectedImageIndex((i) => i < hotelImages.length - 1 ? i + 1 : 0)} className="absolute right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 text-white">
                     <ArrowLeftIcon className="h-8 w-8 rotate-180" />
                  </button>
               </div>

               {/* Thumbnails strip */}
               <div className="h-24 w-full overflow-x-auto flex gap-2 p-2 justify-center">
                  {hotelImages.map((img: string, idx: number) => (
                     <div
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`h-full w-auto cursor-pointer rounded border-2 ${selectedImageIndex === idx ? 'border-orange-500' : 'border-transparent opacity-60'}`}
                        style={{ minWidth: '120px' }}
                     >
                        <LazyImage
                           src={getResizedImageUrl(img, 'x220')}
                           className="h-full w-auto"
                           alt={`Thumbnail ${idx + 1}`}
                           loading="lazy"
                           objectFit="cover"
                        />
                     </div>
                  ))}
               </div>
             </div>
          </div>
        )}

      </div>
      {/* Mobile Date Selection Modal */}
      {showMobileDateModal && (
        <div className="fixed inset-0 z-[1000] bg-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-bold text-gray-900">{t('hotelDetails:dates.selectDates', 'Select Dates')}</h2>
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
                onChange={(dates: [Date | null, Date | null]) => {
                const [start, end] = dates;
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
                        {Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))} {t('hotelDetails:dates.nightsSelected', 'nights selected')}
                    </span>
                ) : (
                    t('hotelDetails:dates.selectCheckInCheckOut', 'Select check-in and check-out dates')
                )}
                </div>
            </div>

            <div className="p-4 border-t bg-white safe-area-bottom">
            <button
                onClick={() => setShowMobileDateModal(false)}
                className="w-full bg-[#E67915] text-white font-bold py-3.5 rounded-xl hover:bg-orange-600 active:scale-95 transition-all shadow-lg text-lg"
            >
                {t('common.done', 'Done')}
            </button>
            </div>
        </div>
      )}

      {/* Comparison Floating Button */}
      {comparedRooms.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-4 animate-in slide-in-from-bottom duration-200">
            <span className="font-medium">
              {comparedRooms.size} {t('compare.roomsSelected', 'rooms selected')}
            </span>
            <div className="h-4 w-px bg-gray-600"></div>
            <button
              onClick={() => setShowCompareRooms(true)}
              disabled={comparedRooms.size < 2}
              className={`font-bold ${comparedRooms.size >= 2 ? 'text-orange-400 hover:text-orange-300' : 'text-gray-500 cursor-not-allowed'}`}
            >
              {t('compare.compare', 'Compare')}
            </button>
            <button
              onClick={() => setComparedRooms(new Map())}
              className="text-gray-400 hover:text-white"
            >
              {t('compare.clear', 'Clear')}
            </button>
        </div>
      )}

      {/* Comparison Modal (lazy-loaded — only downloaded when user clicks Compare) */}
      {showCompareRooms && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" /></div>}>
          <CompareRooms
              rooms={Array.from(comparedRooms.values())}
              onClose={() => setShowCompareRooms(false)}
              onSelect={(room) => {
                handleRateSelect(room, 1);
                setShowCompareRooms(false);
              }}
              currencySymbol={currencySymbol}
          />
        </Suspense>
      )}

      {/* Map Modal */}
      {showMapModal && (() => { initLeaflet(); return true; })() && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col relative overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                 <h3 className="text-xl font-bold text-gray-900">{(i18n.language === 'ar' && (hotel as any).nameAr) ? (hotel as any).nameAr : hotel.name}</h3>
                 <p className="text-sm text-gray-500">{hotel.address}</p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Map — Leaflet loaded on demand */}
            <div className="flex-1 relative">
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full" /></div>}>
               <LazyMapContainer
                 center={[hotel.coordinates.latitude, hotel.coordinates.longitude]}
                 zoom={15}
                 scrollWheelZoom={true}
                 style={{ height: '100%', width: '100%' }}
               >
                 <LazyTileLayer
                   attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                   url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                 />
                 <LazyMarker position={[hotel.coordinates.latitude, hotel.coordinates.longitude]}>
                   <LazyPopup>
                     <div className="font-bold text-sm">{hotel.name}</div>
                     <div className="text-xs text-gray-600">{hotel.address}</div>
                   </LazyPopup>
                 </LazyMarker>
               </LazyMapContainer>
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
