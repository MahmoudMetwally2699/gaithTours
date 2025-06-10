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
  ShareIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { Hotel } from '../types/hotel';
import { getHotelDetails } from '../services/hotelService';

interface HotelDetailsParams {
  hotelId: string;
}

export const HotelDetails: React.FC = () => {
  const { t } = useTranslation();
  const { hotelId } = useParams<HotelDetailsParams>();
  const history = useHistory();
  const location = useLocation();

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
  const [error, setError] = useState('');  const [selectedImageIndex, setSelectedImageIndex] = useState(0);  // Fetch real hotel data from API
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
  const nights = calculateNights();
  // Get hotel images from API response or use fallback images
  const hotelImages = React.useMemo(() => {
    // Check if hotel has multiple images from API
    if (hotel && typeof hotel === 'object' && 'images' in hotel && Array.isArray(hotel.images) && hotel.images.length > 0) {
      return hotel.images;
    }

    // Fallback to single image
    if (hotel?.image) {
      return [hotel.image];
    }

    // Fallback images for demo
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
  }
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">

        {/* Back Button */}
        <button
          onClick={() => history.goBack()}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4 sm:mb-6 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="text-sm sm:text-base">{t('common.back', 'Back to results')}</span>
        </button>

        {/* Hotel Images */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden mb-6 sm:mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 p-2">
            <div className="lg:col-span-3">
              <img
                src={hotelImages[selectedImageIndex]}
                alt={hotel.name}
                className="w-full h-48 sm:h-64 lg:h-96 object-cover rounded-lg cursor-pointer"
                onClick={() => {/* View all photos functionality */}}
              />
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-1 gap-2 mt-2 lg:mt-0">
              {hotelImages.slice(1, 5).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${hotel.name} view ${index + 2}`}
                  className="w-full h-12 sm:h-16 lg:h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setSelectedImageIndex(index + 1)}
                />
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <button
              onClick={() => {/* View all photos functionality */}}
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium text-sm sm:text-base"
            >
              <PhotoIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('hotels.viewAllPhotos', 'View all photos')}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">

            {/* Hotel Header */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 space-y-4 sm:space-y-0">
                <div className="flex-1">
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    {hotel.name}
                  </h1>

                  <div className="flex flex-wrap items-center mb-3 gap-2">
                    <div className="flex items-center">
                      {renderStars(hotel.rating)}
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-900">
                      {hotel.rating.toFixed(1)}
                    </span>
                    <span className="text-sm sm:text-base text-gray-600">
                      ({hotel.reviewCount} reviews)
                    </span>
                    {hotel.reviewScoreWord && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs sm:text-sm font-medium">
                        {hotel.reviewScoreWord}
                      </span>
                    )}
                  </div>

                  <div className="flex items-start text-gray-600">
                    <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 mt-0.5 flex-shrink-0" />
                    <span className="text-sm sm:text-base">{hotel.address}, {hotel.city}, {hotel.country}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-start">
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <HeartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                  <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    <ShareIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                {t('hotels.aboutProperty', 'About this property')}
              </h2>
              <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                {hotel.description}
              </p>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                {t('hotels.amenities', 'Amenities')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {hotel.facilities.map((facility, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm sm:text-base text-gray-700">{facility}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Check-in/Check-out */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
                {t('hotels.importantInfo', 'Important Information')}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                    {t('hotels.checkIn', 'Check-in')}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">{hotel.checkIn || '15:00'}</p>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                    {t('hotels.checkOut', 'Check-out')}
                  </h3>
                  <p className="text-gray-600 text-sm sm:text-base">{hotel.checkOut || '12:00'}</p>
                </div>
              </div>
            </div>
          </div>          {/* Booking Card */}
          <div className="lg:col-span-1 order-first lg:order-last">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 lg:sticky lg:top-24">
              {/* Booking Summary */}
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">
                    {t('hotels.yourStay', 'Your stay')}
                  </h3>

                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.checkIn', 'Check-in')}</span>
                      <span className="font-medium">{bookingParams.checkIn}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.checkOut', 'Check-out')}</span>
                      <span className="font-medium">{bookingParams.checkOut}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.nights', 'Nights')}</span>
                      <span className="font-medium">{nights}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.guests', 'Guests')}</span>
                      <span className="font-medium">
                        {bookingParams.adults} {t('hotels.adults', 'adults')}
                        {bookingParams.children > 0 && `, ${bookingParams.children} ${t('hotels.children', 'children')}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.rooms', 'Rooms')}</span>
                      <span className="font-medium">{bookingParams.rooms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Book Now Button */}
              <button
                onClick={handleBookNow}
                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                {t('hotels.bookWithBestPrice', 'Book with Best Price')}
              </button>

              <div className="mt-3 sm:mt-4 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    <span>{t('hotels.freeWifi', 'Free WiFi')}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <CheckCircleIcon className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                    <span>{t('hotels.freeCancellation', 'Free cancellation')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
