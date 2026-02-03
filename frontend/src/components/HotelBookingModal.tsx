import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../types/hotel';
import { UploadedFile } from './FileUpload';
import { reservationsAPI, bookingsAPI } from '../services/api';
import { useDirection } from '../hooks/useDirection';
import toast from 'react-hot-toast';
import { LoyaltyRedemption } from './LoyaltyRedemption';

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
    // Selected rate data
    matchHash?: string;
    roomName?: string;
    meal?: string;
    currency?: string;
  };
  selectedRooms?: any[]; // Array of selected rooms for multi-room bookings
  onClose: () => void;
}

export const HotelBookingModal: React.FC<HotelBookingModalProps> = ({
  hotel,
  searchParams,
  selectedRooms = [],
  onClose
}) => {
  const { t } = useTranslation();
  const { isRTL } = useDirection();
  const history = useHistory();
  const [loading, setLoading] = useState(false);
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);  // Custom stylish toast notification
  const showBookingSuccessToast = () => {
    toast.custom((toastInstance) => (
      <div        className={`${
          toastInstance.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 shadow-2xl rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 border border-white/20 backdrop-blur-md overflow-hidden relative`}
        style={{
          background: 'linear-gradient(135deg, #f97316 0%, #f59e0b 50%, #eab308 100%)',
          boxShadow: '0 25px 50px -12px rgba(249, 115, 22, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
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
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎉</span>                <p className="text-lg font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  {t('hotels.booking.bookingSubmitted', 'Booking Submitted!')}
                </p>
              </div>              <p className="mt-2 text-sm text-white/90 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                {t('hotels.booking.submissionMessage', 'تم تقديم طلب حجز الفندق بنجاح. سيتواصل معك فريقنا في اقرب وقت لتأكيد حجزك.')}
              </p>
              <div className={`mt-4 flex items-center ${isRTL ? 'space-x-reverse' : ''} space-x-2`}>
                <div className={`flex ${isRTL ? 'space-x-reverse' : ''} space-x-1`}>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                </div>
                <span className="text-xs text-white/80 font-medium uppercase tracking-wide">{t('hotels.booking.processingRequest', 'Processing your request...')}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/20">          <button
            onClick={() => toast.dismiss(toastInstance.id)}
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
      }));

      // Check if this is a multi-room booking with different room types
      const isMultiRoomBooking = selectedRooms && selectedRooms.length > 0;

      if (isMultiRoomBooking) {
        // Check if different room types exist
        const roomTypes = new Set(selectedRooms.map(r => r.room_name));
        const hasDifferentTypes = roomTypes.size > 1;

        if (hasDifferentTypes) {
          console.log('🔄 Multi-room booking detected with different types, using create-multi endpoint...');

          // Use the multi-booking API
          const multiBookingData = {
            hotelId: hotel.id,
            hotelName: hotel.name,
            hotelAddress: hotel.address,
            hotelCity: hotel.city || 'Unknown',
            hotelCountry: hotel.country || hotel.city || 'Unknown',
            hotelRating: hotel.rating,
            hotelImage: hotel.image || '',
            checkInDate: searchParams.checkIn,
            checkOutDate: searchParams.checkOut,
            guestName: searchParams.touristName,
            guestEmail: searchParams.email,
            guestPhone: searchParams.phone,
            specialRequests: searchParams.notes,
            paymentMethod: searchParams.paymentMethod,
            selectedRooms: selectedRooms
          };

          console.log('📦 Sending multi-booking data:', JSON.stringify(multiBookingData, null, 2));

          const result = await bookingsAPI.createMultiBooking(multiBookingData);

          const endTime = Date.now();
          console.log(`✅ Multi-booking completed in ${endTime - startTime}ms`);
          console.log('📥 Result:', result);

          if (result.data) {
            toast.success(`✅ Successfully created ${result.data.bookings.length} bookings!\nSession ID: ${result.data.bookingSessionId}`);
          } else {
            toast.success('✅ Multi-room booking submitted successfully!');
          }

          setTimeout(() => {
            onClose();
            history.push('/');
          }, 2000);
          return;
        }
      }

      // Standard single booking flow
      const bookingData = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        hotelCity: hotel.city,
        checkInDate: searchParams.checkIn,
        checkOutDate: searchParams.checkOut,
        numberOfGuests: searchParams.guests,
        roomType: searchParams.roomType,
        stayType: searchParams.stayType,
        paymentMethod: searchParams.paymentMethod,
        expectedCheckInTime: searchParams.expectedCheckInTime,
        specialRequests: searchParams.notes,
        // Selected rate data
        matchHash: searchParams.matchHash,
        roomName: searchParams.roomName,
        meal: searchParams.meal,
        price: searchParams.hotelPrice,
        currency: searchParams.currency || 'SAR',
        additionalGuests: formattedGuests
      };

      console.log('🔄 Starting standard booking API call...');
      console.log('📤 Booking data:', JSON.stringify(bookingData, null, 2));

      const result = await bookingsAPI.create(bookingData);

      const endTime = Date.now();
      console.log(`✅ Booking completed in ${endTime - startTime}ms`);
      console.log('📥 Result:', result);

      showBookingSuccessToast();

      setTimeout(() => {
        onClose();
        history.push('/');
      }, 1500);
    } catch (error) {
      const endTime = Date.now();
      console.error('❌ Booking error after', endTime - startTime, 'ms');
      console.error('🔍 Error:', error);
      toast.error('Booking failed. Please try again.');
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
    <div className="fixed inset-0 z-50 p-4 bg-black bg-opacity-50 flex items-center justify-center">
      {/* Invoice-style Modal Container */}
      <div className="bg-white w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-xl border border-gray-200 animate-slideUp"
           style={{ fontFamily: 'Arial, sans-serif' }}>        {/* Invoice Header */}
        <div className="bg-white border-b-2 border-gray-300 p-8">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {t('hotels.booking.confirmTitle', 'BOOKING CONFIRMATION')}
              </h1>
              <p className="text-gray-600 text-lg">
                {t('hotels.booking.invoiceNumber', 'Invoice #BK-{{number}}', { number: Date.now().toString().slice(-6) })}
              </p>
              <p className="text-gray-500 mt-1">
                {t('hotels.booking.invoiceDate', 'Date: {{date}}', {
                  date: new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                })}
              </p>
            </div>

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold p-2"
            >
              ×
            </button>
          </div>
        </div>{/* Invoice Content */}
        <div className="max-h-[calc(95vh-150px)] overflow-y-auto bg-white">
          <div className="p-8 space-y-8">            {/* Hotel Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.hotelDetails', 'HOTEL DETAILS')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hotel Image */}
                <div className="lg:col-span-1">
                  {hotel.image ? (
                    <div className="w-full h-48 overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                      <img
                        src={hotel.image}
                        alt={hotel.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className="w-full h-full bg-gray-100 flex items-center justify-center" style={{ display: 'none' }}>
                        <div className="text-center text-gray-500">
                          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="mt-2 text-sm">{t('hotels.booking.noImage', 'No image available')}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                      <div className="text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="mt-2 text-sm">{t('hotels.booking.noImage', 'No image available')}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Hotel Details */}
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <div className="space-y-3">
                        <div>
                          <span className="font-semibold text-gray-700">{t('hotels.booking.modalHotelName', 'Hotel Name')}:</span>
                          <br />
                          <span className="text-gray-900">{hotel.name}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">{t('hotels.booking.modalAddress', 'Address')}:</span>
                          <br />
                          <span className="text-gray-900">{hotel.address}, {hotel.city}, {hotel.country}</span>
                        </div>                      </div>
                    </div>
                    <div>
                      <div className="space-y-3">
                        {hotel.rating && (
                          <div>
                            <span className="font-semibold text-gray-700">{t('hotels.booking.modalRating', 'Rating')}:</span>
                            <br />
                            <span className="text-gray-900">{hotel.rating} ⭐</span>
                          </div>
                        )}
                        {searchParams.hotelPrice && (
                          <div>
                            <span className="font-semibold text-gray-700">{t('hotels.booking.modalPricePerNight', 'Price per Night')}:</span>
                            <br />
                            <span className="text-gray-900">{searchParams.hotelPrice} SAR</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>            {/* Booking Details */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.modalBookingDetails', 'BOOKING DETAILS')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalCheckInDate', 'Check-in Date')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.checkIn}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalCheckOutDate', 'Check-out Date')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.checkOut}</span>
                  </div>
                  {nights > 0 && (
                    <div>
                      <span className="font-semibold text-gray-700">{t('hotels.booking.modalNumberOfNights', 'Number of Nights')}:</span>
                      <br />
                      <span className="text-gray-900">{nights}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalNumberOfGuests', 'Number of Guests')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.guests}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalNumberOfRooms', 'Number of Rooms')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.rooms}</span>
                  </div>
                  {searchParams.expectedCheckInTime && (
                    <div>
                      <span className="font-semibold text-gray-700">{t('hotels.booking.modalExpectedCheckInTime', 'Expected Check-in Time')}:</span>
                      <br />
                      <span className="text-gray-900">{searchParams.expectedCheckInTime}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>            {/* Room & Stay Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.roomStayInformation', 'ROOM & STAY INFORMATION')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalRoomType', 'Room Type')}:</span>
                    <br />
                    <span className="text-gray-900">{getRoomTypeLabel(searchParams.roomType)}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalStayType', 'Stay Type')}:</span>
                    <br />
                    <span className="text-gray-900">{getStayTypeLabel(searchParams.stayType)}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.modalPaymentMethod', 'Payment Method')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.paymentMethod}</span>
                  </div>
                </div>
              </div>
            </div>            {/* Guest Information */}
            <div className="border-b border-gray-200 pb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.modalGuestInformation', 'GUEST INFORMATION')}</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('hotels.booking.primaryGuestName', 'Primary Guest Name')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.touristName}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">{t('common.email', 'Email')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.email}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="font-semibold text-gray-700">{t('common.phone', 'Phone Number')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.phone}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-700">{t('common.nationality', 'Nationality')}:</span>
                    <br />
                    <span className="text-gray-900">{searchParams.nationality}</span>
                  </div>
                </div>
              </div>
            </div>            {/* Additional Guests */}
            {searchParams.guests_list && searchParams.guests_list.length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.modalAdditionalGuests', 'ADDITIONAL GUESTS')}</h2>
                <div className="space-y-4">
                  {searchParams.guests_list.map((guest, index) => (
                    <div key={index} className="bg-gray-50 p-4 border border-gray-200">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                          <span className="font-semibold text-gray-700">{t('hotels.booking.modalGuestName', 'Guest {{number}} Name', { number: index + 1 })}:</span>
                          <br />
                          <span className="text-gray-900">{guest.fullName}</span>
                        </div>
                        <div>
                          <span className="font-semibold text-gray-700">{t('common.phone', 'Phone Number')}:</span>
                          <br />
                          <span className="text-gray-900">
                            +{getCallingCodeFromCountry(guest.phoneCountryCode)} {guest.phoneNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}            {/* Special Requests */}
            {searchParams.notes && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.modalSpecialRequests', 'SPECIAL REQUESTS')}</h2>
                <div className="bg-gray-50 p-4 border border-gray-200">
                  <p className="text-gray-900 whitespace-pre-wrap">{searchParams.notes}</p>
                </div>
              </div>
            )}{/* Attachments */}
            {searchParams.attachments && searchParams.attachments.length > 0 && (
              <div className="border-b border-gray-200 pb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('hotels.booking.attachments', 'ATTACHMENTS')}</h2>
                <div className="space-y-3">
                  {searchParams.attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-4 border border-gray-200">
                      <div>
                        <span className="font-semibold text-gray-700">{t('hotels.booking.fileName', 'File {{number}}', { number: index + 1 })}:</span>
                        <br />
                        <span className="text-gray-900">{file.fileName}</span>
                        <br />                        <span className="text-sm text-gray-600">
                          {file.fileType.toUpperCase()} • {(file.size / 1024 / 1024).toFixed(2)} {t('common.mb', 'MB')}
                        </span>
                      </div>                      <a
                        href={file.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline text-sm"
                      >
                        {t('common.viewFile', 'View File')}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loyalty Points Redemption */}
            <div className="border-b border-gray-200 pb-6">
              <LoyaltyRedemption
                bookingAmount={parseFloat(searchParams.hotelPrice) || 0}
                currency={searchParams.currency || 'SAR'}
                exchangeRate={
                  // Calculate exchange rate: USD to booking currency
                  searchParams.currency === 'SAR' ? 3.75 :
                  searchParams.currency === 'EGP' ? 50 :
                  searchParams.currency === 'USD' ? 1 :
                  3.75 // Default to SAR rate
                }
                onApplyDiscount={(discount, pointsUsed) => {
                  setLoyaltyDiscount(discount);
                  setLoyaltyPointsUsed(pointsUsed);
                }}
                onRemoveDiscount={() => {
                  setLoyaltyDiscount(0);
                  setLoyaltyPointsUsed(0);
                }}
              />
            </div>

            {/* Price Summary with Discount */}
            {loyaltyDiscount > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">{t('loyalty.discountSummary', 'Loyalty Discount Applied')}</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('booking.originalPrice', 'Original Price')}</span>
                  <span>{searchParams.currency || 'SAR'} {searchParams.hotelPrice}</span>
                </div>
                <div className="flex justify-between text-sm text-green-600">
                  <span>{t('loyalty.pointsDiscount', 'Points Discount')} ({loyaltyPointsUsed} pts)</span>
                  <span>-{searchParams.currency || 'SAR'} {loyaltyDiscount}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-green-300">
                  <span>{t('booking.finalPrice', 'Final Price')}</span>
                  <span className="text-green-700">
                    {searchParams.currency || 'SAR'} {(parseFloat(searchParams.hotelPrice) - loyaltyDiscount).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}            <div className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 bg-gray-100 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
                >
                  {t('common.cancel', 'Cancel')}
                </button>                <button
                  type="button"
                  onClick={handleConfirmBooking}
                  disabled={loading}
                  className="flex-1 px-6 py-3 text-white font-semibold hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  style={{ backgroundColor: '#EF620F' }}
                >
                  {loading ? t('common.processing', 'Processing...') : t('hotels.booking.modalConfirmBooking', 'Confirm Booking')}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
