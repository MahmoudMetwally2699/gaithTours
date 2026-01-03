import React, { useState, useRef, useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useDirection } from '../hooks/useDirection';
import { motion } from 'framer-motion';
import {
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  ChevronDownIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { HomeIcon } from '@heroicons/react/24/solid';
import { DateRangePicker } from './DateRangePicker';
import dayjs from 'dayjs';

export const MainSection: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { isRTL } = useDirection();
  const history = useHistory();

  // Search State
  const [destination, setDestination] = useState('');
  const [checkInDate, setCheckInDate] = useState<Date | null>(null);
  const [checkOutDate, setCheckOutDate] = useState<Date | null>(null);
  const [guests, setGuests] = useState({ rooms: 1, adults: 2, children: 0 });
  const [isWorkTravel, setIsWorkTravel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Refs
  const datePickerRef = useRef<HTMLDivElement>(null);

  const handleDateChange = (startDate: Date, endDate: Date) => {
    setCheckInDate(startDate);
    setCheckOutDate(endDate);
  };

  const formatDateDisplay = () => {
    if (checkInDate && checkOutDate) {
      return `${dayjs(checkInDate).format('MMM DD')} - ${dayjs(checkOutDate).format('MMM DD')}`;
    }
    return 'Select date - Select date';
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
        await fetch('http://localhost:5001/api/users/history', {
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

    const queryParams = new URLSearchParams({
      destination,
      checkIn: checkInDate ? dayjs(checkInDate).format('YYYY-MM-DD') : '',
      checkOut: checkOutDate ? dayjs(checkOutDate).format('YYYY-MM-DD') : '',
      rooms: guests.rooms.toString(),
      adults: guests.adults.toString(),
      children: guests.children.toString()
    });
    history.push(`/hotels/search?${queryParams.toString()}`);
  };

  return (
    <div className="relative h-[600px] w-full overflow-visible font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 h-[600px] overflow-hidden rounded-b-[3rem]">
        <img
          src="/new-design/header-photo-background.svg"
          alt="Background"
          className="w-full h-full object-cover object-center"
        />
        {/* Overlay for better text readability if needed, though design seems clear */}
        {/* <div className="absolute inset-0 bg-black/10"></div> */}
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col h-full px-4 sm:px-8 lg:px-16 py-6">

        {/* Custom Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center w-full mb-12 sm:mb-20 space-y-4 sm:space-y-0">

          {/* Left: Auth Buttons */}
          <div className="flex items-center space-x-4 rtl:space-x-reverse order-2 sm:order-1 w-full sm:w-auto justify-center sm:justify-start">
            {!user ? (
              <>
                <Link to="/login" className="text-white font-medium hover:text-orange-200 transition text-lg shadow-sm">
                  {t('nav.login', 'Sign in')}
                </Link>
                <Link
                  to="/register"
                  className="bg-[#F7871D] hover:bg-orange-600 text-white px-6 py-2 rounded-lg font-medium transition shadow-md"
                >
                  {t('nav.register', 'Register')}
                </Link>
              </>
            ) : (
               <div className="flex items-center space-x-4 rtl:space-x-reverse text-white">
                  <span className="font-medium">{user.name}</span>
                  <button onClick={logout} className="text-sm opacity-80 hover:opacity-100">
                    {t('nav.logout', 'Logout')}
                  </button>
               </div>
            )}
          </div>

          {/* Center/Right: Info & Logo */}
          <div className="flex items-center space-x-6 lg:space-x-8 rtl:space-x-reverse order-1 sm:order-2 w-full sm:w-auto justify-between sm:justify-end">

            {/* Contact & Settings (Hidden on small mobile for space if needed, or stacked) */}
            <div className="hidden md:flex items-center space-x-6 rtl:space-x-reverse text-white text-sm font-medium">
              <div className="flex items-center space-x-2 rtl:space-x-reverse cursor-pointer hover:text-orange-200">
                <PhoneIcon className="w-4 h-4" />
                <span>+966549412412</span>
              </div>

              <div className="flex items-center space-x-1 cursor-pointer hover:text-orange-200">
                <span>US</span>
                <ChevronDownIcon className="w-3 h-3" />
              </div>

              <button
                onClick={toggleLanguage}
                className="flex items-center space-x-1 hover:text-orange-200 bg-white/20 px-2 py-1 rounded-full backdrop-blur-sm"
              >
                 <GlobeAltIcon className="w-4 h-4" />
                 <span className="uppercase">{i18n.language}</span>
                 <ChevronDownIcon className="w-3 h-3" />
              </button>
            </div>

            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
               <img src="/new-design/logo.svg" alt="Gaith Tours" className="h-16 sm:h-20 w-auto drop-shadow-lg" />
            </Link>
          </div>
        </header>

        {/* Hero Content */}
        <main className="flex-grow flex flex-col justify-center max-w-7xl mx-auto w-full">

           {/* Heading */}
           <motion.div
             initial={{ opacity: 0, y: 30 }}
             animate={{ opacity: 1, y: 0 }}
             className="mb-12 text-center sm:text-left rtl:text-right"
           >
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light text-white leading-tight drop-shadow-md">
                Wherever you are...<br />
                <span className="font-medium">enjoy the best prices</span>
              </h1>
           </motion.div>

           {/* Tabs */}
           <div className="flex space-x-4 rtl:space-x-reverse mb-6 justify-center sm:justify-start rtl:justify-start">
             <button className="flex items-center space-x-2 rtl:space-x-reverse text-white/70 hover:text-white transition px-4 py-2">
                <svg className="w-6 h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-lg font-medium">Flights</span>
             </button>

             <button className="flex items-center space-x-2 rtl:space-x-reverse text-white border-b-2 border-[#F7871D] px-4 py-2">
                <HomeIcon className="w-6 h-6" />
                <span className="text-lg font-medium">Stays</span>
             </button>
           </div>

           {/* Search Bar - Pill Shape */}
           <motion.div
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="w-full bg-white rounded-[2rem] p-2 shadow-2xl border-4 border-white/50 backdrop-blur-sm"
           >
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x rtl:divide-x-reverse divide-gray-200">

                 {/* Destination */}
                 <div className="flex-1 w-full p-4 flex items-center space-x-3 rtl:space-x-reverse">
                    <MapPinIcon className="w-6 h-6 text-gray-400" />
                    <input
                      type="text"
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      placeholder="where to ?"
                      className="w-full bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 focus:ring-0 text-lg"
                      required
                    />
                 </div>

                 {/* Dates */}
                 <div className="flex-1 w-full p-4 flex items-center space-x-3 rtl:space-x-reverse relative" ref={datePickerRef}>
                    <CalendarIcon className="w-6 h-6 text-gray-700" />
                    <div
                      className="flex flex-col w-full cursor-pointer"
                      onClick={() => setShowDatePicker(!showDatePicker)}
                    >
                       <span className="text-sm font-bold text-gray-800">{formatDateDisplay()}</span>
                       <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>Check-in - Check-out</span>
                       </div>
                    </div>
                    {/* Nights tag */}
                    {calculateNights() > 0 && (
                      <div className="hidden lg:block bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">
                         {calculateNights()} nights
                      </div>
                    )}

                    {/* Date Range Picker Popup */}
                    {showDatePicker && (
                      <div className="absolute top-full left-0 mt-2 z-50 shadow-2xl rounded-xl">
                        <DateRangePicker
                          startDate={checkInDate}
                          endDate={checkOutDate}
                          onChange={handleDateChange}
                          minDate={new Date()}
                        />
                      </div>
                    )}
                 </div>

                 {/* Guests */}
                 <div className="flex-1 w-full p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                       {/* <UserIcon className="w-6 h-6 text-gray-400" /> */}
                       <span className="text-gray-700 text-lg">
                          {guests.rooms} room, {guests.adults} adults, {guests.children} children
                       </span>
                    </div>
                    {/* Placeholder for droplet/dropdown arrow */}
                 </div>

                 {/* Search Button */}
                 <div className="p-2 w-full md:w-auto">
                    <button
                      type="submit"
                      className="w-full md:w-auto bg-[#F7871D] hover:bg-orange-600 text-white px-8 py-4 rounded-[1.5rem] flex items-center justify-center space-x-2 transition shadow-lg"
                    >
                       <MagnifyingGlassIcon className="w-6 h-6" />
                       <span className="text-xl font-medium">Search</span>
                    </button>
                 </div>
              </form>
           </motion.div>

           {/* Work Travel Checkbox */}
           <div className="mt-4 flex items-center space-x-2 rtl:space-x-reverse ml-4 sm:ml-8">
              <input
                type="checkbox"
                id="workTravel"
                checked={isWorkTravel}
                onChange={(e) => setIsWorkTravel(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
              />
              <label htmlFor="workTravel" className="text-white text-sm opacity-90 cursor-pointer">
                I'm travelling for work
              </label>
           </div>

        </main>
      </div>
    </div>
  );
};
