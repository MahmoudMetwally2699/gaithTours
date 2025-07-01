import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import {
  XMarkIcon,
  UserIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  CreditCardIcon,
  UsersIcon,
  DocumentTextIcon,
  PaperClipIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { FileUpload, UploadedFile } from '../FileUpload';
import { HotelSelectionModal } from '../HotelSelectionModal';
import { adminAPI } from '../../services/adminAPI';
import { Hotel } from '../../types/hotel';

interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
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
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests: number;
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
    roomType: 'Standard Room',
    stayType: 'room_only',
    paymentMethod: 'bank_transfer',
    additionalGuests: [],
    notes: '',
    attachments: [],
    hotel: null,
    checkInDate: '',
    checkOutDate: '',
    numberOfGuests: 1
  });

  const [newGuest, setNewGuest] = useState({
    fullName: '',
    phoneNumber: ''
  });

  const [errors, setErrors] = useState<Partial<BookingFormData>>({});
  const steps: BookingStep[] = [
    { id: 1, title: 'Client Selection', icon: UserIcon, completed: false },
    { id: 2, title: 'Hotel Selection', icon: BuildingOfficeIcon, completed: false },
    { id: 3, title: 'Dates & Room', icon: CalendarIcon, completed: false },
    { id: 4, title: 'Payment Method', icon: CreditCardIcon, completed: false },
    { id: 5, title: 'Additional Guests', icon: UsersIcon, completed: false },
    { id: 6, title: 'Special Requests', icon: DocumentTextIcon, completed: false },
    { id: 7, title: 'Documents', icon: PaperClipIcon, completed: false }
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
      case 1: // Client Selection
        if (!formData.clientId) newErrors.clientId = 'Please select a client';
        if (!formData.touristName.trim()) newErrors.touristName = 'Tourist name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
        if (!formData.nationality.trim()) newErrors.nationality = 'Nationality is required';
        break;      case 2: // Hotel Selection
        if (!formData.hotel) {
          newErrors.hotel = 'Please select a hotel' as any;
        }
        break;case 3: // Dates & Room
        if (!formData.roomType.trim()) newErrors.roomType = 'Room type is required';
        if (!formData.stayType.trim()) newErrors.stayType = 'Stay type is required';
        if (formData.numberOfGuests < 1) (newErrors as any).numberOfGuests = 'Number of guests must be at least 1';
        break;

      case 4: // Payment Method
        if (!formData.paymentMethod.trim()) newErrors.paymentMethod = 'Payment method is required';
        break;

      // Steps 5, 6, 7 are optional
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
      const bookingData = {
        clientId: formData.clientId,
        touristName: formData.touristName,
        phone: formData.phone,
        nationality: formData.nationality,
        email: formData.email,
        expectedCheckInTime: formData.expectedCheckInTime,
        roomType: formData.roomType,
        stayType: formData.stayType,
        paymentMethod: formData.paymentMethod,
        guests: formData.additionalGuests,
        notes: formData.notes,
        attachments: formData.attachments,
        hotel: formData.hotel,
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        numberOfGuests: formData.numberOfGuests
      };

      await adminAPI.createBooking(bookingData);
      toast.success('Booking created successfully!');
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast.error(error.response?.data?.message || 'Failed to create booking');
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
      roomType: 'Standard Room',
      stayType: 'room_only',
      paymentMethod: 'bank_transfer',
      additionalGuests: [],
      notes: '',
      attachments: [],
      hotel: null,
      checkInDate: '',
      checkOutDate: '',
      numberOfGuests: 1
    });
    setCurrentStep(1);
    setErrors({});
    setClientSearch('');
    setNewGuest({ fullName: '', phoneNumber: '' });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Client Selection
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Select Client & Basic Info</h3>

            {/* Client Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client *
              </label>
              <div className="relative">                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value);
                    setShowClientDropdown(true);
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  onBlur={(e) => {
                    // Delay hiding dropdown to allow clicks on dropdown items
                    setTimeout(() => setShowClientDropdown(false), 200);
                  }}
                  placeholder="Search clients by name, email, or phone..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {showClientDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientSearch.length === 0 ? (
                      // Show all clients when no search term
                      clients.length > 0 ? (
                        clients.map((client) => (
                          <div
                            key={client._id}
                            onMouseDown={() => handleClientSelect(client)}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email} • {client.phone}</div>
                            <div className="text-xs text-gray-400">{client.nationality}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">No clients available</div>
                      )
                    ) : (
                      // Show filtered clients when searching
                      filteredClients.length > 0 ? (
                        filteredClients.map((client) => (
                          <div
                            key={client._id}
                            onMouseDown={() => handleClientSelect(client)}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{client.name}</div>
                            <div className="text-sm text-gray-500">{client.email} • {client.phone}</div>
                            <div className="text-xs text-gray-400">{client.nationality}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-500 text-center">No clients found matching "{clientSearch}"</div>
                      )
                    )}
                  </div>
                )}
              </div>
              {errors.clientId && <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>}
            </div>

            {/* Tourist Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tourist Name *
                </label>
                <input
                  type="text"
                  value={formData.touristName}
                  onChange={(e) => handleInputChange('touristName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.touristName && <p className="mt-1 text-sm text-red-600">{errors.touristName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nationality *
                </label>
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.nationality && <p className="mt-1 text-sm text-red-600">{errors.nationality}</p>}
              </div>
            </div>
          </div>
        );      case 2: // Hotel Selection
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Select Hotel</h3>

            {!formData.hotel ? (
              <div className="text-center">
                <p className="text-gray-600 mb-4">Please select a hotel from our database</p>                <button
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
                        <span className="text-yellow-500">★</span>
                        <span className="text-sm text-gray-600 ml-1">{formData.hotel.rating}/10</span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, hotel: null }))}
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

      case 3: // Dates & Room
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Dates & Room Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-in Date
                </label>
                <input
                  type="date"
                  value={formData.checkInDate}
                  onChange={(e) => handleInputChange('checkInDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Check-out Date
                </label>
                <input
                  type="date"
                  value={formData.checkOutDate}
                  onChange={(e) => handleInputChange('checkOutDate', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Check-in Time
                </label>
                <input
                  type="time"
                  value={formData.expectedCheckInTime}
                  onChange={(e) => handleInputChange('expectedCheckInTime', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Guests *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.numberOfGuests}
                  onChange={(e) => handleInputChange('numberOfGuests', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.numberOfGuests && <p className="mt-1 text-sm text-red-600">{errors.numberOfGuests}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room Type *
                </label>
                <select
                  value={formData.roomType}
                  onChange={(e) => handleInputChange('roomType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Standard Room">Standard Room</option>
                  <option value="Deluxe Room">Deluxe Room</option>
                  <option value="Suite">Suite</option>
                  <option value="Family Room">Family Room</option>
                  <option value="Single Room">Single Room</option>
                  <option value="Double Room">Double Room</option>
                  <option value="Twin Room">Twin Room</option>
                  <option value="Triple Room">Triple Room</option>
                  <option value="Quad Room">Quad Room</option>
                </select>
                {errors.roomType && <p className="mt-1 text-sm text-red-600">{errors.roomType}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stay Type *
                </label>
                <select
                  value={formData.stayType}
                  onChange={(e) => handleInputChange('stayType', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="room_only">Room Only</option>
                  <option value="bed_breakfast">Bed & Breakfast</option>
                  <option value="half_board">Half Board</option>
                  <option value="full_board">Full Board</option>
                  <option value="all_inclusive">All Inclusive</option>
                </select>
                {errors.stayType && <p className="mt-1 text-sm text-red-600">{errors.stayType}</p>}
              </div>
            </div>
          </div>
        );

      case 4: // Payment Method
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Payment Method</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Method *
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="credit_card">Credit Card</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="other">Other</option>
              </select>
              {errors.paymentMethod && <p className="mt-1 text-sm text-red-600">{errors.paymentMethod}</p>}
            </div>
          </div>
        );

      case 5: // Additional Guests
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Additional Guests</h3>

            {/* Add New Guest */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Add Guest</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newGuest.fullName}
                    onChange={(e) => setNewGuest(prev => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={newGuest.phoneNumber}
                    onChange={(e) => setNewGuest(prev => ({ ...prev, phoneNumber: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddGuest}
                disabled={!newGuest.fullName.trim() || !newGuest.phoneNumber.trim()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Add Guest
              </button>
            </div>

            {/* Guests List */}
            {formData.additionalGuests.length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 mb-4">Added Guests</h4>
                <div className="space-y-3">
                  {formData.additionalGuests.map((guest, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-4 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{guest.fullName}</div>
                        <div className="text-sm text-gray-500">{guest.phoneNumber}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGuest(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 6: // Special Requests
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Special Requests & Notes</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests or Notes
              </label>
              <textarea
                rows={6}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter any special requests, dietary requirements, accessibility needs, or other notes..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                This information will be included in the booking confirmation and sent to the hotel.
              </p>
            </div>
          </div>
        );

      case 7: // Documents
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Document Attachments</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Documents (Optional)
              </label>
              <FileUpload
                files={formData.attachments}
                onFilesChange={(files) => handleInputChange('attachments', files)}
                maxFiles={5}
                acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']}
                maxSize={10}
              />
              <p className="mt-2 text-sm text-gray-500">
                You can upload passport copies, ID documents, or other relevant files. Maximum 5 files, 10MB each.
              </p>
            </div>
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
        />
      )}
    </div>
  );
};
