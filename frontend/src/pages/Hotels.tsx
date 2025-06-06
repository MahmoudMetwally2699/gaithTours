import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { HotelSelectionModal } from '../components/HotelSelectionModal';
import { HotelBookingModal } from '../components/HotelBookingModal';
import { FileUpload, UploadedFile } from '../components/FileUpload';
import { Hotel } from '../types/hotel';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import {
  CalendarIcon,
  UserGroupIcon,
  MapPinIcon,
  StarIcon,
  ClockIcon,
  CreditCardIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  UserIcon,
  HomeIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import {
  SparklesIcon,
  HeartIcon,
  CheckCircleIcon
} from '@heroicons/react/24/solid';
import ReactCountryDropdown from 'react-country-dropdown';



// Helper function to get country code from phone number
const getCountryFromPhone = (phone: string): string => {
  if (!phone) return 'SA'; // Default fallback
    // Remove any spaces, dashes, or plus signs to get just the country code
  const cleanPhone = phone.replace(/[\s\-+]/g, '');

  // Map common country codes to country abbreviations
  const phoneToCountry: { [key: string]: string } = {
    '966': 'SA', // Saudi Arabia
    '971': 'AE', // UAE
    '965': 'KW', // Kuwait
    '973': 'BH', // Bahrain
    '974': 'QA', // Qatar
    '968': 'OM', // Oman
    '20': 'EG',  // Egypt
    '962': 'JO', // Jordan
    '961': 'LB', // Lebanon
    '963': 'SY', // Syria
    '964': 'IQ', // Iraq
    '967': 'YE', // Yemen
    '1': 'US',   // United States
    '44': 'GB',  // United Kingdom
    '33': 'FR',  // France
    '49': 'DE',  // Germany
    '39': 'IT',  // Italy
    '34': 'ES',  // Spain
    '91': 'IN',  // India
    '92': 'PK',  // Pakistan
    '880': 'BD', // Bangladesh
    '60': 'MY',  // Malaysia
    '65': 'SG',  // Singapore
    '66': 'TH',  // Thailand
    '84': 'VN',  // Vietnam
    '86': 'CN',  // China
    '81': 'JP',  // Japan
    '82': 'KR',  // South Korea
  };

  // Check for country codes of different lengths
  for (let i = 1; i <= 4; i++) {
    const code = cleanPhone.substring(0, i);
    if (phoneToCountry[code]) {
      return phoneToCountry[code];
    }
  }

  return 'SA'; // Default fallback
};

// Helper function to get country code from nationality
const getCountryFromNationality = (nationality: string): string => {
  if (!nationality) return 'SA'; // Default fallback

  const nationalityLower = nationality.toLowerCase();

  // Map nationalities to country codes
  const nationalityToCountry: { [key: string]: string } = {
    'saudi': 'SA',
    'saudi arabian': 'SA',
    'emirati': 'AE',
    'uae': 'AE',
    'kuwaiti': 'KW',
    'bahraini': 'BH',
    'qatari': 'QA',
    'omani': 'OM',
    'egyptian': 'EG',
    'jordanian': 'JO',
    'lebanese': 'LB',
    'syrian': 'SY',
    'iraqi': 'IQ',
    'yemeni': 'YE',
    'american': 'US',
    'british': 'GB',
    'french': 'FR',
    'german': 'DE',
    'italian': 'IT',
    'spanish': 'ES',
    'indian': 'IN',
    'pakistani': 'PK',
    'bangladeshi': 'BD',
    'malaysian': 'MY',
    'singaporean': 'SG',
    'thai': 'TH',
    'vietnamese': 'VN',
    'chinese': 'CN',
    'japanese': 'JP',
    'korean': 'KR',
  };

  for (const [key, value] of Object.entries(nationalityToCountry)) {
    if (nationalityLower.includes(key)) {
      return value;
    }
  }

  return 'SA'; // Default fallback
};

export const Hotels: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isRTL } = useDirection();
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [showHotelSelection, setShowHotelSelection] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);const [formData, setFormData] = useState({
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
    phoneCountryCode: user?.phone ? getCountryFromPhone(user.phone) || 'SA' : 'SA',
    nationality: user?.nationality || '',
    nationalityCountry: user?.nationality ? getCountryFromNationality(user.nationality) || 'SA' : 'SA',
    email: user?.email || '',
    hotelUrl: '',
    hotelPrice: '',
    guests_list: [] as Array<{ fullName: string; phoneNumber: string; phoneCountryCode: string }>,
    attachments: [] as UploadedFile[]
  });

  const [loading] = useState(false);
  const [error, setError] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [newGuest, setNewGuest] = useState({ fullName: '', phoneNumber: '', phoneCountryCode: 'SA' });  // Auto-populate personal information when user data is available
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        touristName: user.name || prev.touristName,
        phone: user.phone || prev.phone,
        phoneCountryCode: user.phone ? (getCountryFromPhone(user.phone) || 'SA') : prev.phoneCountryCode,
        nationality: user.nationality || prev.nationality,
        nationalityCountry: user.nationality ? (getCountryFromNationality(user.nationality) || 'SA') : prev.nationalityCountry,
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
      setError(t('hotels.selectHotelFirst', 'Please select a hotel first'));
      return;
    }

    // Validate required fields
    if (!formData.touristName || !formData.phone || !formData.nationality ||
        !formData.email || !formData.roomType || !formData.stayType ||
        !formData.paymentMethod) {
      setError(t('hotels.fillRequiredFields', 'Please fill in all required fields'));
      return;
    }

    setShowBookingModal(true);
  };  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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
      setNewGuest({ fullName: '', phoneNumber: '', phoneCountryCode: 'SA' });
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
  };  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50/30 via-amber-50/40 to-yellow-50/30">
      {/* Modern Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-200/60 via-amber-200/70 to-yellow-200/60"></div>
        <div className="absolute inset-0"
             style={{
               backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
             }}></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >            <div className={`flex justify-center mb-6`}>              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 bg-white/20 backdrop-blur-md rounded-full px-6 py-3 border border-white/30`}>
                <SparklesIcon className="h-5 w-5 text-amber-400" />
                <span className="text-gray-700 font-medium">{t('hotels.premiumBooking', 'Premium Hotel Booking')}</span>
              </div>
            </div>            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-gray-800">
              {t('hotels.title', 'Discover Your')}
              <span className="block text-orange-600">{t('hotels.perfectStay', 'Perfect Stay')}</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              {t('hotels.subtitle', 'Experience luxury and comfort with our carefully curated selection of premium hotels worldwide')}
            </p>            <div className={`flex justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-8 text-gray-600`}>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <span>{t('whyChooseUs.bestPrice.title', 'Best Price Guarantee')}</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <span>{t('whyChooseUs.support.title', '24/7 Customer Support')}</span>
              </div>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <CheckCircleIcon className="h-5 w-5 text-emerald-500" />
                <span>{t('common.instantConfirmation', 'Instant Confirmation')}</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modern Form Section */}
      <div className="relative -mt-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
        >          {/* Form Header */}          <div className={`bg-gradient-to-r from-orange-50/50 to-amber-50/50 px-8 py-6 border-b border-orange-100/50`}>
            <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
              <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-amber-400 rounded-2xl flex items-center justify-center shadow-lg">
                <HomeIcon className="h-6 w-6 text-white" />
              </div>              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('hotels.bookingForm.title', 'Hotel Booking Form')}</h2>
                <p className="text-gray-600">{t('hotels.bookingForm.subtitle', 'Fill in your details to reserve your perfect stay')}</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleFormSubmit} className="p-8 space-y-8">            {/* Hotel Selection Card */}            <div className="bg-gradient-to-r from-orange-50/80 to-amber-50/80 rounded-2xl p-6 border border-orange-200/60">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center shadow-sm">
                  <MapPinIcon className="h-5 w-5 text-white" />
                </div>                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.selectYourHotel', 'Select Your Hotel')}</h3>
                <span className="text-red-500 text-sm">*</span>
              </div>

              <div
                onClick={() => setShowHotelSelection(true)}
                className="border-2 border-dashed border-orange-300/70 rounded-xl p-6 cursor-pointer hover:border-orange-400 hover:bg-orange-50/50 transition-all duration-300 group"
              >                {selectedHotel ? (                  <div className={`flex flex-col sm:flex-row items-start sm:items-center ${isRTL ? 'sm:space-x-reverse' : ''} sm:space-x-4 space-y-4 sm:space-y-0`}>
                    <div className="relative flex-shrink-0">
                      <img
                        src={selectedHotel.image || '/placeholder-hotel.jpg'}
                        alt={selectedHotel.name}
                        className="w-24 h-24 sm:w-20 sm:h-20 rounded-xl object-cover shadow-lg"
                      />
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-1 truncate">{selectedHotel.name}</h4>
                      <p className="text-sm sm:text-base text-gray-600 mb-2 line-clamp-2">{selectedHotel.address}, {selectedHotel.city}</p>
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(selectedHotel.rating || 0)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className={`text-sm font-medium text-gray-700 ${isRTL ? 'mr-1' : 'ml-1'}`}>
                            {selectedHotel.rating?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-orange-600 group-hover:text-orange-700 self-center sm:self-auto">
                      <span className="text-sm font-medium">{t('common.clickToChange', 'Click to change')}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <MapPinIcon className="h-8 w-8 text-orange-500" />
                    </div>                    <h4 className="text-lg font-semibold text-gray-900 mb-2">{t('hotels.chooseYourHotel', 'Choose Your Hotel')}</h4>
                    <p className="text-gray-600">{t('hotels.clickToBrowse', 'Click here to browse and select from our premium hotel collection')}</p>
                  </div>
                )}
              </div>
            </div>            {/* Hotel Details Card */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hotel URL */}              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                  <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                    <GlobeAltIcon className="h-5 w-5 text-white" />
                  </div>                  <h3 className="text-lg font-semibold text-gray-900">{t('common.hotelWebsite', 'Hotel Website')}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('common.optional', 'Optional')}</span>
                </div>
                <input
                  type="url"
                  name="hotelUrl"
                  value={formData.hotelUrl}
                  onChange={handleInputChange}
                  placeholder={t('hotels.hotelWebsitePlaceholder', 'https://hotel-website.com')}
                  className="w-full px-4 py-3 border border-emerald-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200"
                />                <p className={`text-xs text-gray-600 mt-2 flex items-center`}>
                  <span className={`w-2 h-2 bg-emerald-400 rounded-full ${isRTL ? 'ml-2' : 'mr-2'}`}></span>
                  {t('hotels.hotelWebsiteDescription', 'Add a direct link to the hotel\'s website or booking page')}
                </p>
              </div>

              {/* Expected Price */}              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                  <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-white" />
                  </div>                  <h3 className="text-lg font-semibold text-gray-900">{t('hotels.expectedPrice', 'Expected Price')}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('common.optional', 'Optional')}</span>
                </div>
                <div className="relative">                  <input
                    type="number"
                    name="hotelPrice"
                    value={formData.hotelPrice}
                    onChange={handleInputChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className={`w-full px-4 py-3 ${isRTL ? 'pr-12' : 'pl-12'} border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200`}
                  />
                  <span className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 text-amber-600 font-medium`}>SAR</span>
                </div>                <p className={`text-xs text-gray-600 mt-2 flex items-center`}>
                  <span className={`w-2 h-2 bg-amber-400 rounded-full ${isRTL ? 'ml-2' : 'mr-2'}`}></span>
                  {t('hotels.expectedPriceDescription', 'Expected price per night in Saudi Riyal')}
                </p>
              </div>
            </div>            {/* Travel Dates Card */}            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <CalendarIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.travelDates', 'Travel Dates')}</h3>
                <span className="text-red-500 text-sm">*</span>
              </div>              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.checkInDate', 'Check-in Date')}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="checkIn"
                      value={formData.checkIn}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base`}
                    />
                    <CalendarIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-purple-500`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.checkOutDate', 'Check-out Date')}
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      name="checkOut"
                      value={formData.checkOut}
                      onChange={handleInputChange}
                      required
                      min={formData.checkIn || new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base`}
                    />
                    <CalendarIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-purple-500`} />
                  </div>
                </div>
              </div>
            </div>            {/* Guests & Rooms Card */}            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.accommodationDetails', 'Accommodation Details')}</h3>
                <span className="text-red-500 text-sm">*</span>
              </div>              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.numberOfGuests', 'Number of Guests')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="guests"
                      value={formData.guests}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      required
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base`}
                    />
                    <UserGroupIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-cyan-500`} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.numberOfRooms', 'Number of Rooms')}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      name="rooms"
                      value={formData.rooms}
                      onChange={handleInputChange}
                      min="1"
                      max="5"
                      required
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-cyan-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base`}
                    />
                    <HomeIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-cyan-500`} />
                  </div>
                </div>
              </div>
            </div>{/* Personal Information Card */}            <div className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-6 border border-rose-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                <div className="w-10 h-10 bg-rose-500 rounded-xl flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('personalInformation.title', 'Personal Information')}</h3>
                <span className="text-red-500 text-sm">*</span>
              </div>              <div className="space-y-3 sm:space-y-4">                {/* Tourist Name Card */}
                <div className={`flex items-start gap-3 p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-rose-200/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-6">
                    <UserIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
                  </div>                  <div className="flex-1 min-w-0">
                    <label className={`block text-xs sm:text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('personalInformation.touristName', 'Tourist Name')} *
                    </label>                    <input
                      type="text"
                      name="touristName"
                      value={formData.touristName}
                      onChange={handleInputChange}
                      required
                      placeholder={t('personalInformation.enterFullName', 'Enter your full name')}
                      className="w-full px-4 py-2 sm:py-2.5 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white/80 transition-all duration-200 text-sm"
                      style={{
                        minWidth: '200px',
                        textAlign: isRTL ? 'right' : 'left',
                        direction: isRTL ? 'rtl' : 'ltr'
                      }}
                    />
                  </div>
                </div>                {/* Phone Number Card */}
                <div className={`flex items-start gap-3 p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-rose-200/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-6">
                    <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
                  </div>                  <div className="flex-1 min-w-0">
                    <label className={`block text-xs sm:text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('personalInformation.phoneNumber', 'Phone Number')} *
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <div className="w-full sm:w-1/3 min-w-0">
                        <ReactCountryDropdown
                          defaultCountry={formData.phoneCountryCode || 'SA'}
                          onSelect={(country) => {
                            if (country && country.callingCodes && country.callingCodes[0]) {
                              setFormData({
                                ...formData,
                                phoneCountryCode: country.code
                              });
                            }
                          }}
                        />
                      </div>
                      <div className="w-full sm:w-2/3 min-w-0">                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          placeholder={t('personalInformation.enterPhoneNumber', 'Enter phone number')}
                          className="w-full px-4 py-2 sm:py-2.5 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white/80 transition-all duration-200 text-sm"
                          style={{
                            minWidth: '120px',
                            textAlign: isRTL ? 'right' : 'left',
                            direction: isRTL ? 'rtl' : 'ltr'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>                {/* Nationality Card */}
                <div className={`flex items-start gap-3 p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-rose-200/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-6">
                    <svg className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>                  <div className="flex-1 min-w-0">
                    <label className={`block text-xs sm:text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('personalInformation.nationality', 'Nationality')} *
                    </label>
                    <div className="w-full">
                      <ReactCountryDropdown
                        defaultCountry={formData.nationalityCountry || 'SA'}
                        onSelect={(country) => {
                          if (country && country.citizen && country.code) {
                            setFormData({
                              ...formData,
                              nationalityCountry: country.code,
                              nationality: country.citizen
                            });
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>{/* Email Address Card */}
                <div className={`flex items-start gap-3 p-3 sm:p-4 bg-white/70 backdrop-blur-sm rounded-xl border border-rose-200/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-6">
                    <EnvelopeIcon className="h-4 w-4 sm:h-5 sm:w-5 text-rose-600" />
                  </div>                  <div className="flex-1 min-w-0">
                    <label className={`block text-xs sm:text-sm font-medium text-gray-700 mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('personalInformation.emailAddress', 'Email Address')} *
                    </label>                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder={t('personalInformation.enterEmailAddress', 'Enter email address')}
                      className="w-full px-4 py-2 sm:py-2.5 border border-rose-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent bg-white/80 transition-all duration-200 text-sm"
                      style={{
                        minWidth: '200px',
                        textAlign: isRTL ? 'right' : 'left',
                        direction: isRTL ? 'rtl' : 'ltr'
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>            {/* Booking Details Card */}            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <CreditCardIcon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.bookingDetails', 'Booking Details')}</h3>
                <span className="text-red-500 text-sm">*</span>
              </div>              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.expectedCheckInTime', 'Expected Check-in Time')}
                  </label>
                  <div className="relative">
                    <input
                      type="time"
                      name="expectedCheckInTime"
                      value={formData.expectedCheckInTime}
                      onChange={handleInputChange}
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base`}
                    />
                    <ClockIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-500`} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.roomType', 'Room Type')} *
                  </label>
                  <select
                    name="roomType"
                    value={formData.roomType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base"
                  >
                    <option value="single">{t('hotels.roomTypes.single', 'Single Room')}</option>
                    <option value="double">{t('hotels.roomTypes.double', 'Double Room')}</option>
                    <option value="twin">{t('hotels.roomTypes.twin', 'Twin Room')}</option>
                    <option value="triple">{t('hotels.roomTypes.triple', 'Triple Room')}</option>
                    <option value="quad">{t('hotels.roomTypes.quad', 'Quad Room')}</option>
                    <option value="suite">{t('hotels.roomTypes.suite', 'Suite')}</option>
                    <option value="family">{t('hotels.roomTypes.family', 'Family Room')}</option>
                    <option value="deluxe">{t('hotels.roomTypes.deluxe', 'Deluxe Room')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.stayType', 'Stay Type')} *
                  </label>
                  <select
                    name="stayType"
                    value={formData.stayType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 text-sm sm:text-base"
                  >
                    <option value="room_only">{t('hotels.stayTypes.roomOnly', 'Room Only')}</option>
                    <option value="bed_breakfast">{t('hotels.stayTypes.bedBreakfast', 'Bed & Breakfast')}</option>
                    <option value="half_board">{t('hotels.stayTypes.halfBoard', 'Half Board')}</option>
                    <option value="full_board">{t('hotels.stayTypes.fullBoard', 'Full Board')}</option>
                    <option value="all_inclusive">{t('hotels.stayTypes.allInclusive', 'All Inclusive')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 truncate">
                    {t('hotels.paymentMethod', 'Payment Method')} *
                  </label>
                  <div className="relative">
                    <select
                      name="paymentMethod"
                      value={formData.paymentMethod}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${isRTL ? 'pr-10 sm:pr-12' : 'pl-10 sm:pl-12'} border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 appearance-none text-sm sm:text-base`}
                    >
                      <option value="">{t('hotels.selectPaymentMethod', 'Select Payment Method')}</option>
                      <option value="credit_card">{t('hotels.paymentMethods.creditCard', 'Credit Card')}</option>
                      <option value="debit_card">{t('hotels.paymentMethods.debitCard', 'Debit Card')}</option>
                      <option value="bank_transfer">{t('hotels.paymentMethods.bankTransfer', 'Bank Transfer')}</option>
                      <option value="cash_on_arrival">{t('hotels.paymentMethods.cashOnArrival', 'Cash on Arrival')}</option>
                      <option value="digital_wallet">{t('hotels.paymentMethods.digitalWallet', 'Digital Wallet')}</option>
                      <option value="check">{t('hotels.paymentMethods.check', 'Check')}</option>
                    </select>
                    <CreditCardIcon className={`absolute ${isRTL ? 'right-3 sm:right-4' : 'left-3 sm:left-4'} top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-indigo-500`} />
                  </div>
                </div>
              </div>
            </div>            {/* Additional Guests Card */}            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-6`}>
                <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>                  <h3 className="text-lg font-semibold text-gray-900">{t('hotels.additionalGuests', 'Additional Guests')}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('common.optional', 'Optional')}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowGuestForm(true)}
                  className={`w-full sm:w-auto bg-green-500 text-white px-4 py-2.5 sm:py-2 rounded-xl hover:bg-green-600 transition-all duration-200 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 shadow-lg hover:shadow-xl text-sm sm:text-base`}
                >                  <PlusIcon className="h-4 w-4" />
                  <span>{t('hotels.addGuest', 'Add Guest')}</span>
                </motion.button>
              </div>

              {/* Existing Guests List */}
              {formData.guests_list.length > 0 && (
                <div className="space-y-3 mb-6">
                  {formData.guests_list.map((guest, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}                      className={`flex items-center justify-between bg-white/70 backdrop-blur-sm p-4 rounded-xl border border-green-200 shadow-sm`}
                    >
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{guest.fullName}</p>
                          <p className={`text-sm text-gray-600 flex items-center`}>
                            <PhoneIcon className={`h-4 w-4 ${isRTL ? 'ml-1' : 'mr-1'} text-gray-400`} />
                            {guest.phoneNumber}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        type="button"
                        onClick={() => handleRemoveGuest(index)}
                        className="w-8 h-8 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-all duration-200 flex items-center justify-center"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Add Guest Form */}
              {showGuestForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white/70 backdrop-blur-sm p-6 rounded-xl border border-green-200 space-y-4"
                >                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-4`}>
                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                      <PlusIcon className="h-3 w-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-gray-900">{t('hotels.addGuestInformation', 'Add Guest Information')}</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('hotels.guestFullName', 'Guest\'s Full Name')} *
                      </label>
                      <div className="relative">
                        <input                          type="text"
                          name="fullName"
                          value={newGuest.fullName}
                          onChange={handleNewGuestChange}
                          required
                          placeholder={t('hotels.enterGuestFullName', 'Enter guest\'s full name')}
                          className={`w-full px-4 py-3 ${isRTL ? 'pr-12' : 'pl-12'} border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200`}
                        />
                        <UserIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500`} />
                      </div>
                    </div>                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {t('hotels.guestPhoneNumber', 'Guest\'s Phone Number')} *
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="w-full sm:w-1/3">
                          <ReactCountryDropdown
                            defaultCountry={newGuest.phoneCountryCode || 'SA'}
                            onSelect={(country) => {
                              if (country && country.code) {
                                setNewGuest({
                                  ...newGuest,
                                  phoneCountryCode: country.code
                                });
                              }
                            }}
                          />
                        </div>
                        <div className="w-full sm:w-2/3 relative">
                          <input                            type="tel"
                            name="phoneNumber"
                            value={newGuest.phoneNumber}
                            onChange={handleNewGuestChange}
                            required
                            placeholder={t('hotels.enterGuestPhoneNumber', 'Enter guest\'s phone number')}
                            className={`w-full px-4 py-3 ${isRTL ? 'pr-12' : 'pl-12'} border border-green-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200`}
                          />
                          <PhoneIcon className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-green-500`} />
                        </div>
                      </div>
                    </div>
                  </div>                  <div className={`flex flex-col sm:flex-row ${isRTL ? 'sm:space-x-reverse' : ''} sm:space-x-3 gap-3 pt-4`}>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={handleAddGuest}
                      className={`w-full sm:w-auto bg-green-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-green-700 transition-all duration-200 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 shadow-lg text-sm sm:text-base`}
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{t('common.addGuest', 'Add Guest')}</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => {
                        setShowGuestForm(false);
                        setNewGuest({ fullName: '', phoneNumber: '', phoneCountryCode: 'SA' });
                      }}
                      className={`w-full sm:w-auto bg-gray-200 text-gray-700 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl hover:bg-gray-300 transition-all duration-200 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-sm sm:text-base`}
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>{t('common.cancel', 'Cancel')}</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {formData.guests_list.length === 0 && !showGuestForm && (
                <div className="text-center py-8 text-gray-500">
                  <UserGroupIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />                  <p className="text-sm">{t('hotels.noAdditionalGuests', 'No additional guests added yet')}</p>
                  <p className="text-xs text-gray-400 mt-1">{t('hotels.clickAddGuest', 'Click "Add Guest" to include travel companions')}</p>
                </div>
              )}
            </div>            {/* Special Requests Card */}            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
                  <HeartIcon className="h-5 w-5 text-white" />
                </div>                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.specialRequests', 'Special Requests')}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('common.optional', 'Optional')}</span>
              </div>
              <div className="relative">
                <textarea
                  name="specialRequests"
                  value={formData.specialRequests}
                  onChange={handleInputChange}
                  rows={4}
                  placeholder={t('hotels.specialRequestsPlaceholder', 'Tell us about any special accommodations, dietary requirements, accessibility needs, or preferences to make your stay perfect...')}
                  className="w-full px-4 py-3 border border-yellow-200 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-white/70 backdrop-blur-sm transition-all duration-200 resize-none"
                />                <div className={`absolute ${isRTL ? 'bottom-3 left-3' : 'bottom-3 right-3'} text-xs text-gray-400`}>
                  {formData.specialRequests.length}/500
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  t('hotels.specialRequestTags.wheelchairAccessible', 'Wheelchair Accessible'),
                  t('hotels.specialRequestTags.quietRoom', 'Quiet Room'),
                  t('hotels.specialRequestTags.highFloor', 'High Floor'),
                  t('hotels.specialRequestTags.earlyCheckIn', 'Early Check-in'),
                  t('hotels.specialRequestTags.lateCheckOut', 'Late Check-out'),
                  t('hotels.specialRequestTags.airportTransfer', 'Airport Transfer')
                ].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const current = formData.specialRequests;
                      const newValue = current ? `${current}, ${tag}` : tag;
                      setFormData({ ...formData, specialRequests: newValue });
                    }}
                    className="px-3 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                  >
                    + {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* File Attachments Card */}            <div className="bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100">
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                <div className="w-10 h-10 bg-violet-500 rounded-xl flex items-center justify-center">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>                <h3 className="text-lg font-semibold text-gray-900">{t('hotels.documentAttachments', 'Document Attachments')}</h3>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{t('common.optional', 'Optional')}</span>
              </div>
              <div className="mb-4">                <p className="text-sm text-gray-600 mb-2">
                  {t('hotels.uploadDocumentsDescription', 'Upload relevant documents to support your booking request')}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">• {t('hotels.documentTypes.idPassport', 'ID/Passport copies')}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">• {t('hotels.documentTypes.visa', 'Visa documents')}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">• {t('hotels.documentTypes.insurance', 'Travel insurance')}</span>
                  <span className="bg-gray-100 px-2 py-1 rounded">• {t('hotels.documentTypes.medical', 'Medical certificates')}</span>
                </div>
              </div>
              <div className="bg-white/70 backdrop-blur-sm rounded-xl border-2 border-dashed border-violet-200 p-4">
                <FileUpload
                  files={formData.attachments}
                  onFilesChange={handleFilesChange}
                  maxFiles={5}
                  maxSize={10}
                  acceptedTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']}
                />
              </div>
            </div>            {/* Error Message */}
            {error && (              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-2xl p-4 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}
              >
                <div className="w-8 h-8 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </motion.div>
            )}            {/* Submit Button */}
            <div className="pt-6">
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-400 to-amber-400 hover:from-orange-500 hover:to-amber-500 text-white py-4 px-8 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-orange-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>                <div className={`relative flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>{t('hotels.processingBooking', 'Processing Your Booking...')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="h-6 w-6" />
                      <span>{t('hotels.proceedToConfirmation', 'Proceed to Booking Confirmation')}</span>
                      <svg className={`h-5 w-5 ${isRTL ? 'mr-2' : 'ml-2'} transform group-hover:${isRTL ? '-translate-x-1' : 'translate-x-1'} transition-transform duration-200`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isRTL ? "M11 17l-5-5m0 0l5-5m-5 5h12" : "M13 7l5 5m0 0l-5 5m5-5H6"} />
                      </svg>
                    </>
                  )}
                </div>
              </motion.button>

              <div className="mt-4 text-center">                <p className={`text-sm text-gray-500 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{t('hotels.secureBookingGuarantee', 'Secure booking • Instant confirmation • Best price guarantee')}</span>
                </p>
              </div>
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
            hotelUrl: formData.hotelUrl,
            hotelPrice: formData.hotelPrice,
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
