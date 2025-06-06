import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MapPinIcon,
  StarIcon,
  BuildingOfficeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../types/hotel';
import { useDirection } from '../hooks/useDirection';

interface HotelSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectHotel: (hotel: Hotel) => void;
}

export const HotelSelectionModal: React.FC<HotelSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectHotel
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const [searchQuery, setSearchQuery] = useState('');
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalHotels, setTotalHotels] = useState(0);
  const hotelsPerPage = 10;

  const searchHotelsAsync = useCallback(async (query: string, page: number = 1) => {
    if (query.length < 2) {
      setHotels([]);
      setTotalPages(0);
      setTotalHotels(0);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await searchHotels(query, page, hotelsPerPage);

      if (response?.hotels) {
        setHotels(response.hotels);
        setTotalPages(response.totalPages || 0);
        setTotalHotels(response.total || 0);
        setCurrentPage(response.page || 1);
      } else {
        setHotels([]);
        setTotalPages(0);
        setTotalHotels(0);
      }
    } catch (err: any) {
      console.error('Error searching hotels:', err);
      setError(err.message || 'Failed to search hotels');
      setHotels([]);
      setTotalPages(0);
      setTotalHotels(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delayedSearch = setTimeout(() => {
        setCurrentPage(1); // Reset to first page on new search
        searchHotelsAsync(searchQuery, 1);
      }, 300);

      return () => clearTimeout(delayedSearch);
    } else {
      setHotels([]);
      setTotalPages(0);
      setTotalHotels(0);
    }
  }, [searchQuery, searchHotelsAsync]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && !loading) {
      searchHotelsAsync(searchQuery, newPage);
    }
  };

  const handleSelectHotel = (hotel: Hotel) => {
    onSelectHotel(hotel);
    onClose();
    setSearchQuery('');
    setHotels([]);
    setCurrentPage(1);
    setTotalPages(0);
    setTotalHotels(0);
  };
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden mx-2 sm:mx-0"
          onClick={(e) => e.stopPropagation()}
        >          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-4 sm:px-8 py-4 sm:py-6">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/90 via-amber-600/90 to-yellow-600/90"></div>
            <div className="absolute inset-0 opacity-20"
                 style={{
                   backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                 }}></div>
            <div className="relative flex items-center justify-between">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 sm:space-x-4`}>
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30">
                  <BuildingOfficeIcon className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-2xl font-bold text-white mb-1">
                    {t('hotels.selectHotel', 'Select Hotel')}
                  </h3>
                  <p className="text-white/90 text-xs sm:text-sm">
                    Discover your perfect accommodation from thousands of options
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 transition-all duration-200"
              >
                <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </motion.button>
            </div>
          </div>          {/* Search Section */}
          <div className="p-4 sm:p-8 bg-gradient-to-b from-orange-50/30 to-white">
            <div className="relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="absolute inset-0 bg-gradient-to-r from-orange-100/50 to-amber-100/50 rounded-2xl"
              />
              <div className="relative flex items-center">
                <div className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} z-10`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg">
                    <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                </div>

                <input
                  type="text"
                  placeholder={t('hotels.searchHotels', 'Search for hotels by city, country, or hotel name...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full ${isRTL ? 'pr-12 sm:pr-16 pl-4 sm:pl-6' : 'pl-12 sm:pl-16 pr-4 sm:pr-6'} py-3 sm:py-4 bg-white/80 backdrop-blur-sm border-2 border-orange-200/60 rounded-2xl focus:ring-4 focus:ring-orange-200/50 focus:border-orange-400 transition-all duration-200 text-gray-900 placeholder-gray-500 text-sm sm:text-lg shadow-lg`}
                />

                {searchQuery && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSearchQuery('')}
                    className={`absolute ${isRTL ? 'left-3 sm:left-4' : 'right-3 sm:right-4'} w-6 h-6 sm:w-8 sm:h-8 bg-gray-400 hover:bg-gray-500 rounded-lg flex items-center justify-center transition-all duration-200`}
                  >
                    <XMarkIcon className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>          {/* Results Section */}
          <div className="px-4 sm:px-8 pb-4 sm:pb-8">
            <div className="max-h-[40vh] sm:max-h-[50vh] overflow-y-auto">{loading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-16"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-orange-200 rounded-full animate-spin border-t-orange-500"></div>
                    <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-orange-300"></div>
                  </div>
                  <p className="mt-4 text-gray-600 font-medium">Searching for perfect hotels...</p>
                  <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-1 mt-2`}>
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </motion.div>
              )}

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <XMarkIcon className="h-10 w-10 text-red-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Search Error</h4>
                  <p className="text-red-600">{error}</p>
                </motion.div>
              )}

              {!loading && !error && searchQuery.length >= 2 && hotels.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">No Hotels Found</h4>
                  <p className="text-gray-600">Try searching with different keywords or location</p>
                </motion.div>
              )}

              {!loading && searchQuery.length < 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="text-center py-16"
                >
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <SparklesIcon className="h-10 w-10 text-orange-500" />
                  </div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">Start Your Search</h4>
                  <p className="text-gray-600">Type at least 2 characters to discover amazing hotels</p>
                </motion.div>
              )}

              {/* Hotel Results */}
              <div className="space-y-4">
                {hotels.map((hotel, index) => (
                  <motion.div
                    key={hotel.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectHotel(hotel)}
                    className="group relative bg-gradient-to-r from-white to-orange-50/30 border-2 border-orange-100/60 rounded-2xl p-4 sm:p-6 cursor-pointer hover:border-orange-300 hover:shadow-xl transition-all duration-300 overflow-hidden"
                  >
                    {/* Hover gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

                    {/* Mobile-responsive layout */}
                    <div className="relative">
                      {/* Desktop layout */}
                      <div className={`hidden sm:flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-6`}>
                        {/* Hotel Image */}
                        <div className="relative w-24 h-24 flex-shrink-0">
                          {hotel.image ? (
                            <img
                              src={hotel.image}
                              alt={hotel.name}
                              className="w-full h-full object-cover rounded-xl shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl flex items-center justify-center shadow-lg">
                              <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                            </div>
                          )}

                          {/* Rating badge */}
                          {hotel.rating && (
                            <div className={`absolute -top-2 ${isRTL ? '-left-2' : '-right-2'} bg-gradient-to-r from-yellow-400 to-amber-400 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-lg flex items-center space-x-1`}>
                              <StarIcon className="h-3 w-3 fill-current" />
                              <span>{hotel.rating}</span>
                            </div>
                          )}
                        </div>

                        {/* Hotel Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors duration-200 break-words">
                            {hotel.name}
                          </h4>

                          <div className={`flex items-center text-gray-600 mb-3`}>
                            <MapPinIcon className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} text-orange-500 flex-shrink-0`} />
                            <p className="text-sm break-words">
                              {hotel.address}, {hotel.city}, {hotel.country}
                            </p>
                          </div>

                          {hotel.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {hotel.description}
                            </p>
                          )}                          {/* Hotel features */}
                          <div className={`flex flex-wrap items-center gap-2 text-xs`}>
                            {hotel.reviewCount && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
                                {hotel.reviewCount} reviews
                              </span>
                            )}
                            {hotel.reviewScoreWord && (
                              <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full whitespace-nowrap">
                                {hotel.reviewScoreWord}
                              </span>
                            )}
                            {hotel.propertyClass && (
                              <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full whitespace-nowrap">
                                {hotel.propertyClass} star{hotel.propertyClass !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Select Button */}
                        <div className="flex-shrink-0">
                          <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-110">
                            <motion.div
                              whileHover={{ rotate: 180 }}
                              transition={{ duration: 0.3 }}
                            >
                              <SparklesIcon className="h-6 w-6 text-white" />
                            </motion.div>
                          </div>
                        </div>
                      </div>                      {/* Mobile layout - RTL Aware */}
                      <div className="sm:hidden">
                        <div className={`flex items-start ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
                          {/* Hotel Image */}
                          <div className="relative w-20 h-20 flex-shrink-0">
                            {hotel.image ? (
                              <img
                                src={hotel.image}
                                alt={hotel.name}
                                className="w-full h-full object-cover rounded-lg shadow-lg group-hover:shadow-xl transition-shadow duration-300"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center shadow-lg">
                                <BuildingOfficeIcon className="h-6 w-6 text-gray-400" />
                              </div>
                            )}

                            {/* Rating badge - RTL Aware */}
                            {hotel.rating && (
                              <div className={`absolute -top-1 ${isRTL ? '-left-1' : '-right-1'} bg-gradient-to-r from-yellow-400 to-amber-400 text-white text-xs font-bold px-1.5 py-0.5 rounded-md shadow-lg flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                                <StarIcon className="h-2.5 w-2.5 fill-current" />
                                <span>{hotel.rating}</span>
                              </div>
                            )}
                          </div>

                          {/* Hotel Info - Mobile RTL Aware */}
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-lg font-bold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors duration-200 break-words leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                              {hotel.name}
                            </h4>

                            <div className={`flex items-start text-gray-600 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <MapPinIcon className={`h-3.5 w-3.5 mt-0.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'} text-orange-500 flex-shrink-0`} />
                              <p className={`text-xs break-words leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                                {hotel.address}, {hotel.city}, {hotel.country}
                              </p>
                            </div>

                            {hotel.description && (
                              <p className={`text-xs text-gray-600 mb-2 line-clamp-2 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                                {hotel.description}
                              </p>
                            )}

                            {/* Hotel features - Mobile RTL Aware */}
                            <div className={`flex flex-wrap items-center gap-1.5 text-xs mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              {hotel.reviewCount && (
                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full whitespace-nowrap text-xs">
                                  {hotel.reviewCount} reviews
                                </span>
                              )}
                              {hotel.reviewScoreWord && (
                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap text-xs">
                                  {hotel.reviewScoreWord}
                                </span>
                              )}
                              {hotel.propertyClass && (
                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full whitespace-nowrap text-xs">
                                  {hotel.propertyClass}★
                                </span>
                              )}
                            </div>

                            {/* Select Button - Mobile RTL Aware */}
                            <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                              <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-lg flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-200 group-hover:scale-110">
                                <motion.div
                                  whileHover={{ rotate: 180 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <SparklesIcon className="h-4 w-4 text-white" />
                                </motion.div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-orange-100"
                >                  <div className="text-xs sm:text-sm text-gray-600 bg-orange-50/50 px-3 sm:px-4 py-2 rounded-xl text-center sm:text-left">
                    Showing {hotels.length} of {totalHotels} hotels (Page {currentPage} of {totalPages})
                  </div><div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1 || loading}
                      className="w-10 h-10 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl flex items-center justify-center shadow-lg disabled:shadow-none transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      <ChevronLeftIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </motion.button>

                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-4 py-2 rounded-xl font-bold min-w-[3rem] text-center shadow-lg">
                      {currentPage}
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handlePageChange(currentPage + 1)}                      disabled={currentPage >= totalPages || loading}
                      className="w-10 h-10 bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl flex items-center justify-center shadow-lg disabled:shadow-none transition-all duration-200 disabled:cursor-not-allowed"
                    >
                      <ChevronRightIcon className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
