import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../types/hotel';
import { UploadedFile } from './FileUpload';
import { reservationsAPI } from '../services/api';
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
}) => {  const { t } = useTranslation();
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
            </div>
            <div className="ml-4 flex-1">
              <div className="flex items-center space-x-2">
                <span className="text-2xl animate-bounce" style={{ animationDelay: '0.1s' }}>🎉</span>
                <p className="text-lg font-bold text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                  Booking Submitted!
                </p>
              </div>
              <p className="mt-2 text-sm text-white/90 leading-relaxed" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                Your hotel reservation request has been successfully submitted. Our team will contact you within 24 hours to confirm your booking.
              </p>
              <div className="mt-4 flex items-center space-x-2">
                <div className="flex space-x-1">
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

    try {
      // Format guest phone numbers with country codes
      const formattedGuests = searchParams.guests_list.map(guest => ({
        fullName: guest.fullName,
        phoneNumber: guest.phoneCountryCode && guest.phoneNumber
          ? `+${getCallingCodeFromCountry(guest.phoneCountryCode)}${guest.phoneNumber.replace(/^0+/, '')}`
          : guest.phoneNumber
      }));      const reservationData = {
        touristName: searchParams.touristName,
        phone: searchParams.phone,
        nationality: searchParams.nationality,
        email: searchParams.email,
        expectedCheckInTime: searchParams.expectedCheckInTime,
        roomType: searchParams.roomType,
        stayType: searchParams.stayType,
        paymentMethod: searchParams.paymentMethod,
        guests: formattedGuests,        hotel: {
          name: hotel.name,
          address: hotel.address,
          city: hotel.city,
          country: hotel.country,
          coordinates: hotel.coordinates,
          rating: hotel.rating,
          image: hotel.image || undefined,
          url: searchParams.hotelUrl || undefined,
          price: searchParams.hotelPrice ? parseFloat(searchParams.hotelPrice) : undefined,
          hotelId: hotel.id
        },
        checkInDate: searchParams.checkIn,
        checkOutDate: searchParams.checkOut,
        numberOfGuests: searchParams.guests,
        notes: searchParams.notes,
        attachments: searchParams.attachments || []
      };

      console.log('=== FRONTEND RESERVATION DATA ===');
      console.log('Sending reservation data:', JSON.stringify(reservationData, null, 2));
      console.log('=================================');

      // Create the reservation (this will show the default toast from API)
      await reservationsAPI.create(reservationData);

      // Show our custom stylish toast
      showBookingSuccessToast();

      // Close the modal after a short delay to let the user see the toast
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (error) {
      console.error('Error creating reservation:', error);
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
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">{t('hotels.booking.confirmTitle', 'Confirm Your Booking')}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6">          {/* Hotel Information */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-lg text-gray-800">{hotel.name}</h4>
            <p className="text-gray-600">{hotel.address}, {hotel.city}</p>
            <div className="flex items-center mt-2">
              <span className="text-yellow-400">★</span>
              <span className="ml-1 text-sm">{hotel.rating}</span>
            </div>
            {searchParams.hotelUrl && (
              <div className="mt-2">
                <a
                  href={searchParams.hotelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  🔗 Visit Hotel Website
                </a>
              </div>
            )}
            {searchParams.hotelPrice && (
              <div className="mt-2">
                <span className="text-green-600 font-medium">
                  💰 Expected Price: {searchParams.hotelPrice} SAR/night
                </span>
              </div>
            )}
          </div>

          {/* Booking Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Travel Details */}
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-800 border-b pb-2">
                {t('hotels.booking.travelDetails', 'Travel Details')}
              </h5>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.checkIn', 'Check-in')}:</span>
                  <span className="font-medium">{searchParams.checkIn}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.checkOut', 'Check-out')}:</span>
                  <span className="font-medium">{searchParams.checkOut}</span>
                </div>
                {searchParams.expectedCheckInTime && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('hotels.booking.expectedCheckInTime', 'Expected Check-in Time')}:</span>
                    <span className="font-medium">{searchParams.expectedCheckInTime}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.guests', 'Guests')}:</span>
                  <span className="font-medium">{searchParams.guests}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.rooms', 'Rooms')}:</span>
                  <span className="font-medium">{searchParams.rooms}</span>
                </div>
                {nights > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('hotels.booking.nights', 'Nights')}:</span>
                    <span className="font-medium">{nights}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Room & Stay Details */}
            <div className="space-y-4">
              <h5 className="font-semibold text-gray-800 border-b pb-2">
                {t('hotels.booking.roomStayDetails', 'Room & Stay Details')}
              </h5>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.booking.roomType', 'Room Type')}:</span>
                  <span className="font-medium">{getRoomTypeLabel(searchParams.roomType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.booking.stayType', 'Stay Type')}:</span>
                  <span className="font-medium">{getStayTypeLabel(searchParams.stayType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('hotels.booking.paymentMethod', 'Payment Method')}:</span>
                  <span className="font-medium">{searchParams.paymentMethod}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="mt-6 space-y-4">
            <h5 className="font-semibold text-gray-800 border-b pb-2">
              {t('hotels.booking.personalInfo', 'Personal Information')}
            </h5>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.name', 'Full Name')}:</span>
                <span className="font-medium">{searchParams.touristName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.email', 'Email')}:</span>
                <span className="font-medium">{searchParams.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.phone', 'Phone')}:</span>
                <span className="font-medium">{searchParams.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('common.nationality', 'Nationality')}:</span>
                <span className="font-medium">{searchParams.nationality}</span>
              </div>
            </div>
          </div>

          {/* Additional Guests */}
          {searchParams.guests_list && searchParams.guests_list.length > 0 && (
            <div className="mt-6 space-y-4">
              <h5 className="font-semibold text-gray-800 border-b pb-2">
                {t('hotels.booking.additionalGuests', 'Additional Guests')}
              </h5>

              <div className="space-y-2">
                {searchParams.guests_list.map((guest, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded-md">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.booking.guestFullName', "Guest's Name")}:</span>
                      <span className="font-medium">{guest.fullName}</span>
                    </div>                    <div className="flex justify-between">
                      <span className="text-gray-600">{t('hotels.booking.guestPhone', "Phone")}:</span>
                      <span className="font-medium">{`${guest.phoneCountryCode} ${guest.phoneNumber}`}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {/* Special Requests */}
          {searchParams.notes && (
            <div className="mt-6 space-y-4">
              <h5 className="font-semibold text-gray-800 border-b pb-2">
                {t('hotels.booking.specialRequests', 'Special Requests')}
              </h5>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-gray-700">{searchParams.notes}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {searchParams.attachments && searchParams.attachments.length > 0 && (
            <div className="mt-6 space-y-4">
              <h5 className="font-semibold text-gray-800 border-b pb-2">
                {t('hotels.booking.attachments', 'Attachments')}
              </h5>
              <div className="space-y-3">
                {searchParams.attachments.map((file, index) => (
                  <div key={index} className="bg-gray-50 p-4 rounded-md border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {file.fileType === 'pdf' ? (
                            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.fileType.toUpperCase()} • {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {t('common.view', 'View')}
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 font-medium"
            >
              {t('common.goBack', 'Go Back')}
            </button>
            <button
              type="button"
              onClick={handleConfirmBooking}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 font-medium"
            >
              {loading ? t('common.loading', 'Processing...') : t('hotels.booking.confirmBooking', 'Confirm Booking')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
