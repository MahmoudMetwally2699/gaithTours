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
import { LoyaltyRedemption } from '../components/LoyaltyRedemption';
import { bookingsAPI } from '../services/api';
import { getHotelDetails } from '../services/hotelService';
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
  const { t, i18n } = useTranslation(['common', 'booking']);
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

  // Loyalty Points State
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);

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

  // Dynamic rate state - starts with the rate from navigation state, updates when currency changes
  const [currentRate, setCurrentRate] = useState<any>(state?.selectedRate);
  // Dynamic selectedRooms state - for multi-room bookings
  const [currentSelectedRooms, setCurrentSelectedRooms] = useState<any[]>(state?.selectedRooms || []);
  const [isRefetchingRate, setIsRefetchingRate] = useState(false);
  const [rateCurrency, setRateCurrency] = useState<string>(state?.selectedRate?.currency || 'USD');

  // Re-fetch hotel rates when currency changes
  const lastFetchedCurrency = React.useRef<string>(state?.selectedRate?.currency || 'USD');

  useEffect(() => {
    const refetchRates = async () => {
      // Only refetch if currency changed from what we last fetched
      // Use state.hotel.hid (numeric ID) for API calls, not the URL slug
      const numericHid = state?.hotel?.hid;
      if (!numericHid || currency === lastFetchedCurrency.current) {
        console.log('💱 Skipping refetch - same currency:', currency, '===', lastFetchedCurrency.current, 'or no hid:', numericHid);
        return;
      }

      console.log('💱 Currency changed from', lastFetchedCurrency.current, 'to', currency);
      console.log('💱 Hotel object:', { id: state.hotel.id, hid: state.hotel.hid, name: state.hotel.name });

      setIsRefetchingRate(true);
      try {
        console.log('💱 Refetching rates for currency:', currency);
        console.log('💱 Using numeric hid for API:', numericHid);

        // Use numeric hid from state (not URL slug) for proper rate fetching
        // IMPORTANT: children param should be comma-separated ages (e.g., "5,8,12"), not a count
        const childrenAgesStr = state.childrenAges && state.childrenAges.length > 0
          ? state.childrenAges.join(',')
          : '';

        console.log('💱 API params:', {
          hid: numericHid,
          checkin: state.checkIn,
          checkout: state.checkOut,
          adults: state.guests,
          children: childrenAgesStr,
          currency: currency
        });

        const hotelData = await getHotelDetails(String(numericHid), {
          checkin: state.checkIn,
          checkout: state.checkOut,
          adults: state.guests,
          children: childrenAgesStr || undefined,
          currency: currency,
          language: i18n.language
        });

        console.log('💱 API Response:', hotelData);
        console.log('💱 Available rates:', hotelData?.rates?.length);
        console.log('💱 hotelData keys:', hotelData ? Object.keys(hotelData) : 'null');
        if (!hotelData?.rates || hotelData.rates.length === 0) {
          console.error('💱 No rates found! Full response:', JSON.stringify(hotelData, null, 2).slice(0, 500));
        }

        // Helper to find matching rate
        const findMatchingRate = (targetRate: any) => {
           if (!targetRate) return null;
           // Try to match by room_name AND meal
           return hotelData.rates.find((r: any) => r.room_name === targetRate.room_name && r.meal === targetRate.meal)
               || hotelData.rates.find((r: any) => r.room_name === targetRate.room_name)
               || null;
        };

        if (hotelData?.rates && hotelData.rates.length > 0) {
          // Handle multi-room selection update
          if (currentSelectedRooms.length > 0) {
             console.log('BS: Updating multi-room selection...', currentSelectedRooms.length, 'rooms');
             const updatedRooms = currentSelectedRooms.map((room, idx) => {
                const match = findMatchingRate(room);
                if (match) {
                    console.log(`BS: Room ${idx} matched!`, match.room_name, match.price, match.currency);
                    return { ...match, count: room.count };
                } else {
                    console.warn(`BS: Room ${idx} processing FAILED to match:`, room.room_name);
                    // Fallback: If we can't match exact room, try to find ANY room with same name ignoring meal?
                    // Or desperate fallback to first available rate to at least show correct currency?
                    const looseMatch = hotelData.rates.find((r: any) => r.room_name === room.room_name);
                    if (looseMatch) {
                        console.log(`BS: Room ${idx} loose matched (name only):`, looseMatch.room_name, looseMatch.currency);
                        return { ...looseMatch, count: room.count };
                    }
                    console.error(`BS: Room ${idx} completely failed match. Keeping old rate.`, room);
                    return room;
                }
             });
             setCurrentSelectedRooms(updatedRooms);

             // Update central currentRate to the first room's new rate if available
             if (updatedRooms[0]) {
               console.log('BS: Updating currentRate to:', updatedRooms[0].currency);
               setCurrentRate(updatedRooms[0]);
               setRateCurrency(updatedRooms[0].currency || currency);
             }
             toast.success(`Prices updated to ${currency}`);
             lastFetchedCurrency.current = currency; // Update ref after success
          }
          // Handle single rate update
          else {
             const matchingRate = findMatchingRate(currentRate) || hotelData.rates[0];
             setCurrentRate(matchingRate);
             setRateCurrency(matchingRate.currency || currency);
             toast.success(`Prices updated to ${currency}`);
             lastFetchedCurrency.current = currency; // Update ref after success
          }
        } else {
          toast.error('Could not fetch updated rates. Showing original prices.');
        }
      } catch (error) {
        console.error('Error refetching rates:', error);
        toast.error('Failed to update prices. Showing original currency.');
      } finally {
        setIsRefetchingRate(false);
      }
    };

    refetchRates();
  }, [currency]); // Only trigger when currency changes


  // Helper to calculate only taxes paid at booking
  const calculateBookingTaxes = (rate: any, numberOfRooms: number) => {
    if (rate.tax_data && rate.tax_data.taxes && rate.tax_data.taxes.length > 0) {
       // Filter for taxes that are EITHER 'included_by_supplier' OR 'included'
       const bookingTaxes = rate.tax_data.taxes.filter((t: any) => t.included_by_supplier || t.included);
       const bookingTaxAmount = bookingTaxes.reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
       return bookingTaxAmount * numberOfRooms;
    }

    // Fallback if no breakdown
    if (rate.total_taxes && Number(rate.total_taxes) > 0) {
        return Number(rate.total_taxes) * numberOfRooms;
    }

    // Fallback to 14%
    return Number(rate.price) * numberOfRooms * 0.14;
  };

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

  // Auto-populate form with user data if logged in
  useEffect(() => {
    if (user) {
      // Split name into firstName and lastName
      const nameParts = user.name?.trim().split(' ') || [];
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Map nationality to country code
      const nationalityToCountryCode: { [key: string]: string } = {
        'egypt': 'EG',
        'egyptian': 'EG',
        'united states': 'US',
        'american': 'US',
        'usa': 'US',
        'united kingdom': 'GB',
        'british': 'GB',
        'uk': 'GB',
        'saudi arabia': 'SA',
        'saudi': 'SA',
        'united arab emirates': 'AE',
        'emirati': 'AE',
        'uae': 'AE',
        'germany': 'DE',
        'german': 'DE',
        'france': 'FR',
        'french': 'FR',
        'italy': 'IT',
        'italian': 'IT',
        'spain': 'ES',
        'spanish': 'ES',
      };

      const countryCodeFromNationality = user.nationality
        ? nationalityToCountryCode[user.nationality.toLowerCase()] || 'EG'
        : 'EG';

      // Extract phone code and number from user's phone
      const phoneCodes = ['+966', '+971', '+20', '+1', '+44', '+49', '+33', '+39', '+34'];
      let phoneCode = '+20';
      let phoneNumber = user.phone || '';

      for (const code of phoneCodes) {
        if (phoneNumber.startsWith(code)) {
          phoneCode = code;
          phoneNumber = phoneNumber.slice(code.length);
          break;
        }
      }

      setFormData(prev => ({
        ...prev,
        firstName,
        lastName,
        email: user.email || '',
        country: countryCodeFromNationality,
        phoneCode,
        phone: phoneNumber,
      }));
    }
  }, [user]);

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

  const { hotel, selectedRooms: initialSelectedRooms, checkIn, checkOut, guests, rooms } = state;
  // Use dynamic states instead of static navigation state
  const selectedRate = currentRate;
  const selectedRooms = currentSelectedRooms.length > 0 ? currentSelectedRooms : (initialSelectedRooms || []);

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
      newErrors.firstName = t('booking:errors.firstNameRequired', 'First name is required');
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = t('booking:errors.lastNameRequired', 'Last name is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = t('booking:errors.emailRequired', 'Email is required');
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('booking:errors.emailInvalid', 'Please enter a valid email');
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

      // Use helper for accurate tax calculation
      const taxAmount = calculateBookingTaxes(selectedRate, numberOfRooms);
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
        toast.success(t('booking:promoCodeApplied', { currency: selectedRate.currency || 'USD', amount: data.data.discount.toFixed(2) }));
      } else {
        setPromoCodeResult({
          valid: false,
          message: data.message || 'Invalid promo code'
        });
        toast.error(data.message || t('booking:invalidPromoCode', 'Invalid promo code'));
      }
    } catch (error) {
      console.error('Promo validation error:', error);
      setPromoCodeResult({
        valid: false,
        message: t('booking:promoValidationFailed', 'Failed to validate promo code')
      });
      toast.error(t('booking:promoValidationFailed', 'Failed to validate promo code'));
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
        throw new Error(prebookResponse.message || t('booking:errors.rateUnavailable', 'Rate is no longer available'));
      }

      const { bookHash, payment, prebookData } = prebookResponse.data;
      console.log('✅ Prebook success. Payment details:', payment);

      // Extract show_amount from prebook for accurate currency conversion
      // show_amount is the SAR price that corresponds to the USD payment.amount
      const prebookShowAmount = prebookData?.hotels?.[0]?.rates?.[0]?.payment_options?.payment_types?.[0]?.show_amount;
      console.log('   Prebook show_amount (SAR):', prebookShowAmount);

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

      const taxAmount = calculateBookingTaxes(selectedRate, numberOfRooms);
      const displayedTotal = totalPriceWithMargin + taxAmount;

      console.log('💰 Price calculation:');
      console.log('   Price per room (with margin):', pricePerRoomWithMargin, `(${nights} nights)`);
      console.log('   Number of rooms:', numberOfRooms);
      console.log('   Total price (all rooms):', totalPriceWithMargin);
      console.log('   Booking Taxes (Paid Now):', taxAmount);
      console.log('   Displayed total (to charge):', displayedTotal);
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

      // Apply loyalty points discount (already deducted from user's account in LoyaltyRedemption)
      if (loyaltyDiscount > 0) {
          console.log('🎁 Applying loyalty discount:', loyaltyDiscount);
          console.log('   Points used:', loyaltyPointsUsed);
          console.log('   Amount after loyalty:', kashierAmount - loyaltyDiscount);

          kashierAmount = Math.max(0, kashierAmount - loyaltyDiscount);
          appliedDiscount += loyaltyDiscount; // Add to total discount
      }

      const kashierCurrency = selectedRate.currency || 'USD';

      console.log('💳 Kashier payment (final):', kashierAmount, kashierCurrency);

      const bookingData = {
        hotelId: hotel.id,
        hotelHid: hotel.hid, // Numeric hotel ID for fetching contact info
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
        // Loyalty points to be deducted AFTER successful payment
        loyaltyPointsToRedeem: loyaltyPointsUsed > 0 ? loyaltyPointsUsed : null,
        loyaltyDiscount: loyaltyDiscount > 0 ? loyaltyDiscount : null,
        selectedRate: {
          matchHash: selectedRate.book_hash || selectedRate.match_hash,
          // Store bookHash and payment details for backend to use
          bookHash: bookHash,
          prebookPaymentAmount: payment?.amount,
          prebookPaymentCurrency: payment?.currency,
          prebookShowAmount: prebookShowAmount, // SAR amount for accurate conversion
          roomName: selectedRate.room_name,
          meal: selectedRate.meal || 'nomeal',
          price: selectedRate.price,
          currency: selectedRate.currency || 'USD',
          // Cancellation policy fields - important for Profile page display
          isRefundable: selectedRate.is_free_cancellation === true,
          freeCancellationBefore: selectedRate.free_cancellation_before || null
        }
      };

      // Create Kashier payment session
      const response = await paymentsAPI.createKashierSession(bookingData);

      if (response.success && response.data?.sessionUrl) {
        // Redirect to Kashier payment page
        toast.success(t('booking:redirectingToPayment', 'Redirecting to secure payment...'));
        window.location.href = response.data.sessionUrl;
      } else {
        toast.error(t('booking:paymentSessionError', 'Failed to create payment session. Please try again.'));
      }
    } catch (error: any) {
      console.error('Booking/Payment error:', error);
      const errorMessage = error.response?.data?.message || error.message || t('booking:error', 'Failed to create booking. Please try again.');
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-8 relative">
      {/* Rate Refetching Loading Overlay - shows when changing currency */}
      {isRefetchingRate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center animate-bounce-in transform scale-100 transition-all max-w-sm mx-4 text-center">
            <div className="w-16 h-16 border-4 border-orange-100 border-t-[#EF620F] rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {t('booking.updatingRates', 'Updating Rates...')}
            </h3>
            <p className="text-gray-500">
              {t('booking.pleaseWait', 'Please wait while we update prices to {{currency}}', { currency })}
            </p>
          </div>
        </div>
      )}

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

            {/* Search Bar Removed */}<div className="flex-1 max-w-3xl w-full hidden md:block"></div>

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
                     <Link to="/login" className="text-sm font-medium hover:text-orange-100">{t('booking:signIn', 'Sign In')}</Link>
                     <Link to="/register" className="bg-white text-orange-600 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm hover:bg-orange-50 transition-colors">
                        {t('booking:register', 'Register')}
                     </Link>
                  </>
               ) : (
                  <div className="flex items-center gap-2 sm:gap-3 rtl:space-x-reverse text-white">
                     {/* User Profile - Modern Card Style */}
                     <Link
                       to="/profile"
                       className="flex items-center gap-2 bg-white/15 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/30 hover:bg-white/25 transition-all shadow-sm"
                     >
                       <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/30 flex items-center justify-center">
                         <UserIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                       </div>
                       <span className="text-xs sm:text-sm font-semibold truncate max-w-[80px] sm:max-w-[120px]">
                         {user.name?.split(' ')[0]}
                       </span>
                     </Link>
                     {/* Logout Button - Icon on mobile */}
                     <button
                       onClick={logout}
                       className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full hover:bg-white/10 transition-colors"
                       title="Logout"
                     >
                       <svg className="w-4 h-4 sm:w-4.5 sm:h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                       </svg>
                       <span className="hidden sm:inline text-sm font-medium">{t('nav.logout', 'Logout')}</span>
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
                  {t('booking:yourSelection', 'Your selection')}
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
                  {t('booking:yourDetails', 'Your details')}
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
                  {t('booking:finalDetails', 'Final details')}
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

            {/* Room Details Section - After Guest Info */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {selectedRooms && selectedRooms.length > 1
                  ? t('booking:yourRooms', 'Your Rooms')
                  : t('booking:yourRoom', 'Your Room')}
              </h2>

              <div className="space-y-4">
                {/* If we have multiple selected rooms, show each one */}
                {selectedRooms && selectedRooms.length > 0 ? (
                  selectedRooms.map((room: any, index: number) => (
                    <div key={index} className={`flex gap-4 ${index > 0 ? 'pt-4 border-t border-gray-100' : ''}`}>
                      {/* Room Image */}
                      <div className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        {room.room_images && room.room_images[0] ? (
                          <img
                            src={room.room_images[0].replace('170x154', '640x400')}
                            alt={room.room_name}
                            className="w-full h-full object-cover"
                          />
                        ) : hotel.image ? (
                          <img
                            src={hotel.image}
                            alt={room.room_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            🏨
                          </div>
                        )}
                      </div>

                      {/* Room Details */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900">
                            {room.room_name || t('booking:standardRoom', 'Standard Room')}
                          </h3>
                          {(room.count || 1) > 1 && (
                            <span className="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded">
                              x{room.count}
                            </span>
                          )}
                        </div>

                        {/* Meal Plan */}
                        {room.meal && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className={room.meal !== 'nomeal' ? 'text-green-600' : 'text-gray-500'}>
                              {room.meal === 'breakfast' && '🍳'}
                              {room.meal === 'half-board' && '🍽️'}
                              {room.meal === 'full-board' && '🍴'}
                              {room.meal === 'all-inclusive' && '✨'}
                              {room.meal === 'nomeal' && '🚫'}
                              {!['breakfast', 'half-board', 'full-board', 'all-inclusive', 'nomeal'].includes(room.meal) && '🍽️'}
                            </span>
                            <span className={room.meal !== 'nomeal' ? 'text-green-700 font-medium' : 'text-gray-600'}>
                              {room.meal === 'breakfast' && t('booking:mealBreakfast', 'Breakfast included')}
                              {room.meal === 'half-board' && t('booking:mealHalfBoard', 'Breakfast & dinner included')}
                              {room.meal === 'full-board' && t('booking:mealFullBoard', 'All meals included')}
                              {room.meal === 'all-inclusive' && t('booking:mealAllInclusive', 'All-inclusive')}
                              {room.meal === 'nomeal' && t('booking:mealNone', 'No meals included')}
                              {!['breakfast', 'half-board', 'full-board', 'all-inclusive', 'nomeal'].includes(room.meal) && room.meal}
                            </span>
                          </div>
                        )}

                        {/* Cancellation Policy */}
                        <div className="flex items-center gap-2 text-sm">
                          {room.is_free_cancellation ? (
                            <>
                              <span className="text-green-600">✓</span>
                              <span className="text-green-700 font-medium">
                                {t('booking:freeCancellation', 'Free cancellation')}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="text-red-500">⊘</span>
                              <span className="text-gray-700">
                                {t('booking:nonRefundable', 'Non-refundable')}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Fallback to single selectedRate if no selectedRooms */
                  <div className="flex gap-4">
                    {/* Room Image */}
                    <div className="w-28 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                      {(selectedRate as any).room_images && (selectedRate as any).room_images[0] ? (
                        <img
                          src={(selectedRate as any).room_images[0].replace('170x154', '640x400')}
                          alt={selectedRate.room_name}
                          className="w-full h-full object-cover"
                        />
                      ) : hotel.image ? (
                        <img
                          src={hotel.image}
                          alt={selectedRate.room_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          🏨
                        </div>
                      )}
                    </div>

                    {/* Room Details */}
                    <div className="flex-1 space-y-1">
                      <h3 className="font-semibold text-gray-900">
                        {selectedRate.room_name || t('booking:standardRoom', 'Standard Room')}
                      </h3>

                      {/* Meal Plan */}
                      {selectedRate.meal && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className={selectedRate.meal !== 'nomeal' ? 'text-green-600' : 'text-gray-500'}>
                            {selectedRate.meal === 'breakfast' && '🍳'}
                            {selectedRate.meal === 'half-board' && '🍽️'}
                            {selectedRate.meal === 'full-board' && '🍴'}
                            {selectedRate.meal === 'all-inclusive' && '✨'}
                            {selectedRate.meal === 'nomeal' && '🚫'}
                            {!['breakfast', 'half-board', 'full-board', 'all-inclusive', 'nomeal'].includes(selectedRate.meal) && '🍽️'}
                          </span>
                          <span className={selectedRate.meal !== 'nomeal' ? 'text-green-700 font-medium' : 'text-gray-600'}>
                            {selectedRate.meal === 'breakfast' && t('booking:mealBreakfast', 'Breakfast included')}
                            {selectedRate.meal === 'half-board' && t('booking:mealHalfBoard', 'Breakfast & dinner included')}
                            {selectedRate.meal === 'full-board' && t('booking:mealFullBoard', 'All meals included')}
                            {selectedRate.meal === 'all-inclusive' && t('booking:mealAllInclusive', 'All-inclusive')}
                            {selectedRate.meal === 'nomeal' && t('booking:mealNone', 'No meals included')}
                            {!['breakfast', 'half-board', 'full-board', 'all-inclusive', 'nomeal'].includes(selectedRate.meal) && selectedRate.meal}
                          </span>
                        </div>
                      )}

                      {/* Cancellation Policy */}
                      <div className="flex items-center gap-2 text-sm">
                        {selectedRate.is_free_cancellation ? (
                          <>
                            <span className="text-green-600">✓</span>
                            <span className="text-green-700 font-medium">
                              {t('booking:freeCancellation', 'Free cancellation')}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-red-500">⊘</span>
                            <span className="text-gray-700">
                              {t('booking:nonRefundable', 'Non-refundable')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Guests info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-3 border-t border-gray-100 mt-4">
                <span>👥</span>
                <span>
                  {t('booking:guests', 'Guests')}: {guests} {guests === 1 ? t('booking:adult', 'adult') : t('booking:adults', 'adults')}
                  {guestCounts.children > 0 && `, ${guestCounts.children} ${guestCounts.children === 1 ? t('booking:child', 'child') : t('booking:children', 'children')}`}
                </span>
              </div>

              {/* Check-in / Check-out dates */}
              <div className="flex items-center gap-2 text-sm text-gray-600 pt-2">
                <span>📅</span>
                <span>
                  {new Date(checkIn).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                  {' → '}
                  {new Date(checkOut).toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Arrival Time */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking:arrivalTime', 'Arrival Time')}
              </h3>
              <select
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">{t('booking:selectTime', 'Please select')}</option>
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
                {t('booking:arrivalTimeNote', 'Reception is open 24 hours')}
              </p>
            </div>

            {/* Cancellation Policy Details */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking:cancellationPolicy', 'Cancellation Policy')}
              </h3>
              <div className={`p-4 rounded-lg ${selectedRate.is_free_cancellation ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${selectedRate.is_free_cancellation ? 'bg-green-100' : 'bg-red-100'}`}>
                    {selectedRate.is_free_cancellation ? (
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h4 className={`font-semibold ${selectedRate.is_free_cancellation ? 'text-green-800' : 'text-red-800'}`}>
                      {selectedRate.is_free_cancellation
                        ? t('booking:freeCancellationTitle', 'Free Cancellation Available')
                        : t('booking:nonRefundableTitle', 'Non-Refundable Rate')}
                    </h4>
                    <p className={`text-sm mt-1 ${selectedRate.is_free_cancellation ? 'text-green-700' : 'text-red-700'}`}>
                      {selectedRate.is_free_cancellation ? (
                        (selectedRate as any).free_cancellation_before
                          ? t('booking:freeCancellationUntil', 'Cancel for free before {{date}}', {
                              date: new Date((selectedRate as any).free_cancellation_before).toLocaleDateString('en-GB', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            })
                          : t('booking:freeCancellationGeneral', 'You can cancel this booking for free')
                      ) : (
                        t('booking:nonRefundableDesc', 'This rate is non-refundable. The full amount will be charged upon booking.')
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact & Support */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking:needHelp', 'Need Help?')}
              </h3>
              <div className="space-y-3">
                {/* WhatsApp Contact */}
                <a
                  href="https://wa.me/966549412412"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-green-800">{t('booking:chatWhatsApp', 'Chat on WhatsApp')}</span>
                    <p className="text-sm text-green-600">{t('booking:quickResponse', 'Get quick response')}</p>
                  </div>
                </a>

                {/* Email Support */}
                <a
                  href="mailto:support@gaithtours.com"
                  className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-medium text-gray-800">{t('booking:emailSupport', 'Email Support')}</span>
                    <p className="text-sm text-gray-500">support@gaithtours.com</p>
                  </div>
                </a>

                {/* FAQ Accordion */}
                <details className="group">
                  <summary className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                    <svg className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-medium text-gray-800">{t('booking:faq', 'Frequently Asked Questions')}</span>
                  </summary>
                  <div className="mt-2 space-y-2 pl-4">
                    <div className="p-3 bg-white border border-gray-100 rounded">
                      <p className="font-medium text-sm text-gray-800">{t('booking:faq1q', 'When will I receive my confirmation?')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('booking:faq1a', 'You will receive an instant email confirmation after completing your booking.')}</p>
                    </div>
                    <div className="p-3 bg-white border border-gray-100 rounded">
                      <p className="font-medium text-sm text-gray-800">{t('booking:faq2q', 'Can I modify my booking?')}</p>
                      <p className="text-sm text-gray-500 mt-1">{t('booking:faq2a', 'Yes, contact our support team to request changes to your booking.')}</p>
                    </div>
                  </div>
                </details>
              </div>
            </div>

            {/* Loyalty Points Redemption */}
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <LoyaltyRedemption
                bookingAmount={Number(selectedRate.price) * (rooms || 1)}
                currency={selectedRate.currency || 'USD'}
                exchangeRate={
                  // Calculate exchange rate: USD to booking currency
                  // These are approximate rates - RateHawk uses real rates
                  selectedRate.currency === 'SAR' ? 3.75 :
                  selectedRate.currency === 'EGP' ? 50 :
                  1 // Default for USD
                }
                onApplyDiscount={(discount, pointsUsed) => {
                  setLoyaltyDiscount(discount);
                  setLoyaltyPointsUsed(pointsUsed);
                  const curr = selectedRate.currency || 'USD';
                  toast.success(`Applied ${curr} ${discount.toFixed(2)} discount using ${pointsUsed} points!`);
                }}
                onRemoveDiscount={() => {
                  setLoyaltyDiscount(0);
                  setLoyaltyPointsUsed(0);
                }}
              />
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking:promoCode', 'Promo Code')}
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => {
                    setPromoCode(e.target.value.toUpperCase());
                    if (promoCodeResult) setPromoCodeResult(null);
                  }}
                  placeholder={t('booking:enterPromoCode', 'Enter code')}
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
                      {t('booking:validating', 'Checking...')}
                    </span>
                  ) : t('booking:apply', 'Apply')}
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

            {/* Submit Button with Trust Badges */}
            <div className="mt-6">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t('booking:processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t('booking:proceedToPayment', 'Proceed to Secure Payment')}
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="mt-4 space-y-3">
                {/* Security Indicators */}
                <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>{t('booking:secureBooking', 'Secure Booking')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{t('booking:noHiddenFees', 'No Hidden Fees')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>{t('booking:instantConfirmation', 'Instant Confirmation')}</span>
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="flex items-center justify-center gap-3">
                  <span className="text-xs text-gray-400">{t('booking:weAccept', 'We accept')}:</span>
                  {/* Visa */}
                  <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-8 h-5">
                      <path fill="#1565C0" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                      <path fill="#FFF" d="M15.186 19l-2.626 7.832c0 0-.667-3.313-.733-3.729-1.495-3.411-3.701-3.221-3.701-3.221L10.846 30v-.002h3.057L18.224 19H15.186zM17.689 30L20.56 30 22.296 19 19.389 19zM38.008 19h-3.021l-4.71 11h2.852l.588-1.571h3.596L37.619 30h2.613L38.008 19zM34.513 26.328l1.563-4.157.818 4.157H34.513zM26.369 22.206c0-.606.498-1.057 1.926-1.057.928 0 1.991.674 1.991.674l.466-2.309c0 0-1.358-.515-2.691-.515-3.019 0-4.576 1.444-4.576 3.272 0 3.306 3.979 2.853 3.979 4.551 0 .291-.231.964-1.888.964-1.662 0-2.759-.609-2.759-.609l-.495 2.216c0 0 1.063.606 3.117.606 2.059 0 4.915-1.54 4.915-3.752C30.354 23.586 26.369 23.394 26.369 22.206z"/>
                      <path fill="#FFC107" d="M12.212,24.945l-0.966-4.748c0,0-0.437-1.029-1.573-1.029c-1.136,0-4.44,0-4.44,0S10.894,20.84,12.212,24.945z"/>
                    </svg>
                  </div>
                  {/* Mastercard */}
                  <div className="w-10 h-6 bg-white border border-gray-200 rounded flex items-center justify-center">
                    <svg viewBox="0 0 48 48" className="w-8 h-5">
                      <path fill="#3F51B5" d="M45,35c0,2.209-1.791,4-4,4H7c-2.209,0-4-1.791-4-4V13c0-2.209,1.791-4,4-4h34c2.209,0,4,1.791,4,4V35z"/>
                      <path fill="#FFC107" d="M30 24A6 6 0 1 0 30 36 6 6 0 1 0 30 24z"/>
                      <path fill="#FF3D00" d="M18 24A6 6 0 1 0 18 36 6 6 0 1 0 18 24z"/>
                      <path fill="#FF9800" d="M24,30c0-1.193,0.348-2.303,0.945-3.239c-0.659-0.477-1.468-0.761-2.345-0.761c-2.209,0-4,1.791-4,4s1.791,4,4,4c0.877,0,1.686-0.284,2.345-0.761C24.348,32.303,24,31.193,24,30z"/>
                    </svg>
                  </div>
                  {/* Generic Card */}
                  <div className="w-10 h-6 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Summary (1/3 width) */}
          <div className="lg:col-span-1 space-y-6">
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

            {/* Hotel Highlights */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {t('booking:propertyHighlights', 'Property Highlights')}
              </h3>

              {/* Star Rating */}
              {hotel.rating && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex">
                    {[...Array(Math.floor(hotel.rating))].map((_, i) => (
                      <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">{hotel.rating} {t('booking:starHotel', 'Star Hotel')}</span>
                </div>
              )}

              {/* Key Amenities */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                  </svg>
                  <span>{t('booking:freeWifi', 'Free WiFi')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('booking:airConditioning', 'Air Conditioning')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{t('booking:dailyHousekeeping', '24/7 Front Desk')}</span>
                </div>
                {hotel.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>{t('booking:greatLocation', 'Great Location')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Map Preview */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('booking:hotelLocation', 'Hotel Location')}
                </h3>
              </div>

              {/* Map Container */}
              <div className="h-48 bg-gray-100 relative">
                {(() => {
                  // Check for coordinates in various formats
                  const lat = hotel.coordinates?.latitude || hotel.latitude;
                  const lng = hotel.coordinates?.longitude || hotel.longitude;
                  const hasCoords = lat && lng && lat !== 0 && lng !== 0;

                  if (hasCoords) {
                    return (
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${lat},${lng}&zoom=15`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Hotel Location"
                      />
                    );
                  } else if (hotel.address || hotel.name) {
                    // Fallback to address/name search
                    const searchQuery = encodeURIComponent(`${hotel.name} ${hotel.address || ''}`);
                    return (
                      <iframe
                        src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${searchQuery}`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Hotel Location"
                      />
                    );
                  } else {
                    return (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-sm">{t('booking:mapNotAvailable', 'Map not available')}</span>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Address */}
              <div className="p-4">
                <div className="flex items-start gap-2 text-sm text-gray-600">
                  <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
                  <span>{hotel.address || hotel.location || t('booking:addressNotAvailable', 'Address not available')}</span>
                </div>
                {(hotel.address || hotel.name) && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${hotel.name} ${hotel.address || ''}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-sm text-orange-600 hover:text-orange-700"
                  >
                    {t('booking:openInMaps', 'Open in Google Maps')}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Book Button */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs text-gray-500">{t('booking:totalPrice', 'Total Price')}</span>
            <p className="text-lg font-bold text-gray-900">
              {selectedRate.currency || 'USD'} {(() => {
                const numberOfRooms = selectedRooms && selectedRooms.length > 0
                  ? selectedRooms.reduce((sum: any, room: any) => sum + (room.count || 1), 0)
                  : rooms || 1;

                const basePrice = selectedRooms && selectedRooms.length > 0
                  ? selectedRooms.reduce((total: number, room: any) => total + (Number(room.price) * (room.count || 1)), 0)
                  : Number(selectedRate.price) * numberOfRooms;

                const taxAmount = calculateBookingTaxes(selectedRate, numberOfRooms);
                return (basePrice + taxAmount).toFixed(2);
              })()}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 transition-colors disabled:bg-gray-400 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                {t('booking:bookNow', 'Book Now')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
