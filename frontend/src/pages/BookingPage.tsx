import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useHistory, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { MapPinIcon, ClockIcon, UserIcon, MinusIcon, PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useCurrency } from '../contexts/CurrencyContext';
import { CurrencySelector } from '../components/CurrencySelector';
import { BookingSummaryCard } from '../components/BookingSummaryCard';
import { GuestInformationForm, GuestFormData } from '../components/GuestInformationForm';
import { bookingsAPI } from '../services/api';
import { toast } from 'react-hot-toast';

interface LocationState {
  hotel: any;
  selectedRate: any;
  selectedRooms?: any[]; // Multiple room selections with count
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
  children?: number;
  childrenAges?: number[];
}

export const BookingPage: React.FC = () => {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { hotelId } = useParams<{ hotelId: string }>();
  const location = useLocation();
  const history = useHistory();
  const { user, logout } = useAuth();
  const state = location.state as LocationState;

  const [formData, setFormData] = useState<GuestFormData>({
    firstName: '',
    lastName: '',
    email: '',
    country: 'EG',
    phoneCode: '+20',
    phone: '',
    bookingFor: 'self',
    specialRequests: ''
  });

  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arrivalTime, setArrivalTime] = useState('');

  // Promo Code State
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeResult, setPromoCodeResult] = useState<{
    valid: boolean;
    code?: string;
    discount?: number;
    finalValue?: number;
    originalValue?: number;
    message?: string;
  } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);

  // Header State
  const [checkInDate, setCheckInDate] = useState<Date | null>(
    state?.checkIn ? new Date(state.checkIn) : null
  );
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(
     state?.checkOut ? new Date(state.checkOut) : null
  );
  const [guestCounts, setGuestCounts] = useState({
    rooms: state?.rooms || 1,
    adults: state?.guests || 2,
    children: state?.children || 0,
    childrenAges: state?.childrenAges || []
  });
  const [showGuestPopover, setShowGuestPopover] = useState(false);

  const handleUpdateSearch = () => {
    if (!checkInDate || !checkOutDate) return;

    // Redirect back to details page with new params to re-fetch rates
    const params = new URLSearchParams();
    params.set('checkIn', checkInDate.toISOString().split('T')[0]);
    params.set('checkOut', checkOutDate.toISOString().split('T')[0]);
    params.set('rooms', guestCounts.rooms.toString());
    params.set('adults', guestCounts.adults.toString());
    if (guestCounts.childrenAges && guestCounts.childrenAges.length > 0) {
      params.set('children', guestCounts.childrenAges.join(','));
    } else {
      params.set('children', '');
    }

    // Preserve destination if known
    if (state.hotel.city) {
        params.set('destination', state.hotel.city);
    }

    history.push({
       pathname: `/hotels/details/${hotelId}`,
       search: params.toString()
    });
  };

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    // Redirect if no booking data
    if (!state || !state.hotel || !state.selectedRate) {
      history.push('/');
    }
  }, [state, history]);

  if (!state || !state.hotel || !state.selectedRate) {
    return null;
  }

  const { hotel, selectedRate, selectedRooms, checkIn, checkOut, guests, rooms } = state;

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validate promo code
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoCodeResult(null);
      return;
    }

    setIsValidatingPromo(true);
    try {
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const numberOfRooms = rooms || 1;
      const pricePerRoomWithMargin = Number(selectedRate.price);
      const totalPriceWithMargin = pricePerRoomWithMargin * numberOfRooms;
      const taxAmount = selectedRate.total_taxes && Number(selectedRate.total_taxes) > 0
        ? Number(selectedRate.total_taxes) * numberOfRooms
        : totalPriceWithMargin * 0.14;
      const bookingValue = totalPriceWithMargin + taxAmount;

      const response = await fetch(`${API_URL}/promo-codes/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoCode,
          bookingValue,
          hotelId: hotel.id,
          destination: hotel.city,
          userId: user?._id
        })
      });

      const data = await response.json();

      if (data.success) {
        setPromoCodeResult({
          valid: true,
          code: data.data.code,
          discount: data.data.discount,
          finalValue: data.data.finalValue,
          originalValue: data.data.originalValue
        });
        toast.success(`Promo code applied! You save ${selectedRate.currency || 'USD'} ${data.data.discount.toFixed(2)}`);
      } else {
        setPromoCodeResult({
          valid: false,
          message: data.message || 'Invalid promo code'
        });
        toast.error(data.message || 'Invalid promo code');
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      setPromoCodeResult({
        valid: false,
        message: 'Failed to validate promo code'
      });
      toast.error('Failed to validate promo code');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Pre-book rate to verify availability and get book_hash
      const { bookingsAPI, paymentsAPI } = await import('../services/api');

      const prebookResponse = await bookingsAPI.prebookRate({
        matchHash: selectedRate.book_hash || selectedRate.match_hash,
        hotelId: hotel.id,
        checkIn,
        checkOut
      });

      if (!prebookResponse.success || !prebookResponse.data) {
        throw new Error(prebookResponse.message || t('booking.errors.rateUnavailable', 'Rate is no longer available'));
      }

      const { bookHash, payment } = prebookResponse.data;
      console.log('✅ Prebook success. Payment details:', payment);

      // IMPORTANT: Calculate the TOTAL amount to charge including margin and room count
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const nights = Math.max(1, Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

      // Number of rooms - use from state or selectedRooms count
      const numberOfRooms = selectedRooms?.reduce((sum, room) => sum + (room.count || 1), 0) || rooms || 1;

      // Use the displayed price which already has margin applied
      // selectedRate.price = total stay price with margin for 1 room
      const pricePerRoomWithMargin = Number(selectedRate.price); // Already includes margin
      const totalPriceWithMargin = pricePerRoomWithMargin * numberOfRooms;

      // Calculate taxes
      const taxAmount = selectedRate.total_taxes && Number(selectedRate.total_taxes) > 0
        ? Number(selectedRate.total_taxes) * numberOfRooms // Multiply taxes by room count
        : totalPriceWithMargin * 0.14;
      const displayedTotal = totalPriceWithMargin + taxAmount;

      console.log('💰 Price calculation:');
      console.log('   Price per room (with margin):', pricePerRoomWithMargin, `(${nights} nights)`);
      console.log('   Number of rooms:', numberOfRooms);
      console.log('   Total price (all rooms):', totalPriceWithMargin);
      console.log('   Taxes:', taxAmount, selectedRate.total_taxes ? '(from API)' : '(14% fallback)');
      console.log('   Displayed total:', displayedTotal);
      console.log('   Prebook payment.amount (1 room, no margin):', payment?.amount, payment?.currency);

      // Step 2: Create Kashier booking with the CALCULATED TOTAL (with margin and multiple rooms)
      // Use our displayed total which includes margin, NOT the prebook amount which is without margin
      let kashierAmount = displayedTotal;
      let usedPromoCode = null;
      let appliedDiscount = 0;

      // Apply promo code if valid
      if (promoCodeResult && promoCodeResult.valid && promoCodeResult.finalValue) {
          console.log('🎉 Applying promo code:', promoCodeResult.code);
          console.log('   Original Total:', kashierAmount);
          console.log('   Discount:', promoCodeResult.discount);
          console.log('   New Total:', promoCodeResult.finalValue);

          kashierAmount = promoCodeResult.finalValue;
          usedPromoCode = promoCodeResult.code;
          appliedDiscount = promoCodeResult.discount || 0;
      }

      const kashierCurrency = selectedRate.currency || 'USD';

      console.log('💳 Kashier payment (final):', kashierAmount, kashierCurrency);

      const bookingData = {
        hotelId: hotel.id,
        hotelName: hotel.name,
        hotelAddress: hotel.address,
        hotelCity: hotel.city || '',
        hotelCountry: hotel.country || '',
        hotelRating: hotel.rating,
        hotelImage: hotel.image || hotel.images?.[0]?.url || '',
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numberOfGuests: guests,
        numberOfRooms: numberOfRooms, // Pass the number of rooms
        roomType: selectedRate.room_name,
        guestName: `${formData.firstName} ${formData.lastName}`,
        guestEmail: formData.email,
        guestPhone: `${formData.phoneCode}${formData.phone}`,
        // Use CALCULATED total with margin and multiple rooms AND promo code discount
        totalPrice: kashierAmount,
        currency: kashierCurrency,
        specialRequests: formData.specialRequests,
        promoCode: usedPromoCode,
        discountAmount: appliedDiscount,
        selectedRate: {
          matchHash: selectedRate.book_hash || selectedRate.match_hash,
          // Store bookHash and payment details for backend to use
          bookHash: bookHash,
          prebookPaymentAmount: payment?.amount,
          prebookPaymentCurrency: payment?.currency,
          roomName: selectedRate.room_name,
          meal: selectedRate.meal || 'nomeal',
          price: selectedRate.price,
          currency: selectedRate.currency || 'USD'
        }
      };

      // Create Kashier payment session
      const response = await paymentsAPI.createKashierSession(bookingData);

      if (response.success && response.data?.sessionUrl) {
        // Redirect to Kashier payment page
        toast.success(t('booking.redirectingToPayment', 'Redirecting to secure payment...'));
        window.location.href = response.data.sessionUrl;
      } else {
        toast.error(t('booking.paymentSessionError', 'Failed to create payment session. Please try again.'));
      }
    } catch (error: any) {
      console.error('Booking/Payment error:', error);
      const errorMessage = error.response?.data?.message || error.message || t('booking.error', 'Failed to create booking. Please try again.');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Compact Header Section */}
      <div className="relative w-full bg-[#E67915] shadow-md z-40 mb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-4">

            {/* Logo & Brand */}
            <div className="flex items-center gap-6 shrink-0">
               <a href="/" className="flex-shrink-0">
                 <img src="/new-design/logo-white.svg" alt="Gaith Tours" className="h-10 w-auto brightness-0 invert" />
               </a>
            </div>

            {/* Compact Search Bar - Editable */}
            <div className="flex-1 max-w-3xl w-full">
               <div className="bg-white/10 backdrop-blur-sm rounded-full p-1 border border-white/20 flex items-center relative gap-1">

                  {/* Destination */}
                  <div className="flex-[1.2] px-4 border-r border-white/20 flex items-center gap-2 min-w-0">
                     <MapPinIcon className="h-4 w-4 text-white/80 shrink-0" />
                     <div className="flex flex-col min-w-0 overflow-hidden w-full">
                        <span className="text-white text-xs font-medium opacity-70 truncate">{t('common.destination', 'Destination')}</span>
                        <input
                           type="text"
                           value={hotel.city || ''}
                           readOnly
                           className="bg-transparent border-none p-0 text-white text-sm font-semibold placeholder-white/50 focus:ring-0 w-full truncate cursor-default"
                        />
                     </div>
                  </div>

                  {/* Dates - Unified Range Picker */}
                  <div className="flex-[2] px-4 border-r border-white/20 flex items-center gap-2">
                     <ClockIcon className="h-4 w-4 text-white/80 shrink-0" />
                     <div className="flex flex-col w-full">
                        <span className="text-white text-xs font-medium opacity-70">Check-in - Check-out</span>
                        <div className="w-full">
                           <DatePicker
                              selected={checkInDate}
                              onChange={(dates: [Date | null, Date | null]) => {
                                 const [start, end] = dates;
                                 setCheckInDate(start);
                                 setCheckOutDate(end);
                              }}
                              startDate={checkInDate}
                              endDate={checkOutDate}
                              selectsRange
                              minDate={new Date()}
                              className="bg-transparent border-none p-0 text-white text-sm font-semibold w-full focus:ring-0 cursor-pointer"
                              dateFormat="dd MMM"
                              placeholderText="Select dates"
                              customInput={
                                 <input
                                    value={
                                       checkInDate && checkOutDate
                                       ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${checkOutDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
                                       : (checkInDate ? `${checkInDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - Select checkout` : 'Select dates')
                                    }
                                    readOnly
                                    className="bg-transparent border-none p-0 text-white text-sm font-semibold w-full focus:ring-0 cursor-pointer"
                                 />
                              }
                           />
                        </div>
                     </div>
                  </div>

                  {/* Guests - Editable Popover Trigger */}
                  <div className="relative flex-[1.2]">
                     <button
                        className="px-4 flex items-center gap-2 w-full text-left"
                        onClick={() => setShowGuestPopover(!showGuestPopover)}
                     >
                        <UserIcon className="h-4 w-4 text-white/80 shrink-0" />
                        <div className="flex flex-col">
                           <span className="text-white text-xs font-medium opacity-70">{t('common.guests', 'Guests')}</span>
                           <span className="text-white text-sm font-semibold truncate">
                              {guestCounts.adults + guestCounts.children} Guests, {guestCounts.rooms} Rm
                           </span>
                        </div>
                     </button>

                     {/* Guest Selection Popover */}
                     {showGuestPopover && (
                        <>
                           <div
                              className="fixed inset-0 z-40"
                              onClick={() => setShowGuestPopover(false)}
                           ></div>
                           <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 text-gray-800 animate-fadeIn">
                              {/* Rooms */}
                              <div className="flex justify-between items-center mb-4">
                                 <span className="font-medium text-sm">Rooms</span>
                                 <div className="flex items-center gap-3">
                                    <button
                                       onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.max(1, prev.rooms - 1)}))}
                                       className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    >
                                       <MinusIcon className="w-4 h-4" />
                                    </button>
                                    <span className="w-4 text-center font-bold text-sm">{guestCounts.rooms}</span>
                                    <button
                                       onClick={() => setGuestCounts(prev => ({...prev, rooms: Math.min(10, prev.rooms + 1)}))}
                                       className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    >
                                       <PlusIcon className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                              {/* Adults */}
                              <div className="flex justify-between items-center mb-4">
                                 <span className="font-medium text-sm">Adults</span>
                                 <div className="flex items-center gap-3">
                                    <button
                                       onClick={() => setGuestCounts(prev => ({...prev, adults: Math.max(1, prev.adults - 1)}))}
                                       className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    >
                                       <MinusIcon className="w-4 h-4" />
                                    </button>
                                    <span className="w-4 text-center font-bold text-sm">{guestCounts.adults}</span>
                                    <button
                                       onClick={() => setGuestCounts(prev => ({...prev, adults: Math.min(30, prev.adults + 1)}))}
                                       className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                    >
                                       <PlusIcon className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                              {/* Children */}
                              <div className="mb-0">
                                 <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm">Children</span>
                                    <div className="flex items-center gap-3">
                                       <button
                                          onClick={() => setGuestCounts(prev => ({
                                             ...prev,
                                             children: Math.max(0, prev.children - 1),
                                             childrenAges: (prev.childrenAges || []).slice(0, -1)
                                          }))}
                                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                       >
                                          <MinusIcon className="w-4 h-4" />
                                       </button>
                                       <span className="w-4 text-center font-bold text-sm">{guestCounts.children}</span>
                                       <button
                                          onClick={() => setGuestCounts(prev => ({
                                             ...prev,
                                             children: Math.min(10, prev.children + 1),
                                             childrenAges: [...(prev.childrenAges || []), 5]
                                          }))}
                                          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600"
                                       >
                                          <PlusIcon className="w-4 h-4" />
                                       </button>
                                    </div>
                                 </div>

                                 {/* Child Age Selectors */}
                                 {guestCounts.childrenAges && guestCounts.childrenAges.length > 0 && (
                                   <div className="mt-4 pt-3 border-t border-gray-100">
                                     <p className="text-xs text-gray-500 mb-2">Select age at check-in:</p>
                                     <div className={`grid ${guestCounts.childrenAges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                       {guestCounts.childrenAges.map((age, index) => (
                                         <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                           <span className="text-xs text-gray-500 whitespace-nowrap">Child {index + 1}</span>
                                           <select
                                             value={age}
                                             onChange={(e) => {
                                               const newAges = [...guestCounts.childrenAges];
                                               newAges[index] = parseInt(e.target.value);
                                               setGuestCounts(prev => ({ ...prev, childrenAges: newAges }));
                                             }}
                                             className="flex-1 min-w-0 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                                           >
                                             {[...Array(18)].map((_, i) => (
                                               <option key={i} value={i}>
                                                 {i} {i === 1 ? 'yr' : 'yrs'}
                                               </option>
                                             ))}
                                           </select>
                                         </div>
                                       ))}
                                     </div>
                                   </div>
                                 )}
                              </div>

                              <button
                                 className="w-full mt-4 bg-orange-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-orange-600 transition-colors"
                                 onClick={() => setShowGuestPopover(false)}
                              >
                                 Done
                              </button>
                           </div>
                        </>
                     )}
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={handleUpdateSearch}
                    className="bg-white text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors ml-2 shadow-sm shrink-0"
                    title={t('common.search', 'Update Search')}
                  >
                     <MagnifyingGlassIcon className="w-5 h-5 stroke-[2.5]" />
                  </button>
               </div>
            </div>

            {/* Auth & Settings */}
            <div className="flex items-center gap-4 shrink-0 text-white">
               <CurrencySelector variant="light" />
               <button className="text-sm font-medium hover:text-orange-100 flex items-center gap-1">
                  <img src="/saudi-flag.png" alt="AR" className="w-5 h-3 object-cover rounded shadow-sm" onError={(e) => e.currentTarget.style.display='none'} />
                  <span>AR</span>
               </button>
               <div className="h-4 w-px bg-white/30"></div>
               {/* Just simpler static links for now matching HotelDetails */}
               {!user ? (
                  <>
                     <Link to="/login" className="text-sm font-medium hover:text-orange-100">Sign In</Link>
                     <Link to="/register" className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors">
                        Register
                     </Link>
                  </>
               ) : (
                  <div className="flex items-center space-x-4 rtl:space-x-reverse text-white">
                     <Link to="/profile" className="font-medium hover:text-orange-200 transition-colors">
                       {user.name}
                     </Link>
                     <button onClick={logout} className="text-sm opacity-80 hover:opacity-100">
                       {t('nav.logout', 'Logout')}
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center">
            {/* Step 1 */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#E67915] text-white rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5" />
                </div>
                <span className="ml-2 text-sm font-medium text-gray-900">
                  {t('booking.yourSelection', 'Your selection')}
                </span>
              </div>
            </div>

            {/* Connector */}
            <div className="w-16 h-0.5 bg-[#E67915] mx-4"></div>

            {/* Step 2 */}
            <div className="flex items-center">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-[#E67915] text-white rounded-full flex items-center justify-center font-semibold">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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

            {/* Promo Code */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking.promoCode', 'Promo Code')}
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    if (promoCodeResult) setPromoCodeResult(null);
                  }}
                  placeholder={t('booking.enterPromoCode', 'Enter code')}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 uppercase ${
                    promoCodeResult?.valid === false ? 'border-red-300' :
                    promoCodeResult?.valid === true ? 'border-green-300' : 'border-gray-300'
                  }`}
                />
                <button
                  onClick={validatePromoCode}
                  disabled={isValidatingPromo || !promoCode.trim()}
                  className="px-4 py-2 bg-orange-100 text-orange-600 rounded-lg font-medium hover:bg-orange-200 transition-colors disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {isValidatingPromo ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t('booking.validating', 'Checking...')}
                    </span>
                  ) : t('booking.apply', 'Apply')}
                </button>
              </div>

              {/* Promo Code Result */}
              {promoCodeResult && (
                <div className={`mt-3 p-3 rounded-lg ${
                  promoCodeResult.valid
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {promoCodeResult.valid ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-700 font-medium">{promoCodeResult.code} applied!</span>
                      </div>
                      <span className="text-green-700 font-semibold">
                        -{selectedRate.currency || 'USD'} {promoCodeResult.discount?.toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="text-red-700">{promoCodeResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSubmitting
                  ? t('booking.processing', 'Processing...')
                  : t('booking.proceedToPayment', 'Proceed to Payment')}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {t('booking.securePayment', 'You will be redirected to a secure payment page')}
              </p>
            </div>
          </div>

          {/* Right Column - Summary (1/3 width) */}
          <div className="lg:col-span-1">
            <BookingSummaryCard
              hotel={hotel}
              selectedRate={selectedRate}
              selectedRooms={selectedRooms}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              children={guestCounts.children}
              rooms={rooms}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
