import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HotelSelectionModal } from '../components/HotelSelectionModal';
import { HotelBookingModal } from '../components/HotelBookingModal';
import { FileUpload, UploadedFile } from '../components/FileUpload';
import { Hotel } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { CalendarIcon, UserGroupIcon, MapPinIcon, StarIcon } from '@heroicons/react/24/outline';

export const Hotels: React.FC = () => {
  const { user } = useAuth();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 2,
    rooms: 1,
    specialRequests: '',
    expectedCheckInTime: '',
    roomType: 'double',
    stayType: 'room_only',
    paymentMethod: '',
    touristName: user?.name || '',
    phone: user?.phone || '',
    nationality: user?.nationality || '',
    email: user?.email || '',
    guests_list: [] as Array<{ fullName: string; phoneNumber: string }>,
    attachments: [] as UploadedFile[]  });

  const [loading] = useState(false);
  const [error, setError] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ fullName: '', phoneNumber: '' });

  // Auto-populate personal information when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        touristName: user.name || prev.touristName,
        phone: user.phone || prev.phone,
        nationality: user.nationality || prev.nationality,
        email: user.email || prev.email
      }));
    }
  }, [user]);

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

    // Validate required fields
    if (!formData.touristName || !formData.phone || !formData.nationality ||
        !formData.email || !formData.roomType || !formData.stayType ||
        !formData.paymentMethod) {
      setError('Please fill in all required fields');
      return;
    }

    setShowBookingModal(true);
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleAddGuest = () => {
    if (newGuest.fullName.trim() && newGuest.phoneNumber.trim()) {
      setFormData({
        ...formData,
        guests_list: [...formData.guests_list, { ...newGuest }]
      });
      setNewGuest({ fullName: '', phoneNumber: '' });
      setShowGuestForm(false);
    }
  };

  const handleRemoveGuest = (index: number) => {
    setFormData({
      ...formData,
      guests_list: formData.guests_list.filter((_, i) => i !== index)
    });
  };
  const handleNewGuestChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewGuest({
      ...newGuest,
      [e.target.name]: e.target.value
    });
  };

  const handleFilesChange = (files: UploadedFile[]) => {
    setFormData({
      ...formData,
      attachments: files
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
              </div>            </div>

            {/* Personal Information Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tourist Name *
                  </label>
                  <input
                    type="text"
                    name="touristName"
                    value={formData.touristName}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number * <span className="text-xs text-gray-500">(include country code e.g., +966)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your phone number with country code"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nationality *
                  </label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your nationality"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Booking Details Section */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Check-in Time
                  </label>
                  <input
                    type="time"
                    name="expectedCheckInTime"
                    value={formData.expectedCheckInTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type *
                  </label>
                  <select
                    name="roomType"
                    value={formData.roomType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="single">Single Room</option>
                    <option value="double">Double Room</option>
                    <option value="twin">Twin Room</option>
                    <option value="triple">Triple Room</option>
                    <option value="quad">Quad Room</option>
                    <option value="suite">Suite</option>
                    <option value="family">Family Room</option>
                    <option value="deluxe">Deluxe Room</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Stay Type *
                  </label>
                  <select
                    name="stayType"
                    value={formData.stayType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value="room_only">Room Only</option>
                    <option value="bed_breakfast">Bed & Breakfast</option>
                    <option value="half_board">Half Board</option>
                    <option value="full_board">Full Board</option>
                    <option value="all_inclusive">All Inclusive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method *
                  </label>
                  <input
                    type="text"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., Credit Card, Bank Transfer, Cash"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Additional Guests Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Additional Guests</h3>
                <button
                  type="button"
                  onClick={() => setShowGuestForm(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Add Guest
                </button>
              </div>

              {/* Existing Guests List */}
              {formData.guests_list.length > 0 && (
                <div className="space-y-3 mb-4">
                  {formData.guests_list.map((guest, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{guest.fullName}</p>
                        <p className="text-sm text-gray-600">{guest.phoneNumber}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(index)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Guest Form */}
              {showGuestForm && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest's Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={newGuest.fullName}
                        onChange={handleNewGuestChange}
                        required
                        placeholder="Enter guest's full name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Guest's Phone Number * <span className="text-xs text-gray-500">(include country code e.g., +966)</span>
                      </label>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={newGuest.phoneNumber}
                        onChange={handleNewGuestChange}
                        required
                        placeholder="Enter guest's phone number with country code"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={handleAddGuest}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Add Guest
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGuestForm(false);
                        setNewGuest({ fullName: '', phoneNumber: '' });
                      }}
                      className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>            {/* Special Requests */}
            <div className="border-t pt-6">
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

            {/* File Attachments */}
            <div className="border-t pt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Attachments (Optional)
              </label>
              <p className="text-sm text-gray-600 mb-4">
                Upload documents such as identification, visa, or any other relevant files for your booking.
              </p>
              <FileUpload
                files={formData.attachments}
                onFilesChange={handleFilesChange}
                maxFiles={5}
                maxSize={10}
                acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']}
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
          hotel={selectedHotel}          searchParams={{
            destination: '',
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: formData.guests,
            rooms: formData.rooms,
            expectedCheckInTime: formData.expectedCheckInTime,
            roomType: formData.roomType,
            stayType: formData.stayType,
            paymentMethod: formData.paymentMethod,
            touristName: formData.touristName,
            phone: formData.phone,
            nationality: formData.nationality,
            email: formData.email,
            guests_list: formData.guests_list,
            notes: formData.specialRequests,
            attachments: formData.attachments
          }}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
