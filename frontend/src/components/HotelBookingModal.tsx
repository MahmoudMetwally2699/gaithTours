import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../types/hotel';
import { UploadedFile } from './FileUpload';
import { reservationsAPI } from '../services/api';
import { useDirection } from '../hooks/useDirection';
import toast from 'react-hot-toast';

// Helper function to get calling code from country code
const getCallingCodeFromCountry = (countryCode: string): string => {
  const countryToPhone: { [key: string]: string } = {
    'SA': '966', // Saudi Arabia
    'AE': '971', // UAE
    'KW': '965', // Kuwait
    'BH': '973', // Bahrain
    'QA': '974', // Qatar
    'OM': '968', // Oman
    'EG': '20',  // Egypt
    'JO': '962', // Jordan
    'LB': '961', // Lebanon
    'SY': '963', // Syria
    'IQ': '964', // Iraq
    'YE': '967', // Yemen
    'US': '1',   // United States
    'GB': '44',  // United Kingdom
    'FR': '33',  // France
    'DE': '49',  // Germany
    'IT': '39',  // Italy
    'ES': '34',  // Spain
    'IN': '91',  // India
    'PK': '92',  // Pakistan
    'BD': '880', // Bangladesh
    'MY': '60',  // Malaysia
    'SG': '65',  // Singapore
    'TH': '66',  // Thailand
    'VN': '84',  // Vietnam
    'CN': '86',  // China
    'JP': '81',  // Japan
    'KR': '82',  // South Korea
  };

  return countryToPhone[countryCode] || '966'; // Default to Saudi Arabia
};

interface HotelBookingModalProps {
  hotel: Hotel;
  searchParams: {
    destination: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    rooms: number;
    expectedCheckInTime: string;
    roomType: string;
    stayType: string;
    paymentMethod: string;
    touristName: string;
    phone: string;
    nationality: string;
    email: string;
    hotelUrl: string;
    hotelPrice: string;
    guests_list: Array<{ fullName: string; phoneNumber: string; phoneCountryCode: string }>;
    notes: string;
    attachments?: UploadedFile[];
  };
  onClose: () => void;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({
  hotel,
  searchParams,
  onClose
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  // Custom stylish toast notification
  const showBookingSuccessToast = () => {
    toast.custom((t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-700 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-white/20 backdrop-blur-md overflow-hidden relative`}
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
          boxShadow: '0 25px 50px -12px rgba(102, 126, 234, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
      >
        {/* Shimmer effect */}
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
            animation: 'shimmer 2s infinite',
            transform: 'translateX(-100%)'
          }}
        />

        <div className="flex-1 w-0 p-6 relative z-10">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <CheckCircleIcon className="h-7 w-7 text-white animate-bounce" />
              </div>
            </div>            <div className={`${isRTL ? 'mr-4' : 'ml-4'} flex-1`}>
              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎉</span>
                <p className="text-lg font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Booking Submitted!
                </p>
              </div>
              <p className="mt-2 text-sm text-white/90 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                Your hotel reservation request has been successfully submitted. Our team will contact you within 24 hours to confirm your booking.
              </p>
              <div className={`mt-4 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
                <span className="text-xs text-white/80 font-medium uppercase tracking-wide">Processing your request...</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="w-full border border-transparent rounded-r-2xl p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition-colors duration-200"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    ), {
      duration: 8000,
      position: 'top-center',
    });
  };const calculateNights = () => {
    if (searchParams.checkIn && searchParams.checkOut) {
      const startDate = new Date(searchParams.checkIn);
      const endDate = new Date(searchParams.checkOut);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  };

  const nights = calculateNights();  const handleConfirmBooking = async () => {
    setLoading(true);
    const startTime = Date.now();

    try {
      // Format guest phone numbers with country codes
      const formattedGuests = searchParams.guests_list.map(guest => ({
        fullName: guest.fullName,
        phoneNumber: guest.phoneCountryCode && guest.phoneNumber
          ? `+${getCallingCodeFromCountry(guest.phoneCountryCode)}${guest.phoneNumber.replace(/^0+/, '')}`
          : guest.phoneNumber
      }));      // Create hotel object with only defined values
      const hotelData: any = {
        name: hotel.name,
        address: hotel.address,
        city: hotel.city,
        country: hotel.country,
        hotelId: hotel.id
      };

      // Only add optional fields if they have values
      if (hotel.coordinates) hotelData.coordinates = hotel.coordinates;
      if (hotel.rating) hotelData.rating = hotel.rating;
      if (hotel.image) hotelData.image = hotel.image;
      if (searchParams.hotelUrl) hotelData.url = searchParams.hotelUrl;
      if (searchParams.hotelPrice) hotelData.price = parseFloat(searchParams.hotelPrice);

      const reservationData = {
        touristName: searchParams.touristName,
        phone: searchParams.phone,
        nationality: searchParams.nationality,
        email: searchParams.email,
        expectedCheckInTime: searchParams.expectedCheckInTime,
        roomType: searchParams.roomType,
        stayType: searchParams.stayType,
        paymentMethod: searchParams.paymentMethod,
        guests: formattedGuests,
        hotel: hotelData,
        checkInDate: searchParams.checkIn,
        checkOutDate: searchParams.checkOut,
        numberOfGuests: searchParams.guests,
        notes: searchParams.notes,
        attachments: searchParams.attachments || []
      };

      console.log('=== FRONTEND RESERVATION DATA ===');
      console.log('Sending reservation data:', JSON.stringify(reservationData, null, 2));
      console.log('=================================');

      console.log('🔄 Starting reservation API call...');

      // Create the reservation (this will show the default toast from API)
      const result = await reservationsAPI.create(reservationData);

      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`✅ Reservation API call completed in ${duration}ms`);
      console.log('📥 API Result:', result);      // Show our custom stylish toast
      showBookingSuccessToast();

      // Close the modal and redirect to home page after a short delay
      setTimeout(() => {
        onClose();
        // Redirect to home page
        history.push('/');
      }, 1500); // Increased delay to 1.5 seconds to let user see the toast
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.error('❌ HotelBookingModal: Error creating reservation');
      console.error('⏱️ Error occurred after:', duration, 'ms');
      console.error('🔍 Full error object:', error);
      console.error('📝 Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('🏷️ Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('📚 Error stack:', error instanceof Error ? error.stack : 'No stack trace');

      // Log additional error properties if they exist
      if (error && typeof error === 'object') {
        console.error('🔧 Error properties:', Object.keys(error));
        if ('response' in error) {
          console.error('📡 Response error data:', error.response);
        }
        if ('code' in error) {
          console.error('🏷️ Error code:', error.code);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  const getRoomTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      single: t('hotels.booking.roomTypes.single', 'Single Room'),
      double: t('hotels.booking.roomTypes.double', 'Double Room'),
      twin: t('hotels.booking.roomTypes.twin', 'Twin Room'),
      triple: t('hotels.booking.roomTypes.triple', 'Triple Room'),
      quad: t('hotels.booking.roomTypes.quad', 'Quad Room'),
      suite: t('hotels.booking.roomTypes.suite', 'Suite'),
      family: t('hotels.booking.roomTypes.family', 'Family Room'),
      deluxe: t('hotels.booking.roomTypes.deluxe', 'Deluxe Room')
    };
    return typeMap[type] || type;
  };

  const getStayTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      room_only: t('hotels.booking.stayTypes.roomOnly', 'Room Only'),
      bed_breakfast: t('hotels.booking.stayTypes.bedBreakfast', 'Bed & Breakfast'),
      half_board: t('hotels.booking.stayTypes.halfBoard', 'Half Board'),
      full_board: t('hotels.booking.stayTypes.fullBoard', 'Full Board'),
      all_inclusive: t('hotels.booking.stayTypes.allInclusive', 'All Inclusive')
    };
    return typeMap[type] || type;
  };  return (
    <div className="fixed inset-0 z-50 p-4 animate-fadeIn">
      {/* Beautiful gradient background with animated particles */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-900/95 via-amber-900/95 to-yellow-900/95 backdrop-blur-lg">
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-orange-400/20 to-amber-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-40 -left-40 w-80 h-80 bg-gradient-to-br from-amber-400/20 to-yellow-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-20 w-80 h-80 bg-gradient-to-br from-yellow-400/20 to-orange-600/20 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      {/* Modal Container */}
      <div className="relative flex items-center justify-center min-h-full">
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-hidden shadow-2xl border border-white/20 animate-slideUp">          {/* Glassmorphism Header */}
          <div className="relative overflow-hidden">
            {/* Header gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600"></div>
            {/* Animated overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/80 via-amber-500/80 to-yellow-500/80 animate-gradient-x"></div>
            {/* Glass effect */}
            <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>

            <div className="relative z-10 p-8">
              <div className="flex justify-between items-start">                <div className="flex-1">
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-2`}>
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <span className="text-2xl animate-bounce">🏨</span>
                    </div>
                    <div>
                      <h3 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">
                        {t('hotels.booking.confirmTitle', 'Confirm Your Booking')}
                      </h3>
                      <p className="text-white/90 text-sm font-medium">
                        {t('hotels.booking.subtitle', 'Review your booking details before confirmation')}
                      </p>
                    </div>
                  </div>                  {/* Beautiful status indicator */}
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mt-4`}>
                    <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                      <div className="w-2 h-2 bg-white/80 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse animation-delay-200"></div>
                      <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse animation-delay-400"></div>
                    </div>
                    <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                      Step 2 of 2 • Final Review
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="group relative p-3 text-white/80 hover:text-white transition-all duration-300 hover:scale-110"
                >
                  <div className="absolute inset-0 bg-white/20 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <XMarkIcon className="relative h-6 w-6" />
                </button>
              </div>
            </div>
          </div>          {/* Scrollable Content with Custom Scrollbar */}          <div
            className="max-h-[calc(95vh-200px)] overflow-y-auto bg-gradient-to-b from-orange-50/50 to-amber-50/80 backdrop-blur-sm"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(251, 146, 60, 0.3) transparent'
            }}
          >
            <style>{`
              div::-webkit-scrollbar {
                width: 8px;
              }
              div::-webkit-scrollbar-track {
                background: transparent;
                border-radius: 10px;
              }
              div::-webkit-scrollbar-thumb {
                background: linear-gradient(to bottom, rgba(251, 146, 60, 0.3), rgba(251, 146, 60, 0.6));
                border-radius: 10px;
                border: 2px solid transparent;
                background-clip: content-box;
              }
              div::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(to bottom, rgba(251, 146, 60, 0.5), rgba(251, 146, 60, 0.8));
                background-clip: content-box;
              }
              @keyframes gradient-x {
                0%, 100% { transform: translateX(0%); }
                50% { transform: translateX(100%); }
              }
              @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
              }
              .animate-gradient-x {
                animation: gradient-x 15s ease infinite;
              }
              .animate-blob {
                animation: blob 7s infinite;
              }
              .animation-delay-2000 {
                animation-delay: 2s;
              }
              .animation-delay-4000 {
                animation-delay: 4s;
              }
              .animation-delay-200 {
                animation-delay: 0.2s;
              }
              .animation-delay-400 {
                animation-delay: 0.4s;
              }
            `}</style>

            <div className="p-8 space-y-8">              {/* Hotel Information Card */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl">
                  <div className={`flex items-start ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
                    {hotel.image ? (
                      <div className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={hotel.image}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-2xl text-white">🏨</span>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-bold text-gray-800 mb-1 truncate">
                        {hotel.name}
                      </h4>
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        📍 {hotel.address}, {hotel.city}, {hotel.country}
                      </p>

                      <div className="flex items-center justify-between flex-wrap gap-2">                        {hotel.rating && (
                          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1 bg-yellow-50 px-3 py-1 rounded-full`}>
                            <span className="text-yellow-500 text-sm">⭐</span>
                            <span className="text-yellow-700 font-semibold text-sm">{hotel.rating}</span>
                          </div>
                        )}

                        {searchParams.hotelPrice && (
                          <div className="bg-green-50 px-3 py-1 rounded-full">
                            <span className="text-green-700 font-semibold text-sm">
                              💰 {searchParams.hotelPrice} SAR/night
                            </span>
                          </div>
                        )}
                      </div>

                      {searchParams.hotelUrl && (
                        <div className="mt-3">
                          <a
                            href={searchParams.hotelUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors group`}
                          >
                            <span>🔗</span>
                            <span className="group-hover:underline">Visit Hotel Website</span>
                            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>              {/* Booking Details */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Travel Details Card */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">🗓️</span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-800">
                        {t('hotels.booking.travelDetails', 'Travel Details')}
                      </h5>
                    </div>

                    <div className="space-y-4">                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <span className="text-green-500">📅</span>
                          <span className="text-gray-700 font-medium">{t('hotels.checkIn', 'Check-in')}</span>
                        </div>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                          {searchParams.checkIn}
                        </span>
                      </div>                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <span className="text-red-500">📅</span>
                          <span className="text-gray-700 font-medium">{t('hotels.checkOut', 'Check-out')}</span>
                        </div>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                          {searchParams.checkOut}
                        </span>
                      </div>

                      {searchParams.expectedCheckInTime && (                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                            <span className="text-blue-500">⏰</span>
                            <span className="text-gray-700 font-medium">{t('hotels.booking.expectedCheckInTime', 'Check-in Time')}</span>
                          </div>
                          <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                            {searchParams.expectedCheckInTime}
                          </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">                        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                            <span className="text-purple-500">👥</span>
                            <span className="text-gray-700 font-medium text-sm">{t('hotels.guests', 'Guests')}</span>
                          </div>
                          <span className="font-bold text-gray-800 bg-white px-2 py-1 rounded-lg shadow-sm text-sm">
                            {searchParams.guests}
                          </span>
                        </div>                        <div className="flex items-center justify-between p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl">
                          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                            <span className="text-orange-500">🏠</span>
                            <span className="text-gray-700 font-medium text-sm">{t('hotels.rooms', 'Rooms')}</span>
                          </div>
                          <span className="font-bold text-gray-800 bg-white px-2 py-1 rounded-lg shadow-sm text-sm">
                            {searchParams.rooms}
                          </span>
                        </div>
                      </div>

                      {nights > 0 && (                        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl">
                          <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                            <span className="text-orange-500">🌙</span>
                            <span className="text-gray-700 font-medium">{t('hotels.booking.nights', 'Nights')}</span>
                          </div>
                          <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                            {nights}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Room & Stay Details Card */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">🛏️</span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-800">
                        {t('hotels.booking.roomStayDetails', 'Room & Stay Details')}
                      </h5>
                    </div>

                    <div className="space-y-4">                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <span className="text-purple-500">🏨</span>
                          <span className="text-gray-700 font-medium">{t('hotels.booking.roomType', 'Room Type')}</span>
                        </div>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                          {getRoomTypeLabel(searchParams.roomType)}
                        </span>
                      </div>                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <span className="text-green-500">🍽️</span>
                          <span className="text-gray-700 font-medium">{t('hotels.booking.stayType', 'Stay Type')}</span>
                        </div>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                          {getStayTypeLabel(searchParams.stayType)}
                        </span>
                      </div>                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                        <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                          <span className="text-blue-500">💳</span>
                          <span className="text-gray-700 font-medium">{t('hotels.booking.paymentMethod', 'Payment')}</span>
                        </div>
                        <span className="font-bold text-gray-800 bg-white px-3 py-1 rounded-lg shadow-sm">
                          {searchParams.paymentMethod}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>              {/* Personal Information */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center">
                      <span className="text-white text-lg">👤</span>
                    </div>
                    <h5 className="text-lg font-bold text-gray-800">
                      {t('hotels.booking.personalInfo', 'Personal Information')}
                    </h5>
                  </div>

                  <div className="grid lg:grid-cols-2 gap-4">                    <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                        <span className="text-emerald-500">👨‍💼</span>
                        <span className="text-gray-600 text-sm font-medium">{t('common.name', 'Full Name')}</span>
                      </div>
                      <span className="font-bold text-gray-800">{searchParams.touristName}</span>
                    </div>                    <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                        <span className="text-blue-500">📧</span>
                        <span className="text-gray-600 text-sm font-medium">{t('common.email', 'Email')}</span>
                      </div>
                      <span className="font-bold text-gray-800 truncate block">{searchParams.email}</span>
                    </div>                    <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                        <span className="text-purple-500">📱</span>
                        <span className="text-gray-600 text-sm font-medium">{t('common.phone', 'Phone')}</span>
                      </div>
                      <span className="font-bold text-gray-800">{searchParams.phone}</span>
                    </div>                    <div className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl">
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                        <span className="text-orange-500">🌍</span>
                        <span className="text-gray-600 text-sm font-medium">{t('common.nationality', 'Nationality')}</span>
                      </div>
                      <span className="font-bold text-gray-800">{searchParams.nationality}</span>
                    </div>
                  </div>
                </div>
              </div>              {/* Additional Guests */}
              {searchParams.guests_list && searchParams.guests_list.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">👥</span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-800">
                        {t('hotels.booking.additionalGuests', 'Additional Guests')}
                      </h5>
                      <div className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {searchParams.guests_list.length} Guest{searchParams.guests_list.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {searchParams.guests_list.map((guest, index) => (
                        <div key={index} className="relative group/guest">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-xl blur opacity-10 group-hover/guest:opacity-20 transition duration-500"></div>
                          <div className="relative bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">                            <div className={`flex items-start ${isRTL ? 'space-x-reverse' : ''} space-x-4`}>
                              <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-white font-bold text-sm">{index + 1}</span>
                              </div>

                              <div className="flex-1 grid sm:grid-cols-2 gap-3">
                                <div>
                                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                                    <span className="text-indigo-500">👤</span>
                                    <span className="text-gray-600 text-sm font-medium">{t('hotels.booking.guestFullName', "Guest's Name")}</span>
                                  </div>
                                  <span className="font-bold text-gray-800">{guest.fullName}</span>
                                </div>                                <div>
                                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mb-1`}>
                                    <span className="text-purple-500">📱</span>
                                    <span className="text-gray-600 text-sm font-medium">{t('hotels.booking.guestPhone', "Phone")}</span>
                                  </div>
                                  <span className="font-bold text-gray-800">
                                    {guest.phoneCountryCode && getCallingCodeFromCountry(guest.phoneCountryCode)} {guest.phoneNumber}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}              {/* Special Requests */}
              {searchParams.notes && (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-4`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">💭</span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-800">
                        {t('hotels.booking.specialRequests', 'Special Requests')}
                      </h5>
                    </div>

                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{searchParams.notes}</p>
                    </div>
                  </div>
                </div>
              )}              {/* Attachments */}
              {searchParams.attachments && searchParams.attachments.length > 0 && (
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
                  <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-3 mb-6`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-amber-500 rounded-xl flex items-center justify-center">
                        <span className="text-white text-lg">📎</span>
                      </div>
                      <h5 className="text-lg font-bold text-gray-800">
                        {t('hotels.booking.attachments', 'Attachments')}
                      </h5>
                      <div className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {searchParams.attachments.length} File{searchParams.attachments.length > 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {searchParams.attachments.map((file, index) => (
                        <div key={index} className="relative group/file">
                          <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-amber-400 rounded-xl blur opacity-10 group-hover/file:opacity-20 transition duration-500"></div>
                          <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-xl border border-orange-100">                            <div className={`flex items-center justify-between`}>
                              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-4 flex-1 min-w-0`}>
                                <div className="flex-shrink-0">
                                  {file.fileType === 'pdf' ? (
                                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  ) : (
                                    <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                  )}
                                </div>                                <div className="flex-1 min-w-0 max-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {file.fileName}
                                  </p>
                                  <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 mt-1`}>
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white text-gray-700 shadow-sm">
                                      {file.fileType.toUpperCase()}
                                    </span>
                                    <span className="text-xs text-gray-500 font-medium truncate">
                                      {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"                                  className={`group/btn inline-flex items-center px-4 py-2 bg-white border border-pink-200 rounded-xl text-sm font-semibold text-pink-700 hover:bg-pink-50 hover:border-pink-300 transition-all duration-200 shadow-sm hover:shadow-md`}
                                >
                                  <svg className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'} group-hover/btn:scale-110 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {t('common.view', 'View')}
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}              {/* Action Buttons */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20"></div>
                <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-lg">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="group relative flex-1 px-6 py-4 bg-gradient-to-r from-gray-100 to-gray-200 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:from-gray-200 hover:to-gray-300 hover:border-gray-400 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-lg"
                    >                      <div className={`flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                        <svg className={`w-5 h-5 group-hover:scale-110 transition-transform ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>{t('common.goBack', 'Go Back')}</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmBooking}
                      disabled={loading}
                      className="group relative flex-1 px-6 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-xl font-bold hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl disabled:transform-none overflow-hidden"
                    >
                      {/* Animated background effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>                      <div className={`relative flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-3`}>
                        {loading ? (
                          <>
                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                            <span>{t('common.loading', 'Processing...')}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xl group-hover:scale-110 transition-transform">✨</span>
                            <span>{t('hotels.booking.confirmBooking', 'Confirm Booking')}</span>
                            <svg className={`w-5 h-5 group-hover:${isRTL ? 'translate-x-1' : 'translate-x-1'} transition-transform ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                          </>
                        )}
                      </div>
                    </button>
                  </div>                  {/* Trust indicators */}
                  <div className={`mt-4 flex items-center justify-center ${isRTL ? 'space-x-reverse' : ''} space-x-6 text-xs text-gray-500`}>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                      <span className="text-green-500">🔒</span>
                      <span>Secure Booking</span>
                    </div>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                      <span className="text-orange-500">⚡</span>
                      <span>Instant Confirmation</span>
                    </div>
                    <div className={`flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                      <span className="text-amber-500">📞</span>
                      <span>24/7 Support</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
