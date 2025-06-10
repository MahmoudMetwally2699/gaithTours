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
  });
  const steps: BookingStep[] = [
    { id: 1, title: t('booking.steps.checkInAndRoom', 'Check-in & Room'), completed: false },
    { id: 2, title: t('booking.steps.payment', 'Payment Method'), completed: false },
    { id: 3, title: t('booking.steps.guests', 'Additional Guests'), completed: false },
    { id: 4, title: t('booking.steps.requests', 'Special Requests'), completed: false },
    { id: 5, title: t('booking.steps.documents', 'Documents'), completed: false }
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
  };
  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        if (!formData.expectedCheckInTime) {
          alert(t('booking.validation.checkInTime', 'Please select your expected check-in time'));
          return false;
        }
        if (!formData.roomType) {
          alert(t('booking.validation.roomType', 'Please select a room type'));
          return false;
        }
        if (!formData.stayType) {
          alert(t('booking.validation.stayType', 'Please select the purpose of your stay'));
          return false;
        }
        break;
      case 2:
        if (!formData.paymentMethod) {
          alert(t('booking.validation.paymentMethod', 'Please select a payment method'));
          return false;
        }
        break;
      // Steps 3, 4, 5 are optional
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
          <div className="space-y-6 sm:space-y-8">
            <div className={`text-center mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <ClockIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {t('booking.checkInTime.title', 'Check-in Details & Room Type')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {t('booking.checkInTime.subtitle', 'Help us prepare for your arrival')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
              {/* Check-in Time */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.checkInTime.label', 'Expected Check-in Time')} *
                </label>
                <input
                  type="time"
                  value={formData.expectedCheckInTime}
                  onChange={(e) => handleInputChange('expectedCheckInTime', e.target.value)}
                  className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-base sm:text-lg ${isRTL ? 'text-right' : 'text-left'}`}
                  required
                />
                <p className={`mt-2 text-xs sm:text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.checkInTime.note', 'Standard check-in time is 15:00. Early check-in subject to availability.')}
                </p>
              </div>

              {/* Room Type */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.roomType.label', 'Room Type')} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'Standard Room', label: t('booking.roomType.standard', 'Standard Room'), icon: '🛏️' },
                    { id: 'Deluxe Room', label: t('booking.roomType.deluxe', 'Deluxe Room'), icon: '🏨' },
                    { id: 'Suite', label: t('booking.roomType.suite', 'Suite'), icon: '🏛️' },
                    { id: 'Family Room', label: t('booking.roomType.family', 'Family Room'), icon: '👨‍👩‍👧‍👦' }
                  ].map((room) => (
                    <label
                      key={room.id}
                      className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all touch-manipulation ${
                        formData.roomType === room.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                      <span className="text-xl sm:text-2xl">{room.icon}</span>
                      <span className={`font-medium text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                        {room.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Stay Type */}
              <div>
                <label className={`block text-sm font-medium text-gray-700 mb-2 sm:mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.stayType.label', 'Purpose of Stay')} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'Leisure', label: t('booking.stayType.leisure', 'Leisure'), icon: '🏖️' },
                    { id: 'Business', label: t('booking.stayType.business', 'Business'), icon: '💼' },
                    { id: 'Transit', label: t('booking.stayType.transit', 'Transit'), icon: '✈️' }
                  ].map((stay) => (
                    <label
                      key={stay.id}
                      className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all touch-manipulation ${
                        formData.stayType === stay.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
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
                      <span className="text-xl sm:text-2xl">{stay.icon}</span>
                      <span className={`font-medium text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                        {stay.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );      case 2:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className={`text-center mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <CreditCardIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {t('booking.payment.title', 'How would you like to pay?')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {t('booking.payment.subtitle', 'Choose your preferred payment method')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-w-2xl mx-auto">
              {[
                { id: 'credit_card', label: t('booking.payment.creditCard', 'Credit Card'), icon: '💳' },
                { id: 'debit_card', label: t('booking.payment.debitCard', 'Debit Card'), icon: '💳' },
                { id: 'bank_transfer', label: t('booking.payment.bankTransfer', 'Bank Transfer'), icon: '🏦' },
                { id: 'cash_on_arrival', label: t('booking.payment.cashOnArrival', 'Cash on Arrival'), icon: '💵' }
              ].map((method) => (
                <label
                  key={method.id}
                  className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all touch-manipulation ${
                    formData.paymentMethod === method.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method.id}
                    checked={formData.paymentMethod === method.id}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-xl sm:text-2xl">{method.icon}</span>
                  <span className={`font-medium text-gray-900 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                    {method.label}
                  </span>
                </label>
              ))}
            </div>          </div>
        );      case 3:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className={`text-center mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <UserPlusIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {t('booking.guests.title', 'Additional Guests')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {t('booking.guests.subtitle', 'Add travel companions (optional)')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              {/* Existing Guests */}
              {formData.additionalGuests.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className={`font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('booking.guests.added', 'Added Guests')}
                  </h3>
                  <div className="space-y-2">
                    {formData.additionalGuests.map((guest, index) => (
                      <div key={index} className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between bg-gray-50 p-3 rounded-lg`}>
                        <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                          <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{guest.fullName}</div>
                          <div className="text-xs sm:text-sm text-gray-600 truncate">{guest.phoneNumber}</div>
                        </div>
                        <button
                          onClick={() => handleRemoveGuest(index)}
                          className="text-red-600 hover:text-red-700 transition-colors text-sm sm:text-base font-medium ml-3 flex-shrink-0 touch-manipulation"
                        >
                          {t('common.remove', 'Remove')}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Guest */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                <h3 className={`font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.guests.addNew', 'Add Guest')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.fullName', 'Full Name')}
                    </label>
                    <input
                      type="text"
                      value={newGuest.fullName}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, fullName: e.target.value }))}
                      className={`w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('booking.guests.namePlaceholder', 'Enter guest name')}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('common.phoneNumber', 'Phone Number')}
                    </label>
                    <input
                      type="tel"
                      value={newGuest.phoneNumber}
                      onChange={(e) => setNewGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      className={`w-full px-3 py-2 sm:py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}
                      placeholder={t('booking.guests.phonePlaceholder', 'Enter phone number')}
                    />
                  </div>
                </div>
                <button
                  onClick={handleAddGuest}
                  className="mt-3 sm:mt-4 bg-primary-600 hover:bg-primary-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base w-full sm:w-auto touch-manipulation"
                >
                  {t('booking.guests.addButton', 'Add Guest')}
                </button>
              </div>
            </div>
          </div>
        );      case 4:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className={`text-center mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <DocumentTextIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {t('booking.requests.title', 'Special Requests')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {t('booking.requests.subtitle', 'Let us know about any special needs (optional)')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <textarea
                value={formData.specialRequests}
                onChange={(e) => handleInputChange('specialRequests', e.target.value)}
                rows={4}
                className={`w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}
                placeholder={t('booking.requests.placeholder', 'Tell us about any special accommodations, dietary requirements, accessibility needs, or preferences...')}
              />

              <div className="mt-3 sm:mt-4">
                <p className={`text-xs sm:text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.requests.examples', 'Examples:')}
                </p>
                <div className="flex flex-wrap gap-2">
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
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm transition-colors touch-manipulation"
                    >
                      + {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );      case 5:
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className={`text-center mb-6 sm:mb-8 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
              <DocumentTextIcon className="h-12 w-12 sm:h-16 sm:w-16 text-primary-500 mx-auto mb-3 sm:mb-4" />
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {t('booking.documents.title', 'Upload Documents')}
              </h2>
              <p className="text-sm sm:text-base text-gray-600">
                {t('booking.documents.subtitle', 'Attach relevant documents (optional)')}
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <FileUpload
                files={formData.attachments}
                onFilesChange={(files) => {
                  handleInputChange('attachments', files);
                }}
                maxFiles={5}
                acceptedTypes={['image/jpeg', 'image/png', 'application/pdf', 'application/msword']}
                maxSize={10}
              />

              <div className="mt-3 sm:mt-4">
                <p className={`text-xs sm:text-sm text-gray-600 mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('booking.documents.types', 'Accepted document types:')}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">ID/Passport</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">Visa</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">Travel Insurance</span>
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">Medical Records</span>
                </div>
              </div>

              {formData.attachments.length > 0 && (
                <div className="mt-4 sm:mt-6">
                  <h3 className={`font-medium text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('booking.documents.uploaded', 'Uploaded Documents')}
                  </h3>
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={file.publicId || index} className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between bg-gray-50 p-3 rounded-lg`}>
                        <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-3 ${isRTL ? 'space-x-reverse' : ''} flex-1 min-w-0`}>
                          <DocumentTextIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                          <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                            <div className="font-medium text-gray-900 text-sm sm:text-base truncate">{file.fileName}</div>
                            <div className="text-xs sm:text-sm text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            const newAttachments = formData.attachments.filter((_, i) => i !== index);
                            handleInputChange('attachments', newAttachments);
                          }}
                          className="text-red-600 hover:text-red-700 transition-colors text-sm font-medium ml-3 flex-shrink-0 touch-manipulation"
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
        );

      default:
        return null;
    }
  };
  return (
    <div className="min-h-screen bg-gray-50 pt-16 sm:pt-20">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <button
            onClick={() => history.goBack()}
            className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-3 sm:mb-4 mx-auto transition-colors text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <ArrowLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
            <span>{t('common.back', 'Back')}</span>
          </button>

          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
            {t('booking.title', 'Complete Your Booking')}
          </h1>
          <p className={`text-sm sm:text-base text-gray-600 ${isRTL ? 'text-right' : 'text-left'} sm:text-center`}>
            {hotelData.name}
          </p>
        </div>        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-medium text-xs sm:text-sm ${
                    currentStep === step.id
                      ? 'bg-primary-600 text-white'
                      : currentStep > step.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.id ? (
                    <CheckCircleIcon className="h-4 w-4 sm:h-6 sm:w-6" />
                  ) : (
                    step.id
                  )}
                </div>
                <div className={`ml-2 sm:ml-3 ${isRTL ? 'mr-2 sm:mr-3 ml-0' : ''}`}>
                  <div className={`text-xs sm:text-sm font-medium ${
                    currentStep >= step.id ? 'text-gray-900' : 'text-gray-500'
                  } ${isRTL ? 'text-right' : 'text-left'}`}>
                    {step.title}
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block flex-1 h-1 mx-2 sm:mx-4 ${
                    currentStep > step.id ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>        {/* Hotel Info Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-start sm:items-center space-x-3 sm:space-x-4 ${isRTL ? 'space-x-reverse' : ''}`}>
            <img
              src={hotelData.image || '/placeholder-hotel.jpg'}
              alt={hotelData.name}
              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className={`text-base sm:text-lg font-semibold text-gray-900 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                {hotelData.name}
              </h3>
              <p className={`text-sm sm:text-base text-gray-600 truncate ${isRTL ? 'text-right' : 'text-left'}`}>
                {hotelData.address}, {hotelData.city}
              </p>

              {/* Mobile: Stack booking details vertically */}
              <div className="mt-2 space-y-1 sm:space-y-0">
                <div className={`flex items-center text-xs sm:text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <CalendarIcon className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  <span className="truncate">{hotelData.checkIn} - {hotelData.checkOut}</span>
                </div>

                <div className={`flex items-center text-xs sm:text-sm text-gray-500 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
                  <UserIcon className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                  <span>{hotelData.adults} adults, {hotelData.rooms} room(s)</span>
                </div>

                {/* Selected options */}
                {(formData.roomType || formData.stayType) && (
                  <div className={`flex flex-col sm:flex-row items-start sm:items-center text-xs sm:text-sm space-y-1 sm:space-y-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {formData.roomType && (
                      <span className="text-primary-600 font-medium">
                        {formData.roomType}
                      </span>
                    )}
                    {formData.stayType && (
                      <span className={`text-gray-400 ${formData.roomType ? 'sm:ml-2' : ''} ${isRTL && formData.roomType ? 'sm:mr-2' : ''}`}>
                        {formData.roomType ? '• ' : ''}{formData.stayType}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </div>        {/* Navigation */}
        <div className={`flex items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} px-4 sm:px-6 py-2 sm:py-3 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors text-sm sm:text-base min-w-0 flex-shrink-0`}
          >
            <ArrowLeftIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'rotate-180' : ''}`} />
            <span className="hidden sm:inline">{t('common.previous', 'Previous')}</span>
            <span className="sm:hidden">{t('common.prev', 'Prev')}</span>
          </button>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} bg-primary-600 hover:bg-primary-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base min-w-0 flex-shrink-0`}
            >              <span className="hidden sm:inline">{t('common.next', 'Next')}</span>
              <span className="sm:hidden">{t('common.proceed', 'Continue')}</span>
              <ArrowRightIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${isRTL ? 'rotate-180' : ''}`} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isRTL ? 'space-x-reverse' : ''} bg-green-600 hover:bg-green-700 text-white px-4 sm:px-8 py-2 sm:py-3 rounded-lg font-medium transition-colors text-sm sm:text-base min-w-0 flex-shrink-0`}
            >
              <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">{t('booking.complete', 'Complete Booking')}</span>
              <span className="sm:hidden">{t('booking.book', 'Book')}</span>
            </button>
          )}
        </div>
      </div>      {/* Booking Confirmation Modal */}
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
            hotelPrice: '0',
            guests_list: formData.additionalGuests,
            notes: formData.specialRequests,
            attachments: formData.attachments
          }}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};
