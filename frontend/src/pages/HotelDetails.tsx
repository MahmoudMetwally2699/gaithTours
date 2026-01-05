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
  CheckIcon
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
  const bookingParams = {
    destination: searchParams.get('destination') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
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
          checkIn: hotelData.checkInTime || null,
          checkOut: hotelData.checkOutTime || null,
          coordinates: hotelData.coordinates || { latitude: 0, longitude: 0 },
          rates: hotelData.rates || []
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

    // Just picking the first one for the demo flow, or pass all
    // Ideally we should pass a list of selected rates to the booking page
    // For now we assume single room booking or adapt the booking page to handle multiple
    const firstHash = selectedHashes[0];
    const rateToBook = hotel?.rates?.find((r: any) => r.match_hash === firstHash);

    if (!rateToBook) return;

    history.push(`/hotels/booking/${hotel?.id}`, {
      hotel,
      selectedRate: rateToBook,
      checkIn: searchParams.get('checkIn') || '',
      checkOut: searchParams.get('checkOut') || '',
      guests: parseInt(searchParams.get('guests') || '2', 10)
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
    <div className="min-h-screen bg-white pt-20 pb-20 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

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

           {/* Price & Book Button (Right Side) */}
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
              <div className="text-center py-10 bg-white rounded-lg border border-gray-200">
                 <p className="text-gray-500">{t('hotels.noRoomsAvailable', 'No rooms available for these dates.')}</p>
              </div>
           )}
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
