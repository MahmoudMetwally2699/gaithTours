import React, { useState, useEffect, useMemo } from 'react';
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
  PlusIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Hotel } from '../types/hotel';
import { getHotelDetails } from '../services/hotelService';
import { RoomCard } from '../components/RoomCard';
import { PriceBreakdownCard } from '../components/PriceBreakdownCard';
import { CancellationPolicyCard } from '../components/CancellationPolicyCard';
import { HotelPoliciesCard } from '../components/HotelPoliciesCard';
import { LazyImage } from '../components/LazyImage';
import { smartPreload, clearPreloadLinks } from '../utils/imagePreloader';
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelector } from '../components/CurrencySelector';
import { GuestReviews } from '../components/GuestReviews';

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
  const { t, i18n } = useTranslation();
  const { hotelId } = useParams<HotelDetailsParams>();
  const history = useHistory();
  const location = useLocation();
  const { user, logout } = useAuth();

  // Check if current language is RTL
  const isRTL = i18n.language === 'ar';
  const { currency } = useCurrency();

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
  }, [location.search]);


  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [selectedRates, setSelectedRates] = useState<Map<string, number>>(new Map()); // match_hash -> count

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleUpdateSearch = () => {
    if (!checkInDate || !checkOutDate) return;

    const params = new URLSearchParams(location.search);
    params.set('checkIn', checkInDate.toISOString().split('T')[0]);
    params.set('checkOut', checkOutDate.toISOString().split('T')[0]);
    params.set('rooms', guestCounts.rooms.toString());
    params.set('adults', guestCounts.adults.toString());
    if (guestCounts.childrenAges && guestCounts.childrenAges.length > 0) {
      params.set('children', guestCounts.childrenAges.join(','));
    } else {
      params.set('children', '');
    }

    history.push({
       pathname: location.pathname,
       search: params.toString()
    });

    // The main useEffect for fetching hotel details will trigger automatically due to location.search dependency
  };

  // Function to get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    const className = "h-5 w-5 text-gray-700";
    if (lower.includes('wifi') || lower.includes('internet')) return <WifiIcon className={className} />;
    if (lower.includes('pool')) return <LifebuoyIcon className={className} />;
    if (lower.includes('gym') || lower.includes('fitness')) return <UserGroupIcon className={className} />;
    if (lower.includes('restaurant')) return <CakeIcon className={className} />;
    if (lower.includes('spa')) return <SparklesIcon className={className} />;
    if (lower.includes('room service')) return <ClockIcon className={className} />;
    if (lower.includes('bar') || lower.includes('lounge')) return <div className="h-5 w-5 text-gray-700 flex items-center justify-center"><CakeIcon className={className} /></div>;
    return <CheckIcon className={className} />;
  };

   // Fetch real hotel data from API
  useEffect(() => {
    const fetchHotelDetails = async () => {
      if (!hotelId) {
        setError('Hotel ID is required');
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
          currency: currency
        });

        // Transform the API response to match our Hotel interface
        const transformedHotel: Hotel = {
          id: hotelData.id || hotelId,
          name: hotelData.name || 'Hotel Name Not Available',
          address: hotelData.address || 'Address not available',
          city: hotelData.city || bookingParams.destination || '',
          country: hotelData.country || 'Saudi Arabia',
          price: 0,
          currency: currency,
          rating: hotelData.rating || hotelData.reviewScore || 0,
          image: hotelData.images?.[0] || hotelData.mainImage || null,
          images: hotelData.images || (hotelData.mainImage ? [hotelData.mainImage] : []),
          description: hotelData.description || '',
          reviewScore: hotelData.reviewScore || hotelData.rating || 0,
          reviewCount: hotelData.reviewCount || 0,
          amenities: hotelData.amenities || [],
          facilities: hotelData.facilities || [],
          propertyClass: hotelData.propertyClass || 0,
          reviewScoreWord: hotelData.reviewScoreWord || null,
          isPreferred: hotelData.isPreferred || false,
          checkIn: hotelData.check_in_time || hotelData.checkInTime || null,
          checkOut: hotelData.check_out_time || hotelData.checkOutTime || null,
          coordinates: hotelData.coordinates || { latitude: 0, longitude: 0 },
          rates: hotelData.rates || [],
          metapolicy_extra_info: hotelData.metapolicy_extra_info || '',
          metapolicy_struct: hotelData.metapolicy_struct || null,
          // Review data from hotel_reviews collection
          detailed_ratings: hotelData.detailed_ratings || null,
          reviews: hotelData.reviews || []
        } as Hotel & { detailed_ratings?: any; reviews?: any[] };

        setHotel(transformedHotel);

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
        setError(err.message || 'Failed to load hotel details');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetails();
  }, [hotelId, bookingParams.checkIn, bookingParams.checkOut, bookingParams.adults, bookingParams.children, bookingParams.destination, currency]);

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
       alert(t('hotels.selectRoomFirst', 'Please select a room first'));
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
     return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  if (error || !hotel) {
     return <div className="text-center py-20 text-red-500">{error || 'Hotel not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      {/* Header Section - Same as Search Results */}
      {/* Compact Header Section */}
      <div className="relative w-full bg-[#E67915] shadow-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-4">

            {/* Logo & Brand */}
            <div className="flex items-center gap-6 shrink-0">
               <a href="/" className="flex-shrink-0">
                 <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-10 w-auto brightness-0 invert" />
               </a>
            </div>

            {/* Compact Search Bar - Editable */}
            <div className="flex-1 max-w-3xl w-full">
               <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20 flex items-center relative gap-1">

                  {/* Destination */}
                  <div className="flex-[1.2] px-4 border-r border-white/20 flex items-center gap-2 min-w-0">
                     <MapPinIcon className="h-4 w-4 text-white/80 shrink-0" />
                     <div className="flex flex-col min-w-0 overflow-hidden w-full">
                        <span className="text-white text-xs font-medium opacity-70 truncate">{t('common.destination', 'Destination')}</span>
                        <input
                           type="text"
                           // Use hotel city if destination param is missing, with fallback
                           value={bookingParams.destination || (hotel && hotel.city) || ''}
                           placeholder={loading ? "Loading..." : "Destination"}
                           readOnly
                           className="bg-transparent border-none p-0 text-white text-sm font-semibold placeholder-white/50 focus:ring-0 w-full truncate cursor-default"
                        />
                     </div>
                  </div>

                  {/* Dates - Unified Range Picker */}
                  <div className="flex-[2] px-4 border-r border-white/20 flex items-center gap-2">
                     <ClockIcon className="h-4 w-4 text-white/80 shrink-0" />
                     <div className="flex flex-col w-full">
                        <span className="text-white text-xs font-medium opacity-70">Check-in - Check-out</span>
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
                                       : (checkInDate ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - Select checkout` : 'Select dates')
                                    }
                                    readOnly
                                    className="bg-transparent border-none p-0 text-white text-sm font-semibold w-full focus:ring-0 cursor-pointer"
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
                           <span className="text-white text-xs font-medium opacity-70">{t('common.guests', 'Guests')}</span>
                           <span className="text-white text-sm font-semibold truncate">
                              {guestCounts.adults + guestCounts.children} Guests, {guestCounts.rooms} Rm
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
                                 <span className="font-medium text-sm">Rooms</span>
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
                                 <span className="font-medium text-sm">Adults</span>
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
                                    <span className="font-medium text-sm">Children</span>
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
                                 className="w-full mt-4 bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition-colors"
                                 onClick={() => setShowGuestPopover(false)}
                              >
                                 Done
                              </button>
                           </div>
                        </>
                     )}
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleUpdateSearch}
                    className="bg-white text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors ml-2 shadow-sm shrink-0"
                    title={t('common.search', 'Update Search')}
                  >
                     <MagnifyingGlassIcon className="w-5 h-5 stroke-[2.5]" />
                  </button>
               </div>
            </div>

            {/* Auth & Settings */}
            <div className="flex items-center gap-4 shrink-0 text-white">
               <CurrencySelector variant="light" />
               <button className="text-sm font-medium hover:text-orange-100 flex items-center gap-1">
                  <img src="/saudi-flag.png" alt="AR" className="w-5 h-3 object-cover rounded shadow-sm" onError={(e) => e.currentTarget.style.display='none'} />
                  <span>AR</span>
               </button>
               <div className="h-4 w-px bg-white/30"></div>
               {!user ? (
                  <>
                     <Link to="/login" className="text-sm font-medium hover:text-orange-100">Sign In</Link>
                     <Link to="/register" className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors">
                        Register
                     </Link>
                  </>
               ) : (
                  <div className="flex items-center space-x-4 rtl:space-x-reverse text-white">
                     <Link to="/profile" className="font-medium hover:text-orange-200 transition-colors">
                       {user.name}
                     </Link>
                     <button onClick={logout} className="text-sm opacity-80 hover:opacity-100">
                       {t('nav.logout', 'Logout')}
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start mb-6">
           <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                 <h1 className="text-3xl font-bold text-orange-500">{hotel.name}</h1>
                 <div className="flex items-center">{renderStars(hotel.rating)}</div>
              </div>

              <div className="flex items-center text-sm text-gray-600 mb-4">
                 <MapPinIcon className="h-4 w-4 mr-1 text-orange-500" />
                 <span>{hotel.address}</span>
                 <span className="mx-2">•</span>
                 <a href="#" className="text-blue-600 underline">{hotel.city}</a>
                 <span className="mx-2">•</span>
                 <a href="#" className="text-blue-600 underline">{t('hotels.showOnMap', 'Show on map')}</a>
              </div>

              <div className="flex items-center gap-4">
                 <span className="bg-orange-500 text-white px-2 py-1 rounded text-sm font-bold">
                    {hotel.reviewScore || hotel.rating}
                 </span>
                 <span className="font-bold text-gray-800">
                    {hotel.reviewScoreWord || 'Very Good'}
                 </span>
                 <span className="text-gray-500 text-sm">
                    {hotel.reviewCount} {t('hotels.reviews', 'reviews')}
                 </span>

                 <div className="h-4 w-px bg-gray-300 mx-2"></div>

                 <button className="flex items-center text-gray-500 hover:text-gray-700">
                    <ShareIcon className="h-4 w-4 mr-1" />
                    {t('common.share', 'Share')}
                 </button>
                 <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`flex items-center ${isFavorite ? 'text-red-500' : 'text-gray-500'} hover:text-red-500`}
                 >
                    {isFavorite ? <HeartIconSolid className="h-4 w-4 mr-1" /> : <HeartIcon className="h-4 w-4 mr-1" />}
                    {t('common.save', 'Save')}
                 </button>
              </div>
           </div>

           {/* Price & Book Button (Right Side) - Only show if rates available */}
           {hotel.rates && hotel.rates.length > 0 && (
           <div className="hidden md:flex flex-col items-end">
              <div className="flex items-baseline mb-2">
                 <span className="text-gray-500 text-lg mr-2">{t('hotels.from', 'From')}</span>
                 <span className="text-3xl font-bold text-black">{currency} {lowestPrice.toFixed(0)}</span>
              </div>
              <button
                 onClick={() => document.getElementById('room-selection')?.scrollIntoView({ behavior: 'smooth' })}
                 className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors"
              >
                 {t('hotels.selectRoom', 'Select a room')}
              </button>
           </div>
           )}
        </div>

        {/* Gallery Section - New Design */}
        {/* Gallery Section - New Design */}
        {/* Gallery Section - Modern Bento CSS Grid */}
        <div className="w-full mb-8">
            <div className={`grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-2 h-[300px] md:h-[500px] rounded-xl overflow-hidden`}>

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
                        <span className="text-sm font-medium">{t('hotels.photos', 'Photos')}</span>
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
                   {t('hotels.viewAll', 'View All')}
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
        <div className="bg-gradient-to-r from-orange-400 to-orange-300 rounded-lg p-4 mb-8 flex items-center justify-between shadow-sm relative overflow-hidden">
           <div className="relative z-10 flex items-center text-white">
              <span className="bg-red-500 text-white font-bold px-3 py-1 rounded text-sm uppercase mr-4 shadow-sm animate-pulse">
                {t('common.joinNow', 'Join now')}
              </span>
              <span className="font-bold text-lg">
                {t('hotels.exclusivePrices', 'Exclusive prices for Gaith Tours members')}
              </span>
           </div>
           {/* Decoration */}
           <div className="absolute right-0 bottom-0 opacity-20 transform translate-y-1/4 translate-x-1/4">
              <img src="/airplane-icon.png" className="w-32 h-32" alt="" />
           </div>
        </div>

        {/* Property Description */}
        <div className="mb-10">
           <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('hotels.propertyDescription', 'Property Description')}</h2>
           <p className="text-gray-700 leading-relaxed max-w-4xl text-sm md:text-base">
              {hotel.description}
           </p>
        </div>

        {/* Amenities Section */}
        <div className="mb-10">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('hotels.amenities', 'Amenities')}</h2>
              {hotel.amenities && hotel.amenities.length > 12 && (
                <button
                  onClick={() => setShowAmenitiesModal(true)}
                  className="text-orange-500 font-bold hover:underline"
                >
                  {t('common.viewAll', 'View All')}
                </button>
              )}
           </div>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-y-4 gap-x-8">
              {hotel.amenities?.slice(0, 12).map((amenity, idx) => (
                 <div key={idx} className="flex items-center text-gray-700">
                    <div className="w-8">{getAmenityIcon(amenity)}</div>
                    <span className="text-sm font-medium">{amenity}</span>
                 </div>
              ))}
           </div>
           {hotel.amenities && hotel.amenities.length > 12 && (
              <button
                onClick={() => setShowAmenitiesModal(true)}
                className="mt-4 text-orange-500 font-medium hover:underline text-sm"
              >
                 +{hotel.amenities.length - 12} {t('common.more', 'more')}
              </button>
           )}
        </div>



        {/* Amenities Modal */}
        {showAmenitiesModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] flex flex-col relative animate-fadeIn">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="text-2xl font-bold text-gray-800">{t('hotels.amenities', 'Amenities')}</h3>
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
        {/* Room Selection */}
        <div id="room-selection" className="mb-12">
           <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">{t('hotels.availableRooms', 'Available Rooms')}</h2>
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

        {/* Guest Reviews Section */}
        <GuestReviews
          rating={hotel.reviewScore || hotel.rating || null}
          reviewCount={hotel.reviewCount || 0}
          detailedRatings={(hotel as any).detailed_ratings}
          reviews={(hotel as any).reviews}
        />

        {/* Hotel Policies Section */}
        <div className="mb-12">
          <HotelPoliciesCard
            checkInTime={hotel.checkIn || undefined}
            checkOutTime={hotel.checkOut || undefined}
            metapolicyInfo={(hotel as any).metapolicy_extra_info || undefined}
            metapolicyStruct={(hotel as any).metapolicy_struct || undefined}
          />
        </div>

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
                 {t('common.reserve', 'Reserve')}
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
                <span>{t('common.reserve', 'Reserve')} ({selectedRates.size})</span>
                <ArrowLeftIcon className="w-5 h-5 rotate-180" />
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
    </div>
  );
};
