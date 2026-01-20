import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  XMarkIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  DocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { FileUpload, UploadedFile } from '../FileUpload';
import { HotelSelectionModal } from '../HotelSelectionModal';
import { adminAPI } from '../../services/adminAPI';
import { Hotel } from '../../types/hotel';
import { getHotelDetails } from '../../services/hotelService';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
}

interface SelectedRate {
  rateId: string;
  roomName: string;
  mealPlan: string;
  price: number;
  currency: string;
  cancellationPolicy: string;
  paymentType: string;
}

interface BookingFormData {
  clientId: string;
  touristName: string;
  phone: string;
  nationality: string;
  email: string;
  expectedCheckInTime: string;
  roomType: string;
  stayType: string;
  paymentMethod: string;
  additionalGuests: Array<{
    fullName: string;
    phoneNumber: string;
  }>;
  notes: string;
  attachments: UploadedFile[];
  hotel: Hotel | null;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  destination: string;
  selectedRate: SelectedRate | null;
}

interface BookingStep {
  id: number;
  title: string;
  icon: React.ComponentType<any>;
  completed: boolean;
}

interface AdminBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: Client[];
  isLoading: boolean;
}

export const AdminBookingModal: React.FC<AdminBookingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clients,
  isLoading
}) => {
  // const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [formData, setFormData] = useState<BookingFormData>({
    clientId: '',
    touristName: '',
    phone: '',
    nationality: '',
    email: '',
    expectedCheckInTime: '',
    roomType: '',
    stayType: '',
    paymentMethod: 'bank_transfer',
    additionalGuests: [],
    notes: '',
    attachments: [],
    hotel: null,
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1,
    destination: '',
    selectedRate: null
  });

  const [newGuest, setNewGuest] = useState({
    fullName: '',
    phoneNumber: ''
  });

  const [errors, setErrors] = useState<Partial<BookingFormData>>({});
  const [availableRates, setAvailableRates] = useState<any[]>([]);
  const [loadingRates, setLoadingRates] = useState(false);

  const steps: BookingStep[] = [
    { id: 1, title: 'Client & Dates', icon: UserIcon, completed: false },
    { id: 2, title: 'Hotel Search', icon: BuildingOfficeIcon, completed: false },
    { id: 3, title: 'Room Selection', icon: CalendarIcon, completed: false },
    { id: 4, title: 'Details', icon: ClipboardDocumentListIcon, completed: false },
    { id: 5, title: 'Review', icon: DocumentCheckIcon, completed: false }
  ];

  // Filter clients based on search
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.email.toLowerCase().includes(clientSearch.toLowerCase()) ||
    client.phone.includes(clientSearch)
  );

  // Auto-populate client data when client is selected
  useEffect(() => {
    if (formData.clientId) {
      const selectedClient = clients.find(client => client._id === formData.clientId);
      if (selectedClient) {
        setFormData(prev => ({
          ...prev,
          touristName: selectedClient.name,
          phone: selectedClient.phone,
          nationality: selectedClient.nationality,
          email: selectedClient.email
        }));
      }
    }
  }, [formData.clientId, clients]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field as keyof BookingFormData]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client._id,
      touristName: client.name,
      phone: client.phone,
      nationality: client.nationality,
      email: client.email
    }));
    setClientSearch(client.name);
    setShowClientDropdown(false);
  };

  const handleHotelSelect = (hotel: Hotel) => {
    setFormData(prev => ({
      ...prev,
      hotel: hotel
    }));
  };

  const handleAddGuest = () => {
    if (newGuest.fullName.trim() && newGuest.phoneNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        additionalGuests: [...prev.additionalGuests, { ...newGuest }]
      }));
      setNewGuest({ fullName: '', phoneNumber: '' });
    }
  };

  const handleRemoveGuest = (index: number) => {
    setFormData(prev => ({
      ...prev,
      additionalGuests: prev.additionalGuests.filter((_, i) => i !== index)
    }));
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Partial<BookingFormData> = {};

    switch (currentStep) {
      case 1: // Client & Dates
        if (!formData.clientId) newErrors.clientId = 'Please select a client';
        if (!formData.touristName.trim()) newErrors.touristName = 'Tourist name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.nationality.trim()) newErrors.nationality = 'Nationality is required';
        if (!formData.checkInDate) (newErrors as any).checkInDate = 'Check-in date is required';
        if (!formData.checkOutDate) (newErrors as any).checkOutDate = 'Check-out date is required';
        if (formData.numberOfGuests < 1) (newErrors as any).numberOfGuests = 'At least 1 guest required';
        break;
      case 2: // Hotel Search
        if (!formData.hotel) {
          newErrors.hotel = 'Please select a hotel' as any;
        }
        break;
      case 3: // Room Selection
        if (!formData.selectedRate) {
          (newErrors as any).selectedRate = 'Please select a room rate';
        }
        break;
      // Steps 4-5 are optional
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    try {
      // Normalize hotel data for backend - rating must be 0-10
      const normalizedHotel = formData.hotel ? {
        ...formData.hotel,
        rating: Math.min(formData.hotel.rating || 0, 10), // Cap rating at 10
        reviewScore: Math.min(formData.hotel.reviewScore || 0, 10), // Also cap reviewScore
      } : null;

      const bookingData = {
        clientId: formData.clientId,
        touristName: formData.touristName,
        phone: formData.phone,
        nationality: formData.nationality,
        email: formData.email,
        expectedCheckInTime: formData.expectedCheckInTime,
        roomType: formData.selectedRate?.roomName || formData.roomType || 'Standard Room',
        stayType: formData.selectedRate?.mealPlan || formData.stayType || 'room_only',
        paymentMethod: formData.paymentMethod,
        guests: formData.additionalGuests,
        notes: formData.notes,
        attachments: formData.attachments,
        hotel: normalizedHotel,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        numberOfGuests: formData.numberOfGuests
      };

      console.log('Submitting booking data:', JSON.stringify(bookingData, null, 2));

      await adminAPI.createBooking(bookingData);
      toast.success('Booking created successfully!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      console.error('Error response data:', error.response?.data);
      // Show detailed validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = errors.map((e: any) => `${e.path}: ${e.msg}`).join(', ');
        toast.error(`Validation failed: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to create booking');
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  const resetForm = () => {
    setFormData({
      clientId: '',
      touristName: '',
      phone: '',
      nationality: '',
      email: '',
      expectedCheckInTime: '',
      roomType: '',
      stayType: '',
      paymentMethod: 'bank_transfer',
      additionalGuests: [],
      notes: '',
      attachments: [],
      hotel: null,
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1,
      destination: '',
      selectedRate: null
    });
    setCurrentStep(1);
    setErrors({});
    setClientSearch('');
    setNewGuest({ fullName: '', phoneNumber: '' });
    setAvailableRates([]);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Fetch hotel rates when hotel is selected
  const fetchHotelRates = async () => {
    if (!formData.hotel || !formData.checkInDate || !formData.checkOutDate) return;

    setLoadingRates(true);
    try {
      const hotelDetails = await getHotelDetails(formData.hotel.id, {
        checkin: formData.checkInDate,
        checkout: formData.checkOutDate,
        adults: formData.numberOfGuests
      });

      if (hotelDetails?.rates) {
        setAvailableRates(hotelDetails.rates);
      } else {
        setAvailableRates([]);
      }
    } catch (error) {
      console.error('Error fetching hotel rates:', error);
      toast.error('Failed to fetch available rates');
      setAvailableRates([]);
    } finally {
      setLoadingRates(false);
    }
  };

  // Effect to fetch rates when entering step 3
  useEffect(() => {
    if (currentStep === 3 && formData.hotel) {
      fetchHotelRates();
    }
  }, [currentStep, formData.hotel?.id]);

  const handleRateSelect = (rate: any) => {
    const rateId = rate.match_hash || rate.rateId || rate.id || `rate-${Date.now()}`;
    setFormData(prev => ({
      ...prev,
      selectedRate: {
        rateId: rateId,
        roomName: rate.room_name || rate.roomName || 'Standard Room',
        mealPlan: rate.meal || rate.mealPlan || rate.meal_plan || 'Room Only',
        price: rate.price || rate.amount,
        currency: rate.currency || 'SAR',
        cancellationPolicy: rate.cancellation_policies ? 'Refundable' : 'Non-refundable',
        paymentType: rate.payment_type || rate.paymentType || 'prepaid'
      },
      roomType: rate.room_name || rate.roomName || 'Standard Room',
      stayType: rate.meal || rate.mealPlan || rate.meal_plan || 'room_only'
    }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Client & Dates
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Client & Search Criteria</h3>

            {/* Client Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
                  placeholder="Search clients by name, email, or phone..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {(clientSearch.length === 0 ? clients : filteredClients).length > 0 ? (
                      (clientSearch.length === 0 ? clients : filteredClients).map((client) => (
                        <div
                          key={client._id}
                          onMouseDown={() => handleClientSelect(client)}
                          className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.email} • {client.phone}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-center">No clients found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
            </div>

            {/* Client Details (auto-filled) */}
            {formData.clientId && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                <div><span className="text-gray-600">Name:</span> <span className="font-medium">{formData.touristName}</span></div>
                <div><span className="text-gray-600">Email:</span> <span className="font-medium">{formData.email}</span></div>
                <div><span className="text-gray-600">Phone:</span> <span className="font-medium">{formData.phone}</span></div>
                <div><span className="text-gray-600">Nationality:</span> <span className="font-medium">{formData.nationality}</span></div>
              </div>
            )}

            {/* Dates & Guests */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-in Date *</label>
                <input
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {(errors as any).checkInDate && <p className="mt-1 text-sm text-red-600">{(errors as any).checkInDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Check-out Date *</label>
                <input
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                  min={formData.checkInDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {(errors as any).checkOutDate && <p className="mt-1 text-sm text-red-600">{(errors as any).checkOutDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Number of Guests *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfGuests}
                  onChange={(e) => handleInputChange('numberOfGuests', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {(errors as any).numberOfGuests && <p className="mt-1 text-sm text-red-600">{(errors as any).numberOfGuests}</p>}
              </div>
            </div>
          </div>
        );

      case 2: // Hotel Search
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Select Hotel</h3>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-blue-700">
                <strong>Search Criteria:</strong> {formData.checkInDate} to {formData.checkOutDate} • {formData.numberOfGuests} guest(s)
              </p>
            </div>

            {!formData.hotel ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">Search for hotels with real-time availability and pricing</p>
                <button
                  type="button"
                  onClick={() => setShowHotelSelection(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Browse Hotels
                </button>
                {errors.hotel && <p className="mt-2 text-sm text-red-600">{typeof errors.hotel === 'string' ? errors.hotel : 'Please select a hotel'}</p>}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  {formData.hotel.image && (
                    <img
                      src={formData.hotel.image}
                      alt={formData.hotel.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900">{formData.hotel.name}</h4>
                    <p className="text-gray-600">{formData.hotel.address}</p>
                    <p className="text-gray-600">{formData.hotel.city}, {formData.hotel.country}</p>
                    {formData.hotel.rating > 0 && (
                      <div className="flex items-center mt-2">
                        <StarIcon className="h-5 w-5 text-yellow-500 fill-current" />
                        <span className="text-sm text-gray-600 ml-1">{formData.hotel.rating}/10</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, hotel: null, selectedRate: null }));
                      setAvailableRates([]);
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHotelSelection(true)}
                  className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Change Hotel
                </button>
              </div>
            )}
          </div>
        );

      case 3: // Room Selection
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Select Room & Rate</h3>

            {/* Selected Hotel Summary */}
            {formData.hotel && (
              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                {formData.hotel.image && <img src={formData.hotel.image} alt="" className="w-12 h-12 rounded object-cover" />}
                <div>
                  <p className="font-medium text-gray-900">{formData.hotel.name}</p>
                  <p className="text-sm text-gray-600">{formData.checkInDate} to {formData.checkOutDate}</p>
                </div>
              </div>
            )}

            {loadingRates ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-blue-200 rounded-full animate-spin border-t-blue-500"></div>
                <p className="mt-4 text-gray-600">Loading available rates...</p>
              </div>
            ) : availableRates.length > 0 ? (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                {availableRates.map((rate, index) => {
                  const rateId = rate.match_hash || rate.rateId || rate.id || `rate-${index}`;
                  const isSelected = formData.selectedRate?.rateId === rateId;
                  return (
                    <div
                      key={rateId}
                      onClick={() => handleRateSelect(rate)}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-900">{rate.room_name || rate.roomName}</h4>
                          <p className="text-sm text-gray-600">{rate.meal || rate.mealPlan || rate.meal_plan || 'Room Only'}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {rate.cancellation_policies ? 'Free cancellation' : 'Non-refundable'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-blue-600">
                            {rate.currency || 'SAR'} {(rate.price || rate.amount)?.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">Total</p>
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-2 flex items-center text-blue-600">
                          <CheckIcon className="h-5 w-5 mr-1" />
                          <span className="text-sm font-medium">Selected</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <p className="text-gray-600">No rates available for the selected dates.</p>
                <button
                  type="button"
                  onClick={fetchHotelRates}
                  className="mt-4 px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
                >
                  Retry
                </button>
              </div>
            )}

            {(errors as any).selectedRate && <p className="mt-2 text-sm text-red-600">{(errors as any).selectedRate}</p>}
          </div>
        );

      case 4: // Additional Details
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h3>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Expected Check-in Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Expected Check-in Time</label>
              <input
                type="time"
                value={formData.expectedCheckInTime}
                onChange={(e) => handleInputChange('expectedCheckInTime', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Additional Guests */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-3">Additional Guests (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newGuest.fullName}
                  onChange={(e) => setNewGuest(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Full Name"
                  className="px-4 py-2 border border-gray-300 rounded-lg"
                />
                <div className="flex space-x-2">
                  <input
                    type="tel"
                    value={newGuest.phoneNumber}
                    onChange={(e) => setNewGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    placeholder="Phone Number"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleAddGuest}
                    disabled={!newGuest.fullName.trim() || !newGuest.phoneNumber.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    Add
                  </button>
                </div>
              </div>
              {formData.additionalGuests.length > 0 && (
                <div className="mt-3 space-y-2">
                  {formData.additionalGuests.map((guest, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded border">
                      <span>{guest.fullName} • {guest.phoneNumber}</span>
                      <button onClick={() => handleRemoveGuest(index)} className="text-red-600">
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Requests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Special Requests / Notes</label>
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter any special requests..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Documents (Optional)</label>
              <FileUpload
                files={formData.attachments}
                onFilesChange={(files) => handleInputChange('attachments', files)}
                maxFiles={5}
                acceptedTypes={['image/jpeg', 'image/png', 'application/pdf']}
                maxSize={10}
              />
            </div>
          </div>
        );

      case 5: // Review & Confirm
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Review & Confirm</h3>

            {/* Guest Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Guest Information</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">Name:</span> {formData.touristName}</div>
                <div><span className="text-gray-600">Email:</span> {formData.email}</div>
                <div><span className="text-gray-600">Phone:</span> {formData.phone}</div>
                <div><span className="text-gray-600">Nationality:</span> {formData.nationality}</div>
              </div>
            </div>

            {/* Hotel & Room */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Hotel & Room</h4>
              {formData.hotel && (
                <div className="flex items-start space-x-3">
                  {formData.hotel.image && <img src={formData.hotel.image} alt="" className="w-16 h-16 rounded object-cover" />}
                  <div>
                    <p className="font-semibold">{formData.hotel.name}</p>
                    <p className="text-sm text-gray-600">{formData.hotel.city}, {formData.hotel.country}</p>
                    {formData.selectedRate && (
                      <>
                        <p className="text-sm mt-1"><strong>Room:</strong> {formData.selectedRate.roomName}</p>
                        <p className="text-sm"><strong>Meal Plan:</strong> {formData.selectedRate.mealPlan}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Dates & Price */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Dates & Pricing</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">Check-in:</span> {formData.checkInDate}</div>
                <div><span className="text-gray-600">Check-out:</span> {formData.checkOutDate}</div>
                <div><span className="text-gray-600">Guests:</span> {formData.numberOfGuests}</div>
                <div><span className="text-gray-600">Payment:</span> {formData.paymentMethod.replace('_', ' ')}</div>
              </div>
              {formData.selectedRate && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <p className="text-lg font-bold text-green-700">
                    Total: {formData.selectedRate.currency} {formData.selectedRate.price?.toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {formData.notes && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Special Requests</h4>
                <p className="text-sm text-gray-700">{formData.notes}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 p-4">
      <div className="flex items-center justify-center min-h-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Create New Booking</h2>
              <button
                onClick={handleClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80">Step {currentStep} of {steps.length}</span>
                <span className="text-sm text-white/80">{Math.round((currentStep / steps.length) * 100)}%</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div
                  className="bg-white rounded-full h-2 transition-all duration-300"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Step Icons */}
            <div className="flex justify-between items-center mt-4">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;

                return (
                  <div key={step.id} className="flex flex-col items-center">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                      ${isActive ? 'bg-white text-blue-600' :
                        isCompleted ? 'bg-green-500 text-white' : 'bg-white/20 text-white/60'}
                    `}>
                      {isCompleted ? (
                        <CheckIcon className="h-5 w-5" />
                      ) : (
                        <StepIcon className="h-5 w-5" />
                      )}
                    </div>
                    <span className="text-xs text-white/80 mt-1 text-center hidden md:block">
                      {step.title}
                    </span>
                  </div>
                );
              })}
            </div>          </div>          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-1" />
              Previous
            </button>

            <div className="flex items-center space-x-3">
              {currentStep < steps.length ? (
                <button
                  onClick={handleNext}
                  className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? 'Creating...' : 'Create Booking'}
                </button>
              )}
            </div>
          </div>        </motion.div>
      </div>

      {/* Hotel Selection Modal */}
      {showHotelSelection && (
        <HotelSelectionModal
          isOpen={showHotelSelection}
          onClose={() => setShowHotelSelection(false)}
          onSelectHotel={handleHotelSelect}
          checkInDate={formData.checkInDate}
          checkOutDate={formData.checkOutDate}
          adults={formData.numberOfGuests}
        />
      )}
    </div>
  );
};
