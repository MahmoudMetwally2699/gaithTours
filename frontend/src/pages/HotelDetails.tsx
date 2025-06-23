import React, { useState, useEffect } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  StarIcon,
  MapPinIcon,
  PhotoIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  HeartIcon,
  ShareIcon,
  WifiIcon,
  BuildingOfficeIcon,
  TruckIcon,
  SwatchIcon,
  UserGroupIcon,
  HomeIcon,
  CogIcon,
  ShieldCheckIcon,
  FireIcon,
  TvIcon,
  AcademicCapIcon,
  GlobeAltIcon,
  PhoneIcon,
  ClockIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid, HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { Hotel } from '../types/hotel';
import { getHotelDetails } from '../services/hotelService';

interface HotelDetailsParams {
  hotelId: string;
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
  };  const [hotel, setHotel] = useState<Hotel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Function to get amenity icon
  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase();

    if (amenityLower.includes('wifi') || amenityLower.includes('internet')) {
      return <WifiIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('parking') || amenityLower.includes('garage')) {
      return <TruckIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('pool') || amenityLower.includes('swimming')) {
      return <SwatchIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('gym') || amenityLower.includes('fitness') || amenityLower.includes('exercise')) {
      return <UserGroupIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('restaurant') || amenityLower.includes('dining') || amenityLower.includes('food')) {
      return <HomeIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('spa') || amenityLower.includes('wellness') || amenityLower.includes('massage')) {
      return <CogIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('security') || amenityLower.includes('safe')) {
      return <ShieldCheckIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('heating') || amenityLower.includes('air conditioning') || amenityLower.includes('climate')) {
      return <FireIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('tv') || amenityLower.includes('television') || amenityLower.includes('entertainment')) {
      return <TvIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('business') || amenityLower.includes('meeting') || amenityLower.includes('conference')) {
      return <AcademicCapIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('concierge') || amenityLower.includes('service')) {
      return <PhoneIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('room service') || amenityLower.includes('24')) {
      return <ClockIcon className="h-5 w-5 text-orange-500" />;
    }
    if (amenityLower.includes('beach') || amenityLower.includes('ocean') || amenityLower.includes('sea')) {
      return <GlobeAltIcon className="h-5 w-5 text-orange-500" />;
    }

    // Default icon for other amenities
    return <CheckCircleIcon className="h-5 w-5 text-orange-500" />;
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
        console.log('Fetching hotel details for ID:', hotelId);

        // Use the service function
        const hotelData = await getHotelDetails(hotelId);
        console.log('Hotel data received:', hotelData);        // Transform the API response to match our Hotel interface
        const transformedHotel: Hotel = {
          id: hotelData.id || hotelId,
          name: hotelData.name || 'Hotel Name Not Available',
          address: hotelData.address || 'Address not available',
          city: hotelData.city || bookingParams.destination || '',
          country: hotelData.country || 'Saudi Arabia',
          price: 0, // Hotel details API doesn't include price
          currency: 'SAR',          rating: hotelData.rating || hotelData.reviewScore || 0,
          image: hotelData.images?.[0] || hotelData.mainImage || null,
          images: hotelData.images || (hotelData.mainImage ? [hotelData.mainImage] : []),
          description: hotelData.description || '',
          reviewScore: hotelData.reviewScore || hotelData.rating || 0,
          reviewCount: hotelData.reviewCount || 0,
          facilities: hotelData.facilities || [],
          propertyClass: hotelData.propertyClass || 0,
          reviewScoreWord: hotelData.reviewScoreWord || null,
          isPreferred: hotelData.isPreferred || false,
          checkIn: hotelData.checkInTime || null,
          checkOut: hotelData.checkOutTime || null,
          coordinates: hotelData.coordinates || {
            latitude: 0,
            longitude: 0
          }
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

  const handleBookNow = () => {
    if (!hotel) return;

    // Navigate to progressive booking form
    const params = new URLSearchParams({
      ...Object.fromEntries(searchParams),
      hotelId: hotel.id,
      hotelName: hotel.name,
      hotelAddress: hotel.address,
      hotelCity: hotel.city,
      hotelCountry: hotel.country,
      hotelRating: hotel.rating.toString(),
      hotelImage: hotel.image || ''
    });

    history.push(`/hotels/booking?${params.toString()}`);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="h-5 w-5 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="h-5 w-5 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIconSolid className="h-5 w-5 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-5 w-5 text-gray-300" />
        );
      }
    }
    return stars;
  };

  const calculateNights = () => {
    if (bookingParams.checkIn && bookingParams.checkOut) {
      const startDate = new Date(bookingParams.checkIn);
      const endDate = new Date(bookingParams.checkOut);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 1;  };
  const nights = calculateNights();  // Get all hotel images from API response
  const hotelImages = React.useMemo(() => {
    // If hotel has multiple images from API, return all of them
    if (hotel && typeof hotel === 'object' && 'images' in hotel && Array.isArray(hotel.images) && hotel.images.length > 0) {
      return hotel.images;
    }

    // Fallback to single image
    if (hotel?.image) {
      return [hotel.image];
    }

    // Fallback images for demo (you can remove this in production)
    return [
      "/hero/Kingdom-Centre-Riyadh-Saudi-Arabia.webp",
      "/hero/riyadh-1600x900.webp",
      "/hero/Riyadh-city-predictions_00_Adobe-Stock-1.jpg",
      "/hero/Xe8JF2Zv-Riyadh-skyline2011-1200x800.jpg",
      "/hero/shutterstock_1882829362_LR.jpg"
    ];
  }, [hotel]);
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="animate-pulse">
            <div className="h-6 sm:h-8 bg-gray-200 rounded w-1/4 mb-3 sm:mb-4"></div>
            <div className="h-48 sm:h-64 bg-gray-200 rounded-lg sm:rounded-xl mb-4 sm:mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
              <div className="lg:col-span-2 space-y-4">
                <div className="h-4 sm:h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
              <div className="h-64 sm:h-96 bg-gray-200 rounded-lg sm:rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error || !hotel) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
            <div className="text-red-600 mb-2 text-sm sm:text-base">{error || 'Hotel not found'}</div>
            <button
              onClick={() => history.goBack()}
              className="text-primary-600 hover:text-primary-700 font-medium text-sm sm:text-base"
            >
              {t('common.goBack', 'Go Back')}
            </button>
          </div>
        </div>
      </div>
    );
  }  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">

        {/* Back Button */}
        <button
          onClick={() => history.goBack()}
          className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 mb-4 sm:mb-6 transition-colors group"
        >
          <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span className="text-sm sm:text-base font-medium">{t('common.back', 'Back to results')}</span>
        </button>

        {/* Hotel Images Gallery */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-6 sm:mb-8 border border-orange-100">
          {/* Main Image and Thumbnails */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative">
              <img
                src={hotelImages[selectedImageIndex]}
                alt={hotel.name}
                className="w-full h-64 sm:h-80 lg:h-96 object-cover"
              />              {/* Image Navigation Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-300 flex items-center justify-between px-4">
                {selectedImageIndex > 0 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 transform hover:scale-110 transition-all duration-200 shadow-lg"
                  >
                    <ArrowLeftIcon className={`h-5 w-5 text-gray-700 ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {selectedImageIndex < hotelImages.length - 1 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                    className="bg-white/80 hover:bg-white backdrop-blur-sm rounded-full p-2 transform hover:scale-110 transition-all duration-200 shadow-lg"
                  >
                    <ArrowLeftIcon className={`h-5 w-5 text-gray-700 ${isRTL ? '' : 'rotate-180'}`} />
                  </button>
                )}
              </div>

              {/* Image Counter */}
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm">
                {selectedImageIndex + 1} / {hotelImages.length}
              </div>
            </div>

            {/* Thumbnails */}
            <div className="p-4">
              <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
                {hotelImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all duration-200 ${
                      selectedImageIndex === index
                        ? 'ring-2 ring-orange-500 scale-105 shadow-lg'
                        : 'hover:scale-105 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${hotel.name} view ${index + 1}`}
                      className="w-16 h-16 sm:w-20 sm:h-20 object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* View All Photos Button */}
              <button
                onClick={() => setShowAllPhotos(true)}
                className="flex items-center space-x-2 text-orange-600 hover:text-orange-700 font-medium text-sm sm:text-base mt-4 group"
              >
                <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform duration-200" />
                <span>{t('hotels.viewAllPhotos', 'View all photos')} ({hotelImages.length})</span>
              </button>
            </div>
          </div>
        </div>        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">            {/* Hotel Header */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-orange-100">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                    {hotel.name}
                  </h1>

                  <div className="flex flex-wrap items-center mb-3 sm:mb-4 gap-2 sm:gap-3">
                    <div className="flex items-center bg-orange-50 px-2 sm:px-3 py-1 rounded-full">
                      {renderStars(hotel.rating)}
                    </div>
                    <span className="text-lg sm:text-xl font-bold text-orange-600">
                      {hotel.rating.toFixed(1)}
                    </span>
                    <span className="text-gray-600 bg-gray-50 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm">
                      {hotel.reviewCount.toLocaleString()} reviews
                    </span>
                    {hotel.reviewScoreWord && (
                      <span className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border border-green-200">
                        {hotel.reviewScoreWord}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start text-gray-600 bg-gray-50 p-3 rounded-xl">
                    <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 mt-0.5 flex-shrink-0 text-orange-500" />
                    <span className="text-sm sm:text-base font-medium">{hotel.address}, {hotel.city}, {hotel.country}</span>
                  </div>
                </div>                <div className="flex items-center space-x-2 sm:space-x-3 self-start">
                  <button
                    onClick={() => setIsFavorite(!isFavorite)}
                    className={`p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl transition-all duration-200 ${
                      isFavorite
                        ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                        : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:border-orange-200 hover:text-orange-500'
                    }`}
                  >
                    {isFavorite ? <HeartIconSolid className="h-4 w-4 sm:h-5 sm:w-5" /> : <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </button>
                  <button className="p-2 sm:p-3 border-2 border-gray-200 rounded-lg sm:rounded-xl hover:bg-gray-50 hover:border-orange-200 hover:text-orange-500 transition-all duration-200">
                    <ShareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>            {/* Description */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-orange-100">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center">
                <BuildingOfficeIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-orange-500" />
                {t('hotels.aboutProperty', 'About this property')}
              </h2>
              <div className="prose prose-gray max-w-none">
                <p className="text-sm sm:text-base text-gray-700 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-lg sm:rounded-xl border-l-4 border-orange-500">
                  {hotel.description}
                </p>
              </div>
            </div>            {/* Amenities */}
            <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 lg:p-8 border border-orange-100">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 flex items-center">
                <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 text-orange-500" />
                {t('hotels.amenities', 'Amenities & Services')}
              </h2><div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
                {hotel.facilities.map((facility, index) => (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3 bg-orange-50 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-orange-100 hover:bg-orange-100 transition-colors duration-200">
                    <div className="flex-shrink-0">
                      {getAmenityIcon(facility)}
                    </div>
                    <span className="text-gray-800 font-medium text-xs sm:text-base truncate leading-tight">{facility}</span>
                  </div>
                ))}
              </div>
            </div>{/* Check-in/Check-out */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 border border-orange-100">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <ClockIcon className="h-6 w-6 mr-3 text-orange-500" />
                {t('hotels.importantInfo', 'Important Information')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                  <h3 className="font-bold text-green-800 mb-2 text-lg flex items-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {t('hotels.checkIn', 'Check-in')}
                  </h3>
                  <p className="text-green-700 font-semibold text-lg">{hotel.checkIn || '15:00'}</p>
                </div>
                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <h3 className="font-bold text-red-800 mb-2 text-lg flex items-center">
                    <XMarkIcon className="h-5 w-5 mr-2" />
                    {t('hotels.checkOut', 'Check-out')}
                  </h3>
                  <p className="text-red-700 font-semibold text-lg">{hotel.checkOut || '12:00'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:sticky lg:top-24 border-2 border-orange-200">
              {/* Booking Summary */}
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <h3 className="font-bold text-orange-900 mb-4 text-lg flex items-center">
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    {t('hotels.yourStay', 'Your stay')}
                  </h3>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg">
                      <span className="text-orange-700 font-medium">{t('hotels.checkIn', 'Check-in')}</span>
                      <span className="font-bold text-orange-900">{bookingParams.checkIn}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg">
                      <span className="text-orange-700 font-medium">{t('hotels.checkOut', 'Check-out')}</span>
                      <span className="font-bold text-orange-900">{bookingParams.checkOut}</span>
                    </div>                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg">
                      <span className="text-orange-700 font-medium">{t('hotels.booking.nights', 'Nights')}</span>
                      <span className="font-bold text-orange-900">{nights}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg">
                      <span className="text-orange-700 font-medium">{t('hotels.guests', 'Guests')}</span>
                      <span className="font-bold text-orange-900">
                        {bookingParams.adults} {t('hotels.adults', 'adults')}
                        {bookingParams.children > 0 && `, ${bookingParams.children} ${t('hotels.children', 'children')}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/50 p-2 rounded-lg">
                      <span className="text-orange-700 font-medium">{t('hotels.rooms', 'Rooms')}</span>
                      <span className="font-bold text-orange-900">{bookingParams.rooms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Now Button */}
              <button
                onClick={handleBookNow}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0"
              >
                {t('hotels.bookWithBestPrice', 'Book with Best Price')}
              </button>

              <div className="mt-4 text-center">
                <div className="flex flex-col space-y-2 text-sm text-gray-600">
                  <div className="flex items-center justify-center space-x-2 bg-green-50 p-2 rounded-lg">
                    <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    <span className="text-green-700 font-medium">{t('hotels.freeWifi', 'Free WiFi')}</span>
                  </div>
                  <div className="flex items-center justify-center space-x-2 bg-blue-50 p-2 rounded-lg">
                    <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">{t('hotels.freeCancellation', 'Free cancellation')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Full Screen Photo Gallery Modal */}
        {showAllPhotos && (
          <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4">
            <div className="relative w-full h-full max-w-6xl">
              {/* Close Button */}
              <button
                onClick={() => setShowAllPhotos(false)}
                className="absolute top-4 right-4 z-10 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>

              {/* Main Image */}
              <div className="relative h-full flex items-center justify-center">                <img
                  src={hotelImages[selectedImageIndex]}
                  alt={`${hotel.name} - View ${selectedImageIndex + 1}`}
                  className="max-h-full max-w-full object-contain rounded-lg"
                />                {/* Navigation */}
                {selectedImageIndex > 0 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex - 1)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
                  >
                    <ArrowLeftIcon className={`h-6 w-6 text-white ${isRTL ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {selectedImageIndex < hotelImages.length - 1 && (
                  <button
                    onClick={() => setSelectedImageIndex(selectedImageIndex + 1)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full p-3 transition-all duration-200"
                  >
                    <ArrowLeftIcon className={`h-6 w-6 text-white ${isRTL ? '' : 'rotate-180'}`} />
                  </button>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                  {selectedImageIndex + 1} of {hotelImages.length}
                </div>
              </div>

              {/* Thumbnails Strip */}
              <div className="absolute bottom-20 left-0 right-0 flex justify-center">
                <div className="flex space-x-2 overflow-x-auto scrollbar-hide max-w-full px-4">
                  {hotelImages.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 relative rounded-lg overflow-hidden transition-all duration-200 ${
                        selectedImageIndex === index
                          ? 'ring-2 ring-orange-500 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-16 h-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
