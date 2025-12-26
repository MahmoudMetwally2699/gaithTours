import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { BookingSummaryCard } from '../components/BookingSummaryCard';
import { GuestInformationForm, GuestFormData } from '../components/GuestInformationForm';
import { bookingsAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface LocationState {
  hotel: any;
  selectedRate: any;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export const BookingPage: React.FC = () => {
  const { t } = useTranslation();
  const { hotelId } = useParams<{ hotelId: string }>();
  const location = useLocation();
  const history = useHistory();
  const state = location.state as LocationState;

  const [formData, setFormData] = useState<GuestFormData>({
    firstName: '',
    lastName: '',
    email: '',
    confirmEmail: '',
    country: 'EG',
    phoneCode: '+20',
    phone: '',
    bookingFor: 'self',
    specialRequests: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');

  useEffect(() => {
    // Redirect if no booking data
    if (!state || !state.hotel || !state.selectedRate) {
      history.push('/');
    }
  }, [state, history]);

  if (!state || !state.hotel || !state.selectedRate) {
    return null;
  }

  const { hotel, selectedRate, checkIn, checkOut, guests } = state;

  const handleFormChange = (data: Partial<GuestFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
    // Clear errors for changed fields
    const changedFields = Object.keys(data);
    setErrors((prev: any) => {
      const newErrors = { ...prev };
      changedFields.forEach(field => delete newErrors[field]);
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = t('booking.errors.firstNameRequired', 'First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('booking.errors.lastNameRequired', 'Last name is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = t('booking.errors.emailRequired', 'Email is required');
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('booking.errors.emailInvalid', 'Please enter a valid email');
    }

    if (formData.email !== formData.confirmEmail) {
      newErrors.confirmEmail = t('booking.errors.emailMismatch', 'Emails do not match');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      const bookingData = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        hotelCity: hotel.city || '',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guests,
        roomType: selectedRate.room_name,
        guestName: `${formData.firstName} ${formData.lastName}`,
        guestEmail: formData.email,
        guestPhone: `${formData.phoneCode}${formData.phone}`,
        totalPrice: Number(selectedRate.price),
        currency: selectedRate.currency,
        specialRequests: formData.specialRequests,
        stayType: 'hotel',
        paymentMethod: 'pay_at_property',
        selectedRate: {
          matchHash: selectedRate.book_hash || selectedRate.match_hash, // Use book_hash if available
          roomName: selectedRate.room_name,
          meal: selectedRate.meal || 'nomeal',
          price: selectedRate.price,
          currency: selectedRate.currency
        }
      };

      const response = await bookingsAPI.create(bookingData);

      if (response.success) {
        // Navigate to success page or show success message
        toast.success(t('booking.success', 'Booking created successfully!'));
        history.push('/');
      } else {
        toast.error(t('booking.error', 'Failed to create booking. Please try again.'));
      }
    } catch (error: any) {
      console.error('Booking error:', error);
      const errorMessage = error.response?.data?.message || t('booking.error', 'Failed to create booking. Please try again.');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {t('booking.yourSelection', 'Your selection')}
                </span>
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-blue-600 mx-4"></div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <span className="ml-2 text-sm font-semibold text-gray-900">
                  {t('booking.yourDetails', 'Your details')}
                </span>
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-gray-300 mx-4"></div>

            {/* Step 3 */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <span className="ml-2 text-sm text-gray-500">
                  {t('booking.finalDetails', 'Final details')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Form (2/3 width) */}
          <div className="lg:col-span-2">
            <GuestInformationForm
              formData={formData}
              onChange={handleFormChange}
              errors={errors}
            />

            {/* Arrival Time */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking.arrivalTime', 'Arrival Time')}
              </h3>
              <select
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t('booking.selectTime', 'Please select')}</option>
                <option value="00:00-01:00">00:00 - 01:00</option>
                <option value="01:00-02:00">01:00 - 02:00</option>
                <option value="02:00-03:00">02:00 - 03:00</option>
                <option value="03:00-04:00">03:00 - 04:00</option>
                <option value="04:00-05:00">04:00 - 05:00</option>
                <option value="05:00-06:00">05:00 - 06:00</option>
                <option value="06:00-07:00">06:00 - 07:00</option>
                <option value="07:00-08:00">07:00 - 08:00</option>
                <option value="08:00-09:00">08:00 - 09:00</option>
                <option value="09:00-10:00">09:00 - 10:00</option>
                <option value="10:00-11:00">10:00 - 11:00</option>
                <option value="11:00-12:00">11:00 - 12:00</option>
                <option value="12:00-13:00">12:00 - 13:00</option>
                <option value="13:00-14:00">13:00 - 14:00</option>
                <option value="14:00-15:00">14:00 - 15:00</option>
                <option value="15:00-16:00">15:00 - 16:00</option>
                <option value="16:00-17:00">16:00 - 17:00</option>
                <option value="17:00-18:00">17:00 - 18:00</option>
                <option value="18:00-19:00">18:00 - 19:00</option>
                <option value="19:00-20:00">19:00 - 20:00</option>
                <option value="20:00-21:00">20:00 - 21:00</option>
                <option value="21:00-22:00">21:00 - 22:00</option>
                <option value="22:00-23:00">22:00 - 23:00</option>
                <option value="23:00-00:00">23:00 - 00:00</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {t('booking.arrivalTimeNote', 'Reception is open 24 hours')}
              </p>
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? t('booking.processing', 'Processing...')
                  : t('booking.completeBooking', 'Complete Booking')}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {t('booking.noPaymentNow', "You won't be charged yet")}
              </p>
            </div>
          </div>

          {/* Right Column - Summary (1/3 width) */}
          <div className="lg:col-span-1">
            <BookingSummaryCard
              hotel={hotel}
              selectedRate={selectedRate}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
