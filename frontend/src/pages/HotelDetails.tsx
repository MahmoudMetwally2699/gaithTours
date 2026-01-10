import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  UserIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Hotel } from '../types/hotel';
import { getHotelDetails } from '../services/hotelService';
import { RoomCard } from '../components/RoomCard';
import { PriceBreakdownCard } from '../components/PriceBreakdownCard';
import { CancellationPolicyCard } from '../components/CancellationPolicyCard';
import { HotelPoliciesCard } from '../components/HotelPoliciesCard';

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

export const HotelDetails: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hotelId } = useParams<HotelDetailsParams>();
  const history = useHistory();
  const location = useLocation();

  // Check if current language is RTL
  const isRTL = i18n.language === 'ar';

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);

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

  const bookingParams = {
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || getDefaultCheckIn(),
    checkOut: searchParams.get('checkOut') || getDefaultCheckOut(),
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: parseInt(searchParams.get('children') || '0')
  };

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

  // Function to get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const lower = amenity.toLowerCase();
    const className = "h-5 w-5 text-gray-700";
    if (lower.includes('wifi') || lower.includes('internet')) return <WifiIcon className={className} />;
    if (lower.includes('pool')) return <span className="text-xl">🏊</span>;
    if (lower.includes('gym') || lower.includes('fitness')) return <UserGroupIcon className={className} />;
    if (lower.includes('restaurant')) return <HomeIcon className={className} />;
    if (lower.includes('spa')) return <CogIcon className={className} />;
    if (lower.includes('room service')) return <ClockIcon className={className} />;
    if (lower.includes('bar') || lower.includes('lounge')) return <div className="h-5 w-5 text-gray-700 flex items-center justify-center">🍷</div>;
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
        // Use the service function
        const hotelData = await getHotelDetails(hotelId);

        // Transform the API response to match our Hotel interface
        const transformedHotel: Hotel = {
          id: hotelData.id || hotelId,
          name: hotelData.name || 'Hotel Name Not Available',
          address: hotelData.address || 'Address not available',
          city: hotelData.city || bookingParams.destination || '',
          country: hotelData.country || 'Saudi Arabia',
          price: 0,
          currency: 'SAR',
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
          metapolicy_struct: hotelData.metapolicy_struct || null
        };

        setHotel(transformedHotel);
      } catch (err: any) {
        console.error('Failed to fetch hotel details:', err);
        setError(err.message || 'Failed to load hotel details');
      } finally {
        setLoading(false);
      }
    };

    fetchHotelDetails();
  }, [hotelId, bookingParams.destination]);

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
      children: bookingParams.children.toString(),
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
      guests: bookingParams.adults
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

  if (loading) {
     return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;
  }

  if (error || !hotel) {
     return <div className="text-center py-20 text-red-500">{error || 'Hotel not found'}</div>;
  }

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      {/* Header Section - Same as Search Results */}
      <div className="relative w-full overflow-visible font-sans">
        {/* Solid Background Color */}
        <div className="absolute inset-0 z-0 overflow-hidden rounded-b-[3rem] bg-[#E67915]">
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col px-4 sm:px-8 lg:px-16 py-3">

          {/* Custom Header */}
          <header className="flex flex-col sm:flex-row justify-between items-center w-full mb-2 sm:mb-4 space-y-2 sm:space-y-0">

            {/* Left: Auth Buttons */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
              <a href="/login" className="text-white font-medium hover:text-orange-200 transition text-lg shadow-sm">
                Sign in
              </a>
              <a
                href="/register"
                className="bg-[#F7871D] hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
              >
                Register
              </a>
            </div>

            {/* Center/Right: Info & Logo */}
            <div className="flex items-center space-x-6 lg:space-x-8 rtl:space-x-reverse order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">

              {/* Contact & Settings */}
              <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse text-white text-sm font-medium">
                <div className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer hover:text-orange-200">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>+966549412412</span>
                </div>

                <div className="flex items-center space-x-1 cursor-pointer hover:text-orange-200">
                  <span>US</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </div>

                <button className="flex items-center space-x-1 hover:text-orange-200 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  <span className="uppercase">EN</span>
                  <ChevronDownIcon className="w-3 h-3" />
                </button>
              </div>

              {/* Logo */}
              <a href="/" className="flex-shrink-0">
                <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-12 sm:h-14 w-auto drop-shadow-lg" />
              </a>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex space-x-4 rtl:space-x-reverse mb-3 justify-center sm:justify-start rtl:justify-start">
            <button className="flex items-center space-x-2 rtl:space-x-reverse text-white/70 hover:text-white transition px-4 py-2">
              <svg className="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span className="text-lg font-medium">Flights</span>
            </button>

            <button className="flex items-center space-x-2 rtl:space-x-reverse text-white border-b-2 border-[#F7871D] px-4 py-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
              </svg>
              <span className="text-lg font-medium">Stays</span>
            </button>
          </div>

          {/* Search Bar - Pill Shape */}
          <div className="w-full bg-white rounded-[2rem] p-2 shadow-2xl border-4 border-white/50 backdrop-blur-sm mb-3">
            <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x rtl:divide-x-reverse divide-gray-200">

              {/* Destination */}
              <div className="flex-[1.5] w-full p-4 flex items-center space-x-3 rtl:space-x-reverse min-w-0">
                <MapPinIcon className="w-6 h-6 text-gray-400 flex-shrink-0" />
                <div className="flex-1 flex flex-col min-w-0">
                  <span className="text-sm font-bold text-gray-800 truncate">{bookingParams.destination || hotel?.city || 'Destination'}</span>
                  <span className="text-xs text-gray-400">Where are you going?</span>
                </div>
              </div>

              {/* Dates */}
              <div className="flex-1 w-full p-4 flex items-center space-x-3 rtl:space-x-reverse">
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="flex flex-col w-full">
                  <span className="text-sm font-bold text-gray-800">
                    {bookingParams.checkIn} - {bookingParams.checkOut}
                  </span>
                  <span className="text-xs text-gray-400">Check-in - Check-out</span>
                </div>
              </div>

              {/* Guests */}
              <div className="flex-1 w-full p-4 flex items-center space-x-3 rtl:space-x-reverse">
                <UserIcon className="w-6 h-6 text-gray-700" />
                <span className="text-gray-700 text-lg">
                  {bookingParams.rooms} room, {bookingParams.adults} adults, {bookingParams.children} children
                </span>
              </div>

              {/* Search Button */}
              <div className="p-2">
                <button
                  onClick={() => history.push('/')}
                  className="bg-[#F7871D] hover:bg-orange-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
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
                 <span className="text-3xl font-bold text-black">SAR {lowestPrice.toFixed(0)}</span>
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

        {/* Gallery Section */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-2 h-[400px] mb-8 overflow-hidden rounded-xl">
           {/* Main Image */}
           <div className="md:col-span-2 relative h-full group cursor-pointer" onClick={() => setShowAllPhotos(true)}>
              <img
                 src={hotelImages[0]}
                 alt={hotel.name}
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
           </div>

           {/* Grid of Thumbnails */}
           <div className="hidden md:grid grid-cols-2 gap-2 h-full">
              {hotelImages.slice(1, 4).map((img: string, idx: number) => (
                 <div key={idx} className="relative h-full overflow-hidden cursor-pointer" onClick={() => setShowAllPhotos(true)}>
                    <img src={img} alt={`View ${idx}`} className="w-full h-full object-cover hover:opacity-90 transition-opacity" />
                 </div>
              ))}

              {/* Map Thumbnail / 4th Image */}
              <div className="relative h-full overflow-hidden cursor-pointer bg-gray-100 flex items-center justify-center">
                 <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: 'url(/map-placeholder.jpg)' }}></div>
                 <button className="relative z-10 bg-orange-500 text-white px-4 py-2 rounded shadow-md text-sm font-bold">
                    {t('hotels.showOnMap', 'Show on map')}
                 </button>
              </div>

               {/* View All Photos Button Overlay */}
               <div className="absolute bottom-4 right-4 z-10">
                  <button
                     onClick={() => setShowAllPhotos(true)}
                     className="bg-white/90 backdrop-blur-sm text-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-white flex items-center"
                  >
                     <PhotoIcon className="w-4 h-4 mr-2" />
                     {t('hotels.viewAllPhotos', 'View all photos')}
                  </button>
               </div>
           </div>
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
                  <img src={hotelImages[selectedImageIndex]} className="max-h-[85vh] max-w-full object-contain" alt="" />

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
                     <img
                        key={idx}
                        src={img}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`h-full w-auto object-cover cursor-pointer rounded border-2 ${selectedImageIndex === idx ? 'border-orange-500' : 'border-transparent opacity-60'}`}
                        alt=""
                     />
                  ))}
               </div>
             </div>
          </div>
        )}

      </div>
    </div>
  );
};
