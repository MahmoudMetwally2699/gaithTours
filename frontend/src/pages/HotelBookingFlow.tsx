import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  ClockIcon,
  CreditCardIcon,
  UserPlusIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { FileUpload, UploadedFile } from '../components/FileUpload';
import { HotelBookingModal } from '../components/HotelBookingModal';
import { toast } from 'react-hot-toast';

interface BookingStep {
  id: number;
  title: string;
  completed: boolean;
}

export const HotelBookingFlow: React.FC = () => {
  const { t } = useTranslation();
  const { direction } = useDirection();
  const isRTL = direction === 'rtl';
  const history = useHistory();
  const location = useLocation();
  const { user } = useAuth();

  // Parse URL parameters
  const searchParams = new URLSearchParams(location.search);
  const hotelData = {
    id: searchParams.get('hotelId') || '',
    name: searchParams.get('hotelName') || '',
    address: searchParams.get('hotelAddress') || '',
    city: searchParams.get('hotelCity') || '',
    country: searchParams.get('hotelCountry') || '',
    rating: parseFloat(searchParams.get('hotelRating') || '0'),
    image: searchParams.get('hotelImage') || '',
    checkIn: searchParams.get('checkIn') || '',
    checkOut: searchParams.get('checkOut') || '',
    rooms: parseInt(searchParams.get('rooms') || '1'),
    adults: parseInt(searchParams.get('adults') || '2'),
    children: parseInt(searchParams.get('children') || '0')
  };

  // Extract selected rate data from URL parameters
  // Parse price as number to avoid NaN display issues
  const rawPrice = searchParams.get('price');
  const parsedPrice = rawPrice ? parseFloat(rawPrice) : 0;

  const selectedRateData = {
    matchHash: searchParams.get('matchHash') || '',
    roomName: searchParams.get('roomName') || '',
    meal: searchParams.get('meal') || '',
    price: !isNaN(parsedPrice) ? parsedPrice : 0,
    currency: searchParams.get('currency') || 'SAR'
  };
  const [currentStep, setCurrentStep] = useState(1);
  const [showBookingModal, setShowBookingModal] = useState(false);  const [formData, setFormData] = useState({
    // Step 1: Check-in Time & Room Type
    expectedCheckInTime: '',
    roomType: 'Standard Room',
    stayType: 'Leisure',

    // Step 2: Payment Method
    paymentMethod: '',

    // Step 3: Additional Guests
    additionalGuests: [] as Array<{
      fullName: string;
      phoneNumber: string;
      phoneCountryCode: string;
    }>,

    // Step 4: Special Requests
    specialRequests: '',

    // Step 5: Document Attachments
    attachments: [] as UploadedFile[]
  });

  const [newGuest, setNewGuest] = useState({
    fullName: '',
    phoneNumber: '',
    phoneCountryCode: 'SA'
  });  const steps: BookingStep[] = [
    { id: 1, title: t('booking.steps.checkIn', 'Check-in Time'), completed: false },
    { id: 2, title: selectedRateData.matchHash ? t('booking.steps.roomDetails', 'Room Details') : t('booking.steps.roomType', 'Room Type'), completed: false },
    { id: 3, title: t('booking.steps.payment', 'Payment Method'), completed: false },
    { id: 4, title: t('booking.steps.guests', 'Additional Guests'), completed: false },
    { id: 5, title: t('booking.steps.requests', 'Special Requests'), completed: false },
    { id: 6, title: t('booking.steps.documents', 'Documents'), completed: false }
  ];

  // Auto-populate user data
  useEffect(() => {
    if (user) {
      // User data is already available from context
    }
  }, [user]);

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.expectedCheckInTime) {
          toast.error(t('booking.validation.checkInTime', 'Please select your expected check-in time'));
          return false;
        }
        break;
      case 2:
        // Skip room type validation if rate is pre-selected
        if (!selectedRateData.matchHash && !formData.roomType) {
          toast.error(t('booking.validation.roomType', 'Please select a room type'));
          return false;
        }
        if (!formData.stayType) {
          toast.error(t('booking.validation.stayType', 'Please select the purpose of your stay'));
          return false;
        }
        break;
      case 3:
        if (!formData.paymentMethod) {
          toast.error(t('booking.validation.paymentMethod', 'Please select a payment method'));
          return false;
        }
        break;
      // Steps 4, 5, 6 are optional
    }
    return true;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddGuest = () => {
    if (newGuest.fullName.trim() && newGuest.phoneNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalGuests: [...prev.additionalGuests, { ...newGuest }]
      }));
      setNewGuest({
        fullName: '',
        phoneNumber: '',
        phoneCountryCode: 'SA'
      });
    }
  };

  const handleRemoveGuest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: prev.additionalGuests.filter((_, i) => i !== index)
    }));
  };
  const handleSubmit = async () => {
    // Show the booking confirmation modal instead of submitting directly
    setShowBookingModal(true);
  };

  const renderStepContent = () => {
    switch (currentStep) {      case 1:
        return (
          <div className="space-y-4 sm:space-y-10">
            <div className={`text-center mb-4 sm:mb-10 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-6">
                <ClockIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-3">
                {t('booking.checkInTime.title', 'Check-in Details')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {t('booking.checkInTime.subtitle', 'Help us prepare for your arrival')}
              </p>
            </div>

            <div className="max-w-3xl mx-auto space-y-3 sm:space-y-8">              {/* Check-in Time */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg sm:rounded-2xl p-3 sm:p-8">
                <label className={`block text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.checkInTime.label', 'Expected Check-in Time')} *
                </label>
                <input
                  type="time"
                  value={formData.expectedCheckInTime}
                  onChange={(e) => handleInputChange('expectedCheckInTime', e.target.value)}
                  className={`w-full px-3 sm:px-6 py-2 sm:py-5 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 sm:focus:ring-3 focus:ring-orange-100 focus:border-orange-500 text-base sm:text-xl font-medium shadow-sm hover:shadow-md transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
                <p className={`mt-2 sm:mt-3 text-xs sm:text-base text-gray-600 bg-white px-2 sm:px-4 py-1 sm:py-2 rounded-lg border border-gray-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                  💡 {t('booking.checkInTime.note', 'Standard check-in time is 15:00. Early check-in subject to availability.')}
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 sm:space-y-8">
            <div className={`text-center mb-4 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-4">
                <UserIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {selectedRateData.matchHash
                  ? t('booking.roomDetails.title', 'Room Details')
                  : t('booking.roomType.title', 'Choose Your Room')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {selectedRateData.matchHash
                  ? t('booking.roomDetails.subtitle', 'Review your selected room')
                  : t('booking.roomType.subtitle', 'Select the perfect room for your stay')}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              {/* Show selected room details if matchHash exists */}
              {selectedRateData.matchHash ? (
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-300 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {selectedRateData.roomName || 'Selected Room'}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex items-center text-gray-700">
                          <span className="text-2xl mr-2">
                            {selectedRateData.meal === 'breakfast' && '🍳'}
                            {selectedRateData.meal === 'all_inclusive' && '🍽️'}
                            {selectedRateData.meal === 'nomeal' && '🚫'}
                          </span>
                          <span className="font-medium">
                            {selectedRateData.meal === 'breakfast' && 'Breakfast included'}
                            {selectedRateData.meal === 'all_inclusive' && 'All inclusive'}
                            {selectedRateData.meal === 'nomeal' && 'No meals included'}
                          </span>
                        </div>
                        <div className="flex items-baseline">
                          <span className="text-3xl font-bold text-orange-600">
                            {selectedRateData.price > 0
                              ? `${(selectedRateData.price * hotelData.rooms).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${selectedRateData.currency}`
                              : 'Price on request'}
                          </span>
                          {selectedRateData.price > 0 && (
                            <span className="text-sm text-gray-600 ml-2">
                              {hotelData.rooms > 1 ? `(${selectedRateData.price.toLocaleString()} × ${hotelData.rooms} rooms)` : 'per night'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col gap-2 items-end">
                      {hotelData.rooms > 1 && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">
                          × {hotelData.rooms} {t('booking.rooms', 'rooms')}
                        </span>
                      )}
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                        ✓ Selected
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-orange-200">
                    <p className="text-sm text-gray-600 mb-3">
                      💡 Need a different room? You can go back to the hotel details page to select another option.
                    </p>
                    <button
                      onClick={() => history.goBack()}
                      className="text-orange-600 hover:text-orange-700 font-medium text-sm underline"
                    >
                      ← Change Room Selection
                    </button>
                  </div>
                </div>
              ) : (
                // Fallback: Show generic room type selection if no rate is pre-selected
                <>
                  <label className={`block text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('booking.roomType.label', 'Room Type')} *
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {[
                      { id: 'Standard Room', label: t('booking.roomType.standard', 'Standard Room'), icon: '🛏️', desc: 'Comfortable stay' },
                      { id: 'Deluxe Room', label: t('booking.roomType.deluxe', 'Deluxe Room'), icon: '🏨', desc: 'Enhanced amenities' },
                      { id: 'Suite', label: t('booking.roomType.suite', 'Suite'), icon: '🏛️', desc: 'Spacious luxury' },
                      { id: 'Family Room', label: t('booking.roomType.family', 'Family Room'), icon: '👨‍👩‍👧‍👦', desc: 'Perfect for families' }
                    ].map((room) => (
                      <label
                        key={room.id}
                        className={`group flex flex-col p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 ${
                          formData.roomType === room.id
                            ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <input
                          type="radio"
                          name="roomType"
                          value={room.id}
                          checked={formData.roomType === room.id}
                          onChange={(e) => handleInputChange('roomType', e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <span className="text-lg sm:text-2xl mb-1 block">{room.icon}</span>
                          <span className={`font-bold text-xs sm:text-sm text-gray-900 block text-center leading-tight`}>
                            {room.label}
                          </span>
                          <span className="text-xs text-gray-600 hidden sm:block">{room.desc}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Purpose of Stay */}
            <div className="max-w-3xl mx-auto">
              <label className={`block text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('booking.stayType.label', 'Purpose of Stay')} *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {[
                  { id: 'business', label: t('booking.stayType.business', 'Business'), icon: '💼', desc: 'Work or meetings' },
                  { id: 'leisure', label: t('booking.stayType.leisure', 'Leisure'), icon: '🌴', desc: 'Vacation or tourism' },
                  { id: 'family', label: t('booking.stayType.family', 'Family'), icon: '👨‍👩‍👧‍👦', desc: 'Family time' },
                  { id: 'other', label: t('booking.stayType.other', 'Other'), icon: '📝', desc: 'Other purpose' }
                ].map((stay) => (
                  <label
                    key={stay.id}
                    className={`group flex flex-col p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 ${
                      formData.stayType === stay.id
                        ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <input
                      type="radio"
                      name="stayType"
                      value={stay.id}
                      checked={formData.stayType === stay.id}
                      onChange={(e) => handleInputChange('stayType', e.target.value)}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <span className="text-lg sm:text-2xl mb-1 block">{stay.icon}</span>
                      <span className={`font-bold text-xs sm:text-sm text-gray-900 block text-center leading-tight`}>
                        {stay.label}
                      </span>
                      <span className="text-xs text-gray-600 hidden sm:block">{stay.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );      case 3:
        return (
          <div className="space-y-4 sm:space-y-8">
            <div className={`text-center mb-4 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-4">
                <CreditCardIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t('booking.payment.title', 'How would you like to pay?')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {t('booking.payment.subtitle', 'Choose your preferred payment method')}
              </p>
            </div>            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto">
              {[
                { id: 'bank_card', label: t('booking.payment.bankCard', 'Bank Card'), icon: '💳', desc: 'Debit/Credit Card' },
                { id: 'bank_transfer', label: t('booking.payment.bankTransfer', 'Bank Transfer'), icon: '🏦', desc: 'Wire transfer' },
                { id: 'website_payment', label: t('booking.payment.websitePayment', 'Website Payment'), icon: '💻', desc: 'Pay through website' },
                {
                  id: 'payment_link',
                  label: t('booking.payment.paymentLink', 'Payment Link'),
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
                      <path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/>
                    </svg>
                  ),
                  desc: 'Secure payment link'
                }
              ].map((method) => (
                <label
                  key={method.id}                  className={`group flex flex-col p-2 sm:p-3 border-2 rounded-lg sm:rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 ${
                    formData.paymentMethod === method.id
                      ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-orange-100 shadow-lg'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="sr-only"
                  />                  <div className="text-center">
                    <div className="flex items-center justify-center mb-1">
                      {typeof method.icon === 'string' ? (
                        <span className="text-lg sm:text-2xl">{method.icon}</span>
                      ) : (
                        <div className="w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center">
                          {method.icon}
                        </div>
                      )}
                    </div>
                    <span className={`font-bold text-xs sm:text-sm text-gray-900 block text-center leading-tight`}>
                      {method.label}
                    </span>
                    <span className="text-xs text-gray-600 hidden sm:block">{method.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        );      case 4:
        return (
          <div className="space-y-4 sm:space-y-8">
            <div className={`text-center mb-4 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-4">
                <UserPlusIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t('booking.guests.title', 'Additional Guests')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {t('booking.guests.subtitle', 'Add travel companions (optional)')}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              {/* Existing Guests */}
              {formData.additionalGuests.length > 0 && (
                <div className="mb-6 sm:mb-8">
                  <h3 className={`font-bold text-lg text-gray-900 mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('booking.guests.added', 'Added Guests')}
                  </h3>
                  <div className="space-y-2 sm:space-y-3">
                    {formData.additionalGuests.map((guest, index) => (
                      <div key={index} className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between bg-gradient-to-r from-gray-50 to-gray-100 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-gray-200 hover:shadow-md transition-shadow`}>
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className="font-semibold text-gray-900 text-sm sm:text-lg truncate">{guest.fullName}</div>
                          <div className="text-xs sm:text-base text-gray-600 truncate">{guest.phoneNumber}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveGuest(index)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 px-3 py-1 sm:px-4 sm:py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ml-2 sm:ml-3 flex-shrink-0"
                        >
                          {t('common.remove', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}              {/* Add New Guest */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg sm:rounded-2xl p-4 sm:p-6">
                <h3 className={`font-bold text-base sm:text-lg text-gray-900 mb-4 sm:mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.guests.addNew', 'Add Guest')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.fullName', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      value={newGuest.fullName}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, fullName: e.target.value }))}
                      className={`w-full px-3 py-3 sm:px-4 sm:py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm sm:text-lg shadow-sm hover:shadow-md transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('booking.guests.namePlaceholder', 'Enter guest name')}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm sm:text-base font-semibold text-gray-800 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.phoneNumber', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      value={newGuest.phoneNumber}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className={`w-full px-3 py-3 sm:px-4 sm:py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 text-sm sm:text-lg shadow-sm hover:shadow-md transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('booking.guests.phonePlaceholder', 'Enter phone number')}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGuest}
                  className="mt-4 sm:mt-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg sm:rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105 w-full sm:w-auto"
                >
                  {t('booking.guests.addButton', 'Add Guest')}
                </button>
              </div>
            </div>
          </div>
        );      case 5:
        return (
          <div className="space-y-4 sm:space-y-8">
            <div className={`text-center mb-4 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-4">
                <DocumentTextIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t('booking.requests.title', 'Special Requests')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {t('booking.requests.subtitle', 'Let us know about any special needs (optional)')}
              </p>
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-lg sm:rounded-2xl p-4 sm:p-6">                <textarea
                  value={formData.specialRequests}
                  onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                  rows={4}
                  className={`w-full px-3 py-3 sm:px-4 sm:py-4 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-500 resize-none text-sm sm:text-lg shadow-sm hover:shadow-md transition-all ${isRTL ? 'text-right' : 'text-left'}`}
                  placeholder={t('booking.requests.placeholder', 'Tell us about any special accommodations, dietary requirements, accessibility needs, or preferences...')}
                />

                <div className="mt-4 sm:mt-6">
                  <p className={`text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    💡 {t('booking.requests.examples', 'Quick Examples:')}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3">
                    {[
                      t('booking.requests.example1', 'Wheelchair accessible room'),
                      t('booking.requests.example2', 'Quiet room'),
                      t('booking.requests.example3', 'High floor'),
                      t('booking.requests.example4', 'Twin beds'),
                      t('booking.requests.example5', 'Early check-in')
                    ].map((example, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          const current = formData.specialRequests;
                          const newText = current ? `${current}, ${example}` : example;
                          handleInputChange('specialRequests', newText);
                        }}
                        className="bg-white hover:bg-gray-50 border-2 border-gray-200 hover:border-orange-300 text-gray-700 hover:text-orange-700 px-3 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm transition-all duration-200 hover:shadow-md font-medium"
                      >
                        + {example}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );      case 6:
        return (
          <div className="space-y-4 sm:space-y-8">
            <div className={`text-center mb-4 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>              <div className="inline-flex items-center justify-center w-10 h-10 sm:w-20 sm:h-20 bg-gradient-to-r from-orange-100 to-orange-200 rounded-full mb-2 sm:mb-4">
                <DocumentTextIcon className="h-5 w-5 sm:h-10 sm:w-10 text-orange-600" />
              </div>
              <h2 className="text-lg sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                {t('booking.documents.title', 'Upload Documents')}
              </h2>
              <p className="text-sm sm:text-lg text-gray-600 max-w-md mx-auto">
                {t('booking.documents.subtitle', 'Attach relevant documents (optional)')}
              </p>
            </div>            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-200 rounded-lg sm:rounded-2xl p-4 sm:p-6">
                <FileUpload
                  files={formData.attachments}
                  onFilesChange={(files) => {
                    handleInputChange('attachments', files);
                  }}
                  maxFiles={5}
                  acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', 'application/msword']}
                  maxSize={10}
                />

                <div className="mt-4 sm:mt-6">
                  <p className={`text-sm sm:text-base font-semibold text-gray-800 mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    📎 {t('booking.documents.types', 'Accepted document types:')}
                  </p>
                  <div className="flex flex-wrap gap-2 sm:gap-3 text-xs sm:text-sm">
                    <span className="bg-white border-2 border-gray-200 text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-medium">📄 ID/Passport</span>
                    <span className="bg-white border-2 border-gray-200 text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-medium">🛂 Visa</span>
                    <span className="bg-white border-2 border-gray-200 text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-medium">🛡️ Travel Insurance</span>
                    <span className="bg-white border-2 border-gray-200 text-gray-700 px-3 py-1 sm:px-4 sm:py-2 rounded-lg font-medium">🏥 Medical Records</span>
                  </div>
                </div>

                {formData.attachments.length > 0 && (
                  <div className="mt-6 sm:mt-8">
                    <h3 className={`font-bold text-base sm:text-lg text-gray-900 mb-3 sm:mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('booking.documents.uploaded', 'Uploaded Documents')}
                    </h3>
                    <div className="space-y-2 sm:space-y-3">
                      {formData.attachments.map((file, index) => (
                        <div key={file.publicId || index} className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between bg-white border-2 border-gray-200 p-3 sm:p-4 rounded-lg hover:shadow-md transition-shadow`}>
                          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 sm:space-x-4 ${isRTL ? 'space-x-reverse' : ''} flex-1 min-w-0`}>
                            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                            </div>
                            <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                              <div className="font-semibold text-gray-900 text-sm sm:text-base truncate">{file.fileName}</div>
                              <div className="text-xs sm:text-sm text-gray-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const newAttachments = formData.attachments.filter((_, i) => i !== index);
                              handleInputChange('attachments', newAttachments);
                            }}
                            className="bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-800 px-3 py-1 sm:px-4 sm:py-2 rounded-lg transition-colors font-medium text-xs sm:text-sm ml-2 sm:ml-3 flex-shrink-0"
                          >
                            {t('common.remove', 'Remove')}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 pt-16 sm:pt-20">
      <div className="max-w-5xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <div className={`flex items-center justify-between mb-4 sm:mb-6 gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>            <button
              onClick={() => history.goBack()}
              className={`group flex items-center gap-1 sm:gap-2 text-gray-600 hover:text-orange-600 transition-all duration-200 text-sm sm:text-base bg-white px-3 sm:px-4 py-2 rounded-full shadow-sm hover:shadow-md flex-shrink-0 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-medium">{t('common.back', 'Back')}</span>
            </button>
              <div className="flex-1 text-center min-w-0">              <h1 className="text-lg sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent truncate">
                {t('booking.title', 'Complete Your Booking')}
              </h1>
            </div>
              {/* Spacer to balance the layout */}
            <div className="w-[80px] sm:w-[120px] flex-shrink-0"></div>
          </div>

          <div className="text-center">
            <p className="text-sm sm:text-lg text-gray-600">
              {hotelData.name}
            </p>
          </div>
        </div>{/* Hotel Info Card */}
        <div className="bg-white rounded-lg sm:rounded-2xl shadow-md border border-gray-100 p-3 sm:p-8 mb-4 sm:mb-12 hover:shadow-xl transition-shadow duration-300">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-start sm:items-center space-x-2 sm:space-x-6 ${isRTL ? 'space-x-reverse' : ''}`}>
            <div className="relative">
              <img
                src={hotelData.image || '/placeholder-hotel.jpg'}
                alt={hotelData.name}
                className="w-12 h-12 sm:w-24 sm:h-24 object-cover rounded-md sm:rounded-xl shadow-md flex-shrink-0"
              />              <div className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-full w-4 h-4 sm:w-6 sm:h-6 flex items-center justify-center text-xs font-bold shadow-lg">
                ★
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm sm:text-xl font-bold text-gray-900 mb-1 leading-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                {hotelData.name}
              </h3>
              <p className={`text-xs sm:text-base text-gray-600 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                {hotelData.address}, {hotelData.city}
              </p>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">                <div className={`flex items-center text-xs sm:text-sm text-gray-600 bg-gray-50 px-2 py-1 sm:px-3 sm:py-2 rounded-md sm:rounded-lg ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <CalendarIcon className={`h-3 w-3 sm:h-4 sm:w-4 text-orange-500 ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`} />
                  <span className="font-medium truncate">{hotelData.checkIn} - {hotelData.checkOut}</span>
                </div>

                <div className={`flex items-center text-xs sm:text-sm text-gray-600 bg-gray-50 px-2 py-1 sm:px-3 sm:py-2 rounded-md sm:rounded-lg ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <UserIcon className={`h-3 w-3 sm:h-4 sm:w-4 text-orange-500 ${isRTL ? 'ml-1 sm:ml-2' : 'mr-1 sm:mr-2'}`} />
                  <span className="font-medium truncate">{hotelData.adults} adults, {hotelData.rooms} room(s)</span>
                </div>
              </div>

              {/* Selected options */}
              {(formData.roomType || formData.stayType) && (
                <div className="mt-2 sm:mt-3 flex flex-wrap gap-1 sm:gap-2">                  {formData.roomType && (
                    <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium">
                      {formData.roomType}
                    </span>
                  )}
                  {formData.stayType && (
                    <span className="bg-gray-100 text-gray-700 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium">
                      {formData.stayType}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>        {/* Step Content */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 p-3 sm:p-8 lg:p-10 mb-[200px] sm:mb-4 hover:shadow-xl transition-shadow duration-300">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {renderStepContent()}
          </motion.div>
        </div>

        {/* Progress Steps and Navigation - Hidden on mobile (shown in sticky footer) */}
        <div className="hidden sm:block">
          {/* Progress Steps */}
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between max-w-4xl mx-auto px-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div                      className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-bold text-xs sm:text-base transition-all duration-300 ${
                        currentStep === step.id
                          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                          : currentStep > step.id
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircleIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="mt-1 sm:mt-2 text-center">
                      <div className={`text-xs sm:text-sm font-semibold transition-colors duration-300 ${
                        currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (                    <div className={`flex-1 h-1 mx-2 sm:mx-4 rounded-full transition-all duration-300 ${
                      currentStep > step.id
                        ? 'bg-gradient-to-r from-green-400 to-green-500'
                        : currentStep === step.id
                        ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                        : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className={`flex items-center justify-between gap-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} px-6 sm:px-8 py-3 sm:py-4 bg-white border-2 border-gray-200 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 text-sm sm:text-base font-semibold shadow-sm hover:shadow-md`}
            >
              <ArrowLeftIcon className={`h-5 w-5 text-gray-600 group-hover:text-orange-600 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
              <span className="text-gray-700 group-hover:text-orange-700 transition-colors">
                <span className="hidden sm:inline">{t('common.previous', 'Previous')}</span>
                <span className="sm:hidden">{t('common.prev', 'Prev')}</span>
              </span>
            </button>

            {currentStep < steps.length ? (              <button
                onClick={handleNext}
                className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                <span>
                  <span className="hidden sm:inline">{t('common.next', 'Next')}</span>
                  <span className="sm:hidden">{t('common.proceed', 'Continue')}</span>
                </span>
                <ArrowRightIcon className={`h-5 w-5 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 sm:px-10 py-3 sm:py-4 rounded-xl font-bold transition-all duration-200 text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:scale-105`}
              >
                <CheckCircleIcon className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>
                  <span className="hidden sm:inline">{t('booking.complete', 'Complete Booking')}</span>
                  <span className="sm:hidden">{t('booking.book', 'Book')}</span>
                </span>
              </button>
            )}
          </div>
        </div>
      </div>{/* Sticky Footer for Mobile - Progress Steps and Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">        {/* Progress Steps - Compact mobile version */}
        <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-orange-50">
          <div className="flex items-center justify-center space-x-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                    currentStep === step.id
                      ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg scale-110'
                      : currentStep > step.id
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="h-3 w-3" />
                  ) : (
                    step.id
                  )}
                </div>
                {index < steps.length - 1 && (                  <div className={`w-4 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                    currentStep > step.id
                      ? 'bg-gradient-to-r from-green-400 to-green-500'
                      : currentStep === step.id
                      ? 'bg-gradient-to-r from-orange-400 to-orange-500'
                      : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 text-center">
            <div className="text-xs font-semibold text-gray-700">
              {steps.find(step => step.id === currentStep)?.title}
            </div>
            <div className="text-xs text-gray-500">
              Step {currentStep} of {steps.length}
            </div>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className={`flex items-center justify-between gap-3 px-4 py-4 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} px-4 py-3 bg-white border-2 border-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 text-sm font-semibold shadow-sm hover:shadow-md flex-1`}
          >
            <ArrowLeftIcon className={`h-4 w-4 text-gray-600 group-hover:text-orange-600 transition-colors ${isRTL ? 'rotate-180' : ''}`} />
            <span className="text-gray-700 group-hover:text-orange-700 transition-colors">
              {t('common.prev', 'Prev')}
            </span>
          </button>

          {currentStep < steps.length ? (            <button
              onClick={handleNext}
              className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-4 py-3 rounded-lg font-semibold transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:scale-105 flex-1`}
            >
              <span>{t('common.next', 'Next')}</span>
              <ArrowRightIcon className={`h-4 w-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className={`group flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-3 rounded-lg font-bold transition-all duration-200 text-sm shadow-lg hover:shadow-xl transform hover:scale-105 flex-1`}
            >
              <CheckCircleIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span>{t('booking.book', 'Book')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Booking Confirmation Modal */}
      {showBookingModal && (
        <HotelBookingModal
          hotel={{
            id: hotelData.id,
            name: hotelData.name,
            address: hotelData.address,
            city: hotelData.city,
            country: hotelData.country,
            rating: hotelData.rating,
            image: hotelData.image,
            price: 0, // Add price logic if needed
            currency: 'SAR',
            reviewScore: hotelData.rating,
            reviewCount: 0,
            facilities: [],
            propertyClass: 0,
            reviewScoreWord: null,
            isPreferred: false,
            checkIn: null,
            checkOut: null,
            coordinates: {
              latitude: 0,
              longitude: 0
            },
            description: ''
          }}
          searchParams={{
            destination: `${hotelData.city}, ${hotelData.country}`,
            checkIn: hotelData.checkIn,
            checkOut: hotelData.checkOut,
            guests: hotelData.adults + hotelData.children,
            rooms: hotelData.rooms,            expectedCheckInTime: formData.expectedCheckInTime,
            roomType: formData.roomType,
            stayType: formData.stayType,
            paymentMethod: formData.paymentMethod,
            touristName: user?.name || '',
            phone: user?.phone || '',
            nationality: user?.nationality || 'SA',
            email: user?.email || '',
            hotelUrl: '',
            hotelPrice: selectedRateData.price.toString(),
            guests_list: formData.additionalGuests,
            notes: formData.specialRequests,
            attachments: formData.attachments,
            // Add selected rate data
            matchHash: selectedRateData.matchHash,
            roomName: selectedRateData.roomName,
            meal: selectedRateData.meal,
            currency: selectedRateData.currency
          }}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};
