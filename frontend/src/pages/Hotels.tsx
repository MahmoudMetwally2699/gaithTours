import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { HotelSelectionModal } from '../components/HotelSelectionModal';
import { HotelBookingModal } from '../components/HotelBookingModal';
import { Hotel } from '../services/api';
import { CalendarIcon, UserGroupIcon, MapPinIcon, StarIcon } from '@heroicons/react/24/outline';

export const Hotels: React.FC = () => {
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: 1,
    specialRequests: ''
  });
  const [loading] = useState(false);
  const [error, setError] = useState('');

  const handleHotelSelect = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setShowHotelSelection(false);
    setError(''); // Clear any previous errors
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotel) {
      setError('Please select a hotel first');
      return;
    }
    setShowBookingModal(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  const handleCloseModal = () => {
    setShowBookingModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Book Your Perfect Stay
            </h1>
            <p className="text-xl opacity-90">
              Fill out the form below to book your hotel reservation
            </p>
          </motion.div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white rounded-lg shadow-lg p-8"
        >
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* Hotel Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Hotel *
              </label>
              <div
                onClick={() => setShowHotelSelection(true)}
                className="border border-gray-300 rounded-lg p-4 cursor-pointer hover:border-primary-500 transition-colors"
              >
                {selectedHotel ? (
                  <div className="flex items-center space-x-4">
                    <img
                      src={selectedHotel.image || '/placeholder-hotel.jpg'}
                      alt={selectedHotel.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{selectedHotel.name}</h3>
                      <p className="text-gray-600">{selectedHotel.address}, {selectedHotel.city}</p>
                      <div className="flex items-center mt-1">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(selectedHotel.rating || 0) ? 'fill-current' : ''
                              }`}
                            />
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">
                          {selectedHotel.rating?.toFixed(1) || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center text-gray-500 py-8">
                    <MapPinIcon className="h-6 w-6 mr-2" />
                    Click to select a hotel
                  </div>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Check-in Date *
                </label>
                <input
                  type="date"
                  name="checkIn"
                  value={formData.checkIn}
                  onChange={handleInputChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Check-out Date *
                </label>
                <input
                  type="date"
                  name="checkOut"
                  value={formData.checkOut}
                  onChange={handleInputChange}
                  required
                  min={formData.checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Guests and Rooms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <UserGroupIcon className="h-4 w-4 inline mr-1" />
                  Number of Guests *
                </label>
                <input
                  type="number"
                  name="guests"
                  value={formData.guests}
                  onChange={handleInputChange}
                  min="1"
                  max="10"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  name="rooms"
                  value={formData.rooms}
                  onChange={handleInputChange}
                  min="1"
                  max="5"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests
              </label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleInputChange}
                rows={4}
                placeholder="Any special requests or preferences (optional)..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Proceed to Booking'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>      {/* Hotel Selection Modal */}
      {showHotelSelection && (
        <HotelSelectionModal
          isOpen={showHotelSelection}
          onSelectHotel={handleHotelSelect}
          onClose={() => setShowHotelSelection(false)}
        />
      )}      {/* Booking Modal */}
      {showBookingModal && selectedHotel && (
        <HotelBookingModal
          hotel={selectedHotel}
          searchParams={{
            destination: '',
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: formData.guests,
            rooms: formData.rooms
          }}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
