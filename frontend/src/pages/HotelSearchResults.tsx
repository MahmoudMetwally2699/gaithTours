import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  FunnelIcon,
  StarIcon,
  MapPinIcon,
  BuildingOfficeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../types/hotel';
import { useDirection } from '../hooks/useDirection';

interface SearchFilters {
  priceRange: [number, number];
  starRating: number[];
  propertyTypes: string[];
  facilities: string[];
  sortBy: string;
}

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
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalHotels, setTotalHotels] = useState(0);

  const [filters, setFilters] = useState<SearchFilters>({
    priceRange: [0, 2000],
    starRating: [],
    propertyTypes: [],
    facilities: [],
    sortBy: 'rating'
  });

  const hotelsPerPage = 20;

  // Search hotels
  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.destination) {
        setError('Please enter a destination');
        setLoading(false);
        return;
      }      setLoading(true);
      setError('');

      // Add a slight delay to show loading state
      setTimeout(() => {
        console.log('🔍 Searching hotels for:', searchQuery.destination);
      }, 100);try {
        const response = await searchHotels(searchQuery.destination, currentPage, hotelsPerPage);

        console.log('Search response received:', response);
        console.log('Response hotels:', response?.hotels);
        console.log('Hotels array length:', response?.hotels?.length);

        if (response?.hotels) {
          setHotels(response.hotels);
          setTotalPages(response.totalPages || 0);
          setTotalHotels(response.total || 0);
        } else {
          console.log('No hotels in response, setting empty array');
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
  }, [searchQuery.destination, currentPage]);
  // Filter and sort hotels
  const filteredHotels = React.useMemo(() => {
    let filtered = [...hotels];

    // Apply star rating filter
    if (filters.starRating.length > 0) {
      filtered = filtered.filter(hotel =>
        filters.starRating.some(rating => Math.floor(hotel.rating) === rating)
      );
    }

    // Apply price range filter - only if hotel has valid price data
    filtered = filtered.filter(hotel => {
      // If no price data available, include the hotel (don't filter it out)
      if (!hotel.price || hotel.price === 0) {
        return true;
      }
      return hotel.price >= filters.priceRange[0] && hotel.price <= filters.priceRange[1];
    });    // Sort hotels - prioritize searched hotel first, then name matches, then by selected criteria
    filtered.sort((a, b) => {
      // HIGHEST PRIORITY: The specifically searched hotel (marked by backend)
      const aIsSearched = (a as any).isSearchedHotel === true;
      const bIsSearched = (b as any).isSearchedHotel === true;

      if (aIsSearched && !bIsSearched) return -1;
      if (!aIsSearched && bIsSearched) return 1;

      // Second priority: Hotels with noRatesAvailable (fetched from Content API)
      const aNoRates = (a as any).noRatesAvailable === true;
      const bNoRates = (b as any).noRatesAvailable === true;

      if (aNoRates && !bNoRates) return -1;
      if (!aNoRates && bNoRates) return 1;

      // Third priority: exact/partial name matches with search destination
      const searchTerm = searchQuery.destination.toLowerCase();
      const aNameMatch = a.name.toLowerCase().includes(searchTerm);
      const bNameMatch = b.name.toLowerCase().includes(searchTerm);

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      // If both match or both don't match, sort by selected criteria
      switch (filters.sortBy) {
        case 'price_low':
          // Handle missing prices (put them at the end)
          if (!a.price || a.price === 0) return 1;
          if (!b.price || b.price === 0) return -1;
          return a.price - b.price;
        case 'price_high':
          // Handle missing prices (put them at the end)
          if (!a.price || a.price === 0) return 1;
          if (!b.price || b.price === 0) return -1;
          return b.price - a.price;
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.rating - a.rating;
      }
    });    return filtered;
  }, [hotels, filters, searchQuery.destination]);

  const handleHotelClick = (hotel: Hotel) => {
    // Navigate to hotel details page with search parameters
    // Use HID (numeric) instead of ID (string) for the details page
    const hotelIdentifier = hotel.hid || hotel.id;
    const params = new URLSearchParams({
      ...Object.fromEntries(searchParams),
      hotelId: String(hotelIdentifier)
    });
    history.push(`/hotels/details/${hotelIdentifier}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <div key={i} className="relative">
            <StarIcon className="h-4 w-4 text-gray-300" />
            <div className="absolute inset-0 overflow-hidden w-1/2">
              <StarIconSolid className="h-4 w-4 text-yellow-400" />
            </div>
          </div>
        );
      } else {
        stars.push(
          <StarIcon key={i} className="h-4 w-4 text-gray-300" />
        );
      }
    }
    return stars;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20">      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-8">        {/* Search Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 lg:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className={`text-xl sm:text-2xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('hotels.searchResults.title', 'Hotels in')} {searchQuery.destination}
              </h1>
              <p className={`text-sm sm:text-base text-gray-600 ${isRTL ? 'text-right' : 'text-left'} break-words`}>
                {searchQuery.checkIn} - {searchQuery.checkOut} • {searchQuery.rooms} {searchQuery.rooms === 1 ? 'room' : 'rooms'} • {searchQuery.adults} {searchQuery.adults === 1 ? 'adult' : 'adults'}
                {searchQuery.children > 0 && `, ${searchQuery.children} ${searchQuery.children === 1 ? 'child' : 'children'}`}
              </p>
            </div>

            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${isRTL ? 'sm:flex-row-reverse' : 'sm:flex-row'}`}>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <FunnelIcon className="h-5 w-5" />
                <span>{t('hotels.filters', 'Filters')}</span>
              </button>

              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value }))}
                className={`px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${isRTL ? 'text-right' : 'text-left'}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <option value="rating">{t('hotels.sort.rating', 'Best Rating')}</option>
                <option value="price_low">{t('hotels.sort.priceLow', 'Price: Low to High')}</option>
                <option value="price_high">{t('hotels.sort.priceHigh', 'Price: High to Low')}</option>
                <option value="name">{t('hotels.sort.name', 'Name A-Z')}</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">          {/* Filters Sidebar */}
          {showFilters && (
            <motion.div
              initial={{ x: isRTL ? 300 : -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: isRTL ? 300 : -300, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 lg:static lg:w-80 bg-white lg:rounded-xl lg:shadow-sm p-4 lg:p-6 h-full lg:h-fit overflow-y-auto"
            >
              {/* Mobile overlay */}
              <div className="fixed inset-0 bg-black bg-opacity-50 lg:hidden" onClick={() => setShowFilters(false)}></div>

              {/* Filter content */}
              <div className="relative bg-white lg:bg-transparent rounded-xl lg:rounded-none p-4 lg:p-0 max-w-sm mx-auto lg:max-w-none">
                <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <h3 className={`text-lg font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('hotels.filters', 'Filters')}
                  </h3>
                  <button
                    onClick={() => setShowFilters(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* Price Range */}
                <div className="mb-6">
                  <h4 className={`font-medium text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('hotels.filters.priceRange', 'Price Range (SAR per night)')}
                  </h4>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="2000"
                      value={filters.priceRange[1]}
                      onChange={(e) => setFilters(prev => ({
                        ...prev,
                        priceRange: [prev.priceRange[0], parseInt(e.target.value)]
                      }))}
                      className="w-full"
                      dir={isRTL ? 'rtl' : 'ltr'}
                    />
                    <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between text-sm text-gray-600`}>
                      <span>SAR 0</span>
                      <span>SAR {filters.priceRange[1]}</span>
                    </div>
                  </div>
                </div>

                {/* Star Rating */}
                <div className="mb-6">
                  <h4 className={`font-medium text-gray-900 mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('hotels.filters.starRating', 'Star Rating')}
                  </h4>
                  <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map(rating => (
                      <label key={rating} className={`flex items-center ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                        <input
                          type="checkbox"
                          checked={filters.starRating.includes(rating)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilters(prev => ({
                                ...prev,
                                starRating: [...prev.starRating, rating]
                              }));
                            } else {
                              setFilters(prev => ({
                                ...prev,
                                starRating: prev.starRating.filter(r => r !== rating)
                              }));
                            }
                          }}
                          className={`${isRTL ? 'ml-3' : 'mr-3'} rounded border-gray-300 text-primary-600 focus:ring-primary-500`}
                        />
                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                            {[...Array(rating)].map((_, i) => (
                              <StarIconSolid key={i} className="h-4 w-4 text-yellow-400" />
                            ))}
                          </div>
                          <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-sm text-gray-600`}>
                            {rating} {t('hotels.stars', 'stars')}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                <button
                  onClick={() => setFilters({
                    priceRange: [0, 2000],
                    starRating: [],
                    propertyTypes: [],
                    facilities: [],
                    sortBy: 'rating'
                  })}
                  className="w-full py-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                >
                  {t('hotels.filters.clear', 'Clear All Filters')}
                </button>
              </div>
            </motion.div>
          )}

          {/* Main Content */}
          <div className="flex-1">            {/* Results Info */}
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                {loading ? (
                  <span>{t('hotels.searching', 'Searching...')}</span>
                ) : (
                  <span>
                    {t('hotels.searchResults.showing', 'Showing')} {filteredHotels.length} {t('hotels.searchResults.of', 'of')} {totalHotels} {t('hotels.searchResults.hotels', 'hotels')}
                  </span>
                )}
              </div>
            </div>{/* Loading State */}
            {loading && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    🔍 Searching Hotels for "{searchQuery.destination}"
                  </h3>
                  <p className="text-gray-600">
                    Finding the best hotels and deals for you...
                  </p>
                </div>                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm p-4 sm:p-6 animate-pulse">
                    <div className={`flex flex-col sm:flex-row gap-4`}>
                      {/* Mobile: Price first, Desktop: conditional ordering */}
                      <div className="order-1 sm:order-none flex-shrink-0">
                        <div className="w-24 h-6 sm:h-8 bg-gray-200 rounded"></div>
                      </div>

                      {/* Content placeholder */}
                      <div className="order-2 flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                      </div>

                      {/* Image placeholder */}
                      <div className="order-0 sm:order-3 w-full sm:w-24 lg:w-32 h-32 sm:h-20 lg:h-24 bg-gray-200 rounded-lg flex-shrink-0"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 text-center">
                <div className="text-red-600 mb-2 text-sm sm:text-base">{error}</div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-primary-600 hover:text-primary-700 font-medium text-sm sm:text-base"
                >
                  {t('common.tryAgain', 'Try Again')}
                </button>
              </div>
            )}

            {/* Hotels List */}
            {!loading && !error && (
              <div className="space-y-4">                {filteredHotels.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm p-8 sm:p-12 text-center">
                    <BuildingOfficeIcon className="h-12 sm:h-16 w-12 sm:w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className={`text-base sm:text-lg font-medium text-gray-900 mb-2 ${isRTL ? 'text-center' : 'text-center'}`}>
                      {t('hotels.searchResults.noResults', 'No hotels found')}
                    </h3>
                    <p className={`text-sm sm:text-base text-gray-600 ${isRTL ? 'text-center' : 'text-center'}`}>
                      {t('hotels.searchResults.tryDifferent', 'Try adjusting your search criteria or filters')}
                    </p>
                  </div>
                ) : (
                  <>                    {filteredHotels.map((hotel, index) => (
                      <motion.div
                        key={hotel.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        onClick={() => handleHotelClick(hotel)}
                        className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group border-2 border-gray-100 hover:border-orange-200 overflow-hidden"
                      >
                        {/* Mobile Layout */}
                        <div className="block sm:hidden">
                          {/* Hotel Image */}
                          <div className="relative">
                            {hotel.image ? (
                              <img
                                src={hotel.image}
                                alt={hotel.name}
                                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-48 bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                <BuildingOfficeIcon className="h-16 w-16 text-orange-500" />
                              </div>
                            )}
                            {/* Hotel type badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-medium">
                                Hotel
                              </span>
                            </div>
                            {/* Rating badge */}
                            <div className="absolute top-3 right-3">
                              <div className="bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                                <StarIconSolid className="h-3 w-3 text-yellow-400" />
                                <span className="text-xs font-semibold text-gray-900">
                                  {hotel.rating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>                          {/* Hotel Info */}
                          <div className="p-4">
                            <div className="mb-4">
                              {/* Centered Hotel Name */}
                              <h3 className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors mb-3 leading-tight text-center">
                                {hotel.name}
                              </h3>

                              {/* Star Rating Row - Centered */}
                              <div className="flex items-center justify-center mb-3">
                                <div className="flex items-center">
                                  {renderStars(hotel.rating)}
                                </div>
                                <span className="ml-2 text-sm font-semibold text-gray-900">
                                  {hotel.rating.toFixed(1)}
                                </span>
                                {hotel.reviewCount > 0 && (
                                  <span className="ml-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                    {hotel.reviewCount.toLocaleString()} {t('hotels.reviews', 'reviews')}
                                  </span>
                                )}
                              </div>

                              {/* Location */}
                              {(hotel.city || hotel.address) && (
                                <div className="flex items-center justify-center text-gray-600 mb-3">
                                  <MapPinIcon className="h-4 w-4 flex-shrink-0 mr-1 text-orange-500" />
                                  <span className="text-sm text-center">
                                    {hotel.city || hotel.address}
                                  </span>
                                </div>
                              )}                              {/* Important Info Section */}
                              {(hotel.description || (hotel.facilities && hotel.facilities.length > 0)) && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                  <div className="text-center">
                                    {hotel.facilities && hotel.facilities.length > 0 && (
                                      <div className="mb-2">
                                        <div className="text-xs text-gray-800 font-medium mb-1">Featured Facilities</div>
                                        <div className="flex flex-wrap justify-center gap-1">
                                          {hotel.facilities.slice(0, 3).map((facility: string, index: number) => (
                                            <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-white text-gray-700 border border-gray-200">
                                              {facility}
                                            </span>
                                          ))}
                                          {hotel.facilities.length > 3 && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                              +{hotel.facilities.length - 3} more
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {hotel.description && (
                                      <p className="text-xs text-gray-700 text-center line-clamp-2">
                                        {hotel.description}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>                            {/* Price Section */}
                            <div className="bg-orange-50 rounded-md p-1.5 mb-3 border border-orange-100">
                              <div className="text-center">
                                <div className="text-base font-bold text-orange-600 mb-0">
                                  {hotel.price && hotel.price > 0 ? (
                                    `${hotel.price} SAR`
                                  ) : (
                                    <span className="text-xs text-gray-500">
                                      {t('hotels.priceOnRequest', 'Price on request')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-orange-500 font-medium">
                                  {t('hotels.perNight', 'per night')}
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <button className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-3 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                              {t('hotels.viewDetails', 'عرض التفاصيل')}
                            </button>
                          </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden sm:flex flex-row">
                          {/* Hotel Image */}
                          <div className="relative flex-shrink-0">
                            {hotel.image ? (
                              <img
                                src={hotel.image}
                                alt={hotel.name}
                                className="w-64 lg:w-72 h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-64 lg:w-72 h-full bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center">
                                <BuildingOfficeIcon className="h-12 w-12 text-orange-500" />
                              </div>
                            )}
                            {/* Hotel type badge */}
                            <div className="absolute top-3 left-3">
                              <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium text-gray-700">
                                Hotel
                              </span>
                            </div>
                          </div>

                          {/* Hotel Info */}
                          <div className="flex-1 p-6 flex flex-col justify-between">
                            <div>
                              <div className="flex items-start justify-between mb-2">
                                <h3 className={`text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {hotel.name}
                                </h3>
                              </div>

                              <div className={`flex items-center mb-3 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                                <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                                  {renderStars(hotel.rating)}
                                </div>
                                <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-sm font-medium text-gray-900`}>
                                  {hotel.rating.toFixed(1)}
                                </span>
                                {hotel.reviewCount > 0 && (
                                  <span className={`${isRTL ? 'mr-2' : 'ml-2'} text-sm text-gray-500`}>
                                    ({hotel.reviewCount.toLocaleString()} {t('hotels.reviews', 'review')})
                                  </span>
                                )}
                              </div>

                              <div className={`flex items-start text-gray-600 mb-3 ${isRTL ? 'flex-row-reverse justify-end' : 'flex-row justify-start'}`}>
                                <MapPinIcon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isRTL ? 'ml-1' : 'mr-1'} text-orange-500`} />
                                <span className={`text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {hotel.address}, {hotel.city}, {hotel.country}
                                </span>
                              </div>

                              {hotel.description && (
                                <p className={`text-sm text-gray-600 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                  {hotel.description}
                                </p>
                              )}
                            </div>

                            {/* Price and Action */}
                            <div className={`flex items-end justify-between mt-4 pt-4 border-t border-gray-100 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
                                <div className="text-3xl font-bold text-gray-900">
                                  {hotel.price && hotel.price > 0 ? (
                                    `${hotel.price} SAR`
                                  ) : (
                                    <span className="text-lg text-gray-500">
                                      {t('hotels.priceOnRequest', 'Price on request')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {t('hotels.perNight', 'per night')}
                                </div>
                              </div>

                              <button className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors text-sm whitespace-nowrap">
                                {t('hotels.viewDetails', 'عرض التفاصيل')}
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}{/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center mt-6 sm:mt-8">
                        <div className={`flex items-center gap-1 sm:gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                          <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                          >
                            {t('common.previous', 'Previous')}
                          </button>

                          {[...Array(Math.min(totalPages, 3))].map((_, i) => {
                            const page = i + 1;
                            return (
                              <button
                                key={page}
                                onClick={() => handlePageChange(page)}
                                className={`px-2 sm:px-3 py-2 rounded-lg text-sm ${
                                  currentPage === page
                                    ? 'bg-primary-600 text-white'
                                    : 'border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          })}

                          <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-2 sm:px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-sm"
                          >
                            {t('common.next', 'Next')}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
