import React, { useState, useRef, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { useUserLocation } from '../hooks/useUserLocation';
import {
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ChevronDownIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { HomeIcon, BuildingOffice2Icon } from '@heroicons/react/24/solid';
import { DateRangePicker } from './DateRangePicker';
import { CurrencySelector } from './CurrencySelector';
import dayjs from 'dayjs';

// Types for autocomplete
interface AutocompleteSuggestion {
  id: string | number;
  name: string;
  nameAr?: string;
  type: string;
  hid?: number;
  country_code?: string;
}

interface AutocompleteResults {
  hotels: AutocompleteSuggestion[];
  regions: AutocompleteSuggestion[];
}

export const MainSection: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const { user, logout } = useAuth();
  const { isRTL } = useDirection();
  const history = useHistory();

  // Shared location detection
  const { city: detectedCity, isDetecting: isDetectingLocation } = useUserLocation(i18n.language);

  // Search State
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | null>(dayjs().toDate());
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(dayjs().add(1, 'day').toDate());
  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0, childrenAges: [] as number[] });
  const [isWorkTravel, setIsWorkTravel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showGuestPicker, setShowGuestPicker] = useState(false);

  // Refs
  const datePickerRef = useRef<HTMLDivElement>(null);
  const guestPickerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const searchNameRef = useRef<string>(''); // English name for search when Arabic is displayed

  // Autocomplete State
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResults>({ hotels: [], regions: [] });
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isLoadingAutocomplete, setIsLoadingAutocomplete] = useState(false);
  const hasUserTyped = useRef(false); // Track if user has manually typed

  // Set destination from detected city (only if user hasn't typed anything)
  useEffect(() => {
    if (detectedCity && !hasUserTyped.current && !destination) {
      setDestination(detectedCity);
    }
  }, [detectedCity]);

  // Close date picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

  // Close guest picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (guestPickerRef.current && !guestPickerRef.current.contains(event.target as Node)) {
        setShowGuestPicker(false);
      }
    };

    if (showGuestPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showGuestPicker]);

  // Autocomplete: debounced API call
  useEffect(() => {
    // Only fetch suggestions if user has manually typed
    if (!hasUserTyped.current) {
      return;
    }

    const fetchSuggestions = async () => {
      if (!destination || destination.length < 2) {
        setAutocompleteResults({ hotels: [], regions: [] });
        setShowAutocomplete(false);
        return;
      }

      setIsLoadingAutocomplete(true);
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        // Smart detection: If query contains Arabic characters, use 'ar' regardless of app language
        const isArabic = /[\u0600-\u06FF]/.test(destination);
        const searchLanguage = isArabic ? 'ar' : i18n.language;

        const response = await fetch(`${API_URL}/hotels/suggest?query=${encodeURIComponent(destination)}&language=${searchLanguage}`);
        const data = await response.json();

        if (data.success && data.data) {
          const hotels = Array.isArray(data.data.hotels) ? data.data.hotels : [];
          const regions = Array.isArray(data.data.regions) ? data.data.regions : [];
          setAutocompleteResults({ hotels, regions });
          if (hotels.length > 0 || regions.length > 0) {
            setShowAutocomplete(true);
          }
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
        setAutocompleteResults({ hotels: [], regions: [] });
      } finally {
        setIsLoadingAutocomplete(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 350);
    return () => clearTimeout(debounceTimer);
  }, [destination, i18n.language]);

  // Close autocomplete when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    if (showAutocomplete) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAutocomplete]);

  // Handle autocomplete selection
  const handleSelectSuggestion = (suggestion: AutocompleteSuggestion) => {
    hasUserTyped.current = false; // Reset so dropdown doesn't show on focus
    const displayName = (i18n.language === 'ar' && suggestion.nameAr) ? suggestion.nameAr : suggestion.name;
    setDestination(displayName);
    // Store English name for search URL so RateHawk can find it
    searchNameRef.current = suggestion.name;
    setShowAutocomplete(false);
    setAutocompleteResults({ hotels: [], regions: [] }); // Clear results
    // Auto-open date picker after hotel selection
    setTimeout(() => setShowDatePicker(true), 100);
  };

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setCheckInDate(startDate);
    setCheckOutDate(endDate);
    // If both dates are selected, close date picker and open guest modal
    if (startDate && endDate) {
      setTimeout(() => {
        setShowDatePicker(false);
        setShowGuestPicker(true);
      }, 300);
    }
  };

  const formatDateDisplay = () => {
    if (checkInDate && checkOutDate) {
      return `${dayjs(checkInDate).format('MMM DD')} - ${dayjs(checkOutDate).format('MMM DD')}`;
    }
    return `${t('mainSection.selectDates')} - ${t('mainSection.selectDates')}`;
  };

  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    }
    return 0;
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
    document.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save search history if user is logged in
    if (user && destination) {
      try {
        const token = localStorage.getItem('token');
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        await fetch(`${API_URL}/users/history`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ destination })
        });
      } catch (error) {
        console.error('Failed to save search history:', error);
      }
    }

    // Use stored English name if available (from autocomplete selection), otherwise use typed text
    const searchDest = searchNameRef.current || destination;
    searchNameRef.current = ''; // Reset after use
    const queryParams = new URLSearchParams({
      destination: searchDest,
      checkIn: checkInDate ? dayjs(checkInDate).format('YYYY-MM-DD') : '',
      checkOut: checkOutDate ? dayjs(checkOutDate).format('YYYY-MM-DD') : '',
      rooms: guests.rooms.toString(),
      adults: guests.adults.toString(),
      children: guests.childrenAges.length > 0 ? guests.childrenAges.join(',') : '',
      language: /[\u0600-\u06FF]/.test(searchDest) ? 'ar' : i18n.language
    });
    history.push(`/hotels/search?${queryParams.toString()}`);
  };

  return (
    <div className="relative z-50 min-h-[300px] md:h-[300px] w-full overflow-visible font-sans pb-4 md:pb-0">
      {/* Background Image - optimized WebP */}
      <div className="absolute inset-0 z-0 min-h-[300px] md:h-[300px] overflow-hidden rounded-b-[2rem] md:rounded-b-[3rem]">
        <img
          src="/new-design/header-photo-background.webp"
          alt="Background"
          className="w-full h-full object-cover object-center"
          width={1920}
          height={300}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full px-3 sm:px-6 lg:px-16 py-2 md:py-3">

        {/* Custom Header */}
        <header className="flex flex-row justify-between items-center w-full mb-2 md:mb-4">

          {/* Logo - First on Mobile */}
          <Link to="/" className="flex-shrink-0 order-1">
            <img src="/new-design/logo.svg" alt="Gaith Tours" className="h-10 sm:h-12 md:h-14 w-auto drop-shadow-lg" width={160} height={56} />
          </Link>

          {/* Contact & Settings - Desktop Only */}
          <div className="hidden lg:flex items-center space-x-4 xl:space-x-6 rtl:space-x-reverse text-white text-sm font-medium order-2">
            <div className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer hover:text-orange-200">
              <PhoneIcon className="w-4 h-4" />
              <span>+966549412412</span>
            </div>

            <CurrencySelector variant="light" />

            <button
              onClick={toggleLanguage}
              className="flex items-center space-x-1 hover:text-orange-200 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm"
            >
              <GlobeAltIcon className="w-4 h-4" />
              <span className="uppercase">{i18n.language}</span>
              <ChevronDownIcon className="w-3 h-3" />
            </button>
          </div>

          {/* Auth Buttons - Compact on Mobile */}
          <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse order-3">
            {!user ? (
              <>
                <Link to="/login" className="text-white font-medium hover:text-orange-200 transition text-sm sm:text-base md:text-lg">
                  {t('nav.login', { ns: 'common', defaultValue: 'Sign in' })}
                </Link>
                <Link
                  to="/register"
                  className="bg-[#F7871D] hover:bg-orange-600 text-white px-3 sm:px-4 md:px-6 py-1.5 sm:py-2 rounded-lg font-medium transition shadow-md text-sm sm:text-base"
                >
                  {t('nav.register', { ns: 'common', defaultValue: 'Register' })}
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
                  <span className="hidden sm:inline text-sm font-medium">{t('nav.logout', { ns: 'common', defaultValue: 'Logout' })}</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Mobile-only Currency & Language Row */}
        <div className="flex lg:hidden items-center justify-center space-x-3 rtl:space-x-reverse mb-2">
          <CurrencySelector variant="light" />
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 text-white hover:text-orange-200 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm text-sm"
          >
            <GlobeAltIcon className="w-4 h-4" />
            <span className="uppercase">{i18n.language}</span>
          </button>
        </div>

        {/* Hero Content */}
        <main className="flex-grow flex flex-col justify-center max-w-7xl mx-auto w-full px-1 sm:px-0">

           {/* Heading */}
           <div
              className="mb-2 md:mb-3 text-center md:text-left rtl:text-right"
            >
               <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white drop-shadow-md px-2 md:px-0 flex flex-col gap-3 md:gap-5">
                <span>{t('mainSection.tagline')}</span>
                <span className="font-medium">{t('mainSection.subtitle')}</span>
              </h1>
           </div>

            {/* Tabs */}
            <div className="flex space-x-3 sm:space-x-4 rtl:space-x-reverse mb-2 justify-center md:justify-start rtl:justify-start px-2 md:px-0">
             <div className="relative group/flights">
               <button className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse text-white/70 hover:text-white transition px-2 sm:px-4 py-1.5 sm:py-2 cursor-not-allowed">
                 <svg className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                 </svg>
                 <span className="text-base sm:text-lg font-medium">{t('mainSection.flights')}</span>
               </button>
               {/* Coming Soon Tooltip - positioned on left */}
               <div className="absolute top-1/2 -translate-y-1/2 right-full mr-2 opacity-0 group-hover/flights:opacity-100 transition-all duration-300 pointer-events-none z-[200]">
                 <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                   ✈️ {t('mainSection.comingSoon')}
                 </div>
                 <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-orange-600 rotate-45"></div>
               </div>
             </div>

             <button className="flex items-center space-x-1.5 sm:space-x-2 rtl:space-x-reverse text-white border-b-2 border-[#F7871D] px-2 sm:px-4 py-1.5 sm:py-2">
                <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-base sm:text-lg font-medium">{t('mainSection.accommodation')}</span>
             </button>
           </div>

           {/* Search Bar - Responsive Layout */}
           <div
             className="relative z-[100] w-full bg-white rounded-2xl md:rounded-[2rem] p-1.5 md:p-2 shadow-2xl border-2 md:border-4 border-white/50 backdrop-blur-sm mx-auto max-w-full"
           >
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-stretch md:items-center divide-y md:divide-y-0 md:divide-x rtl:divide-x-reverse divide-gray-200">

                 {/* Destination */}
                 <div className="flex-[1.5] w-full p-3 md:p-4 flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse relative min-w-0" ref={autocompleteRef}>
                    <MapPinIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 flex flex-col relative min-w-0">
                      <div className="flex items-center space-x-2 min-w-0">
                        <input
                          type="text"
                          value={destination}
                          title={destination}
                          onChange={(e) => {
                            hasUserTyped.current = true;
                            setDestination(e.target.value);
                          }}
                          onFocus={() => {
                            if (hasUserTyped.current && destination.length >= 2 && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0)) {
                              setShowAutocomplete(true);
                            }
                          }}
                          placeholder={isDetectingLocation ? t('loading', { ns: 'common' }) : t('mainSection.searchPlaceholder')}
                          className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 focus:ring-0 text-base md:text-lg truncate"
                          required
                          disabled={isDetectingLocation}
                          autoComplete="off"
                        />
                        {isDetectingLocation && (
                          <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {isLoadingAutocomplete && !isDetectingLocation && (
                          <svg className="animate-spin h-4 w-4 md:h-5 md:w-5 text-orange-500 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                      </div>

                      {/* Autocomplete Dropdown */}
                      {showAutocomplete && (autocompleteResults.hotels.length > 0 || autocompleteResults.regions.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl md:rounded-2xl shadow-2xl border border-gray-100 z-50 max-h-60 md:max-h-80 overflow-y-auto">
                          {/* Regions/Cities */}
                          {autocompleteResults.regions.length > 0 && (
                            <div className="p-2 border-b border-gray-100">
                              <p className="text-xs font-semibold text-gray-400 px-3 py-1 uppercase">Cities & Regions</p>
                              {autocompleteResults.regions.slice(0, 5).map((region) => (
                                <button
                                  key={region.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(region)}
                                  className="w-full flex items-center space-x-2 md:space-x-3 px-3 py-2 hover:bg-orange-50 rounded-lg transition text-left"
                                >
                                  <MapPinIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-800 font-medium text-sm md:text-base truncate">{region.name}</p>
                                    <p className="text-xs text-gray-400 capitalize">
                                      {region.type || 'Region'}
                                      {(region as any).country_code && ` · ${(region as any).country_code}`}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                          {/* Hotels */}
                          {autocompleteResults.hotels.length > 0 && (
                            <div className="p-2">
                              <p className="text-xs font-semibold text-gray-400 px-3 py-1 uppercase">Hotels</p>
                              {autocompleteResults.hotels.slice(0, 5).map((hotel) => (
                                <button
                                  key={hotel.id}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(hotel)}
                                  className="w-full flex items-center space-x-2 md:space-x-3 px-3 py-2 hover:bg-orange-50 rounded-lg transition text-left"
                                >
                                  <BuildingOffice2Icon className="w-4 h-4 md:w-5 md:h-5 text-gray-500 flex-shrink-0" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-gray-800 font-medium text-sm md:text-base truncate">{(i18n.language === 'ar' && (hotel as any).nameAr) ? (hotel as any).nameAr : hotel.name}</p>
                                    <p className="text-xs text-gray-400">Hotel</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                 </div>

                 {/* Dates */}
                 <div className="flex-1 w-full p-3 md:p-4 flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse relative" ref={datePickerRef}>
                    <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
                    <div
                      className="flex flex-col w-full cursor-pointer min-w-0"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                       <span className="text-sm md:text-sm font-bold text-gray-800 truncate">{formatDateDisplay()}</span>
                       <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span className="truncate">{t('mainSection.checkIn')} - {t('mainSection.checkOut')}</span>
                       </div>
                    </div>
                    {/* Nights tag */}
                    {calculateNights() > 0 && (
                      <div className="hidden sm:block bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                         {calculateNights()} {calculateNights() === 1 ? t('mainSection.night') : t('mainSection.nights')}
                      </div>
                    )}

                    {/* Date Range Picker Popup */}
                    {showDatePicker && (
                      <div className="fixed inset-0 md:absolute md:inset-auto md:top-full md:left-0 md:mt-2 z-[9999] md:z-50 flex items-end md:items-start justify-center md:justify-start bg-black/30 md:bg-transparent">
                        <div className="w-full md:w-auto max-w-full bg-white rounded-t-2xl md:rounded-xl shadow-2xl overflow-hidden">
                          <DateRangePicker
                            startDate={checkInDate}
                            endDate={checkOutDate}
                            onChange={handleDateChange}
                            minDate={new Date()}
                          />
                          {/* Mobile close button */}
                          <div className="md:hidden p-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => setShowDatePicker(false)}
                              className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium"
                            >
                              {t('mainSection.done')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Guests - Simplified on Mobile */}
                 <div className="flex-1 w-full p-3 md:p-4 flex items-center justify-between relative min-w-0" ref={guestPickerRef}>
                    <div
                      className="flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse cursor-pointer w-full min-w-0"
                      onClick={() => setShowGuestPicker(!showGuestPicker)}
                    >
                       <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-700 flex-shrink-0" />
                       <span className="text-gray-700 text-sm md:text-base lg:text-lg truncate">
                          {guests.children > 0
                            ? guests.children > 1
                              ? t('mainSection.guestSummaryWithChildrenPlural', { rooms: guests.rooms, adults: guests.adults, children: guests.children })
                              : t('mainSection.guestSummaryWithChildren', { rooms: guests.rooms, adults: guests.adults, children: guests.children })
                            : t('mainSection.guestSummary', { rooms: guests.rooms, adults: guests.adults })
                          }
                       </span>
                    </div>

                    {/* Guest Picker Popup */}
                    {showGuestPicker && (
                      <div className="fixed inset-x-0 md:absolute md:inset-x-auto bottom-0 md:top-full md:right-0 md:bottom-auto mt-0 md:mt-2 z-[9999] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl w-full md:w-80 max-h-[85vh] md:max-h-[400px] flex flex-col">
                        <h3 className="text-lg font-bold text-gray-800 p-4 md:p-6 pb-2">Rooms and Guests</h3>

                        {/* Scrollable content area */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-6 pb-2">

                        {/* Rooms */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div>
                            <p className="font-medium text-gray-800">{t('mainSection.rooms')}</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => setGuests(prev => ({ ...prev, rooms: Math.max(1, prev.rooms - 1) }))}
                              disabled={guests.rooms <= 1}
                              className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 disabled:border-gray-300 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center justify-center font-bold text-lg"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-medium text-gray-800 text-lg">{guests.rooms}</span>
                            <button
                              type="button"
                              onClick={() => setGuests(prev => ({ ...prev, rooms: prev.rooms + 1 }))}
                              className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 flex items-center justify-center font-bold text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Adults */}
                        <div className="flex items-center justify-between py-3 border-b border-gray-200">
                          <div>
                            <p className="font-medium text-gray-800">{t('mainSection.adults')}</p>
                            <p className="text-xs text-gray-500">18+yrs</p>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => setGuests(prev => ({ ...prev, adults: Math.max(1, prev.adults - 1) }))}
                              disabled={guests.adults <= 1}
                              className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 disabled:border-gray-300 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center justify-center font-bold text-lg"
                            >
                              −
                            </button>
                            <span className="w-10 text-center font-medium text-gray-800 text-lg">{guests.adults}</span>
                            <button
                              type="button"
                              onClick={() => setGuests(prev => ({ ...prev, adults: prev.adults + 1 }))}
                              className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 flex items-center justify-center font-bold text-lg"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children */}
                        <div className="py-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-800">{t('mainSection.children')}</p>
                              <p className="text-xs text-gray-500">0-17yrs</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <button
                                type="button"
                                onClick={() => setGuests(prev => ({
                                  ...prev,
                                  children: Math.max(0, prev.children - 1),
                                  childrenAges: prev.childrenAges.slice(0, -1)
                                }))}
                                disabled={guests.children <= 0}
                                className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 disabled:border-gray-300 disabled:text-gray-300 disabled:hover:bg-transparent flex items-center justify-center font-bold text-lg"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-medium text-gray-800 text-lg">{guests.children}</span>
                              <button
                                type="button"
                                onClick={() => setGuests(prev => ({
                                  ...prev,
                                  children: prev.children + 1,
                                  childrenAges: [...prev.childrenAges, 5]
                                }))}
                                className="w-9 h-9 rounded-full border-2 border-orange-500 text-orange-500 hover:bg-orange-50 flex items-center justify-center font-bold text-lg"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Child Age Selectors */}
                          {guests.childrenAges.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-xs text-gray-500 mb-2">{t('mainSection.selectAge')}:</p>
                              <div className={`grid ${guests.childrenAges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                                {guests.childrenAges.map((age, index) => (
                                  <div key={index} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                                    <span className="text-xs text-gray-500 whitespace-nowrap">{t('mainSection.childAge', { index: index + 1 })}</span>
                                    <select
                                      value={age}
                                      onChange={(e) => {
                                        const newAges = [...guests.childrenAges];
                                        newAges[index] = parseInt(e.target.value);
                                        setGuests(prev => ({ ...prev, childrenAges: newAges }));
                                      }}
                                      className="flex-1 min-w-0 px-2 py-1 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 cursor-pointer"
                                    >
                                      {[...Array(18)].map((_, i) => (
                                        <option key={i} value={i}>
                                          {i} {i === 1 ? t('mainSection.ageYear') : t('mainSection.ageYears')}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        </div>

                        {/* Done Button - Fixed at bottom */}
                        <div className="p-4 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => setShowGuestPicker(false)}
                            className="w-full bg-orange-500 text-white py-3 md:py-3 rounded-lg font-medium hover:bg-orange-600 transition text-base md:text-base"
                          >
                            {t('mainSection.done')}
                          </button>
                        </div>
                      </div>
                    )}
                 </div>

                 {/* Work Travel - Hidden on small mobile */}
                 <div className="hidden sm:flex p-3 md:p-4 items-center justify-center md:justify-start space-x-2 rtl:space-x-reverse cursor-pointer" onClick={() => setIsWorkTravel(!isWorkTravel)}>
                    <input
                      type="checkbox"
                      checked={isWorkTravel}
                      onChange={(e) => setIsWorkTravel(e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                    />
                    <span className="text-gray-700 text-sm font-bold whitespace-nowrap">{t('mainSection.workTravel')}</span>
                 </div>

                 {/* Search Button */}
                 <div className="p-2 w-full md:w-auto">
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-[#F7871D] hover:bg-orange-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] flex items-center justify-center space-x-2 transition shadow-lg active:scale-95"
                    >
                       <MagnifyingGlassIcon className="w-5 h-5 md:w-6 md:h-6" />
                       <span className="text-lg md:text-xl font-medium">{t('mainSection.searchButton')}</span>
                    </button>
                 </div>
              </form>
           </div>

        </main>
      </div>
    </div>
  );
};
