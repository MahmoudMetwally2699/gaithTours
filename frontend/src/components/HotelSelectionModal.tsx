import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { searchHotels } from '../services/hotelService';
import { Hotel } from '../services/api';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('hotels.selectHotel', 'Select Hotel')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('hotels.searchHotels', 'Search for hotels...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="text-center py-8 text-red-600">
                {error}
              </div>
            )}

            {!loading && !error && searchQuery.length >= 2 && hotels.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {t('hotels.noHotelsFound', 'No hotels found')}
              </div>
            )}

            {!loading && searchQuery.length < 2 && (
              <div className="text-center py-8 text-gray-500">
                {t('hotels.typeToSearch', 'Type at least 2 characters to search')}
              </div>
            )}            {hotels.map((hotel) => (
              <div
                key={hotel.id}
                onClick={() => handleSelectHotel(hotel)}
                className="flex items-center p-4 border border-gray-200 rounded-lg mb-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >                <div className="w-16 h-16 flex-shrink-0 mr-4">
                  {hotel.image ? (
                    <img
                      src={hotel.image}
                      alt={hotel.name}
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 rounded-md flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No Image</span>
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{hotel.name}</h4>
                  <p className="text-sm text-gray-600">
                    {hotel.address}, {hotel.city}, {hotel.country}
                  </p>
                  {hotel.rating && (
                    <div className="flex items-center mt-1">
                      <span className="text-yellow-400">★</span>
                      <span className="ml-1 text-sm text-gray-600">{hotel.rating}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Showing {hotels.length} of {totalHotels} hotels (Page {currentPage} of {totalPages})
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage <= 1 || loading}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm">
                    {currentPage}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages || loading}
                    className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
