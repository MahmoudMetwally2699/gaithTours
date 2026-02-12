import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useUserLocation } from '../hooks/useUserLocation';
import { HotelCard } from './HotelCard';
import { useHistory } from 'react-router-dom';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';
import { getTripAdvisorRatings, TripAdvisorRating } from '../services/tripadvisorService';

// Extend the base Hotel interface to include properties specific to suggestions
interface ExtendedHotel extends Hotel {
  hid?: string;
  price?: number;
  pricePerNight?: number;
  nights?: number;
  currency?: string;
  total_taxes?: number;
  taxes_currency?: string;
  isSearchedHotel?: boolean;
}

interface SuggestionResponse {
  hotels: ExtendedHotel[];
  source: 'history' | 'location' | 'fallback';
  destination: string;
  searchDates?: {
    checkIn: string;
    checkOut: string;
  };
}

interface SuggestedHotelsProps {
  onLoaded?: () => void;
}

// Default city to show immediately (no waiting for geolocation)
const DEFAULT_CITY = 'Makkah';

export const SuggestedHotels: React.FC<SuggestedHotelsProps> = ({ onLoaded }) => {
  const { t, i18n } = useTranslation('home');
  const { isAuthenticated } = useAuth();
  const { currency } = useCurrency();
  const history = useHistory();
  const [hotels, setHotels] = useState<ExtendedHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');
  const [lastLocationQuery, setLastLocationQuery] = useState<string | undefined>(undefined);
  const [searchDates, setSearchDates] = useState<{ checkIn: string; checkOut: string } | null>(null);
  const [taRatings, setTaRatings] = useState<Record<string, TripAdvisorRating>>({});

  // Shared location detection — no more race conditions or duplicate API calls
  const { city: detectedCity, isDetecting } = useUserLocation(i18n.language);
  const hasFetchedWithCity = useRef(false);
  const hasNotifiedLoaded = useRef(false);

  const fetchSuggestions = useCallback(async (locationQuery?: string, options?: { skipCache?: boolean }) => {
    try {
      const cacheKey = `suggestedHotels:${locationQuery || 'default'}:${currency}:${i18n.language}`;

      // Stale-while-revalidate: serve cached data immediately
      if (!options?.skipCache) {
        try {
          const cached = sessionStorage.getItem(cacheKey);
          if (cached) {
            const cachedData = JSON.parse(cached);
            const age = Date.now() - (cachedData._ts || 0);
            // Use cache if less than 10 minutes old
            if (age < 10 * 60 * 1000) {
              console.log('⚡ SuggestedHotels: serving from sessionStorage cache');
              setHotels(cachedData.hotels);
              setSource(cachedData.source);
              setDestinationName(cachedData.destination);
              if (cachedData.searchDates) setSearchDates(cachedData.searchDates);
              setLoading(false);
              // Still re-fetch in background if cache > 5 min old
              if (age > 5 * 60 * 1000) {
                fetchSuggestions(locationQuery, { skipCache: true });
              }
              return cachedData;
            }
          }
        } catch { /* sessionStorage unavailable or parse error */ }
      }

      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      // Pass current language to get localized hotel names
      let url = `${API_URL}/hotels/suggested?currency=${currency}&language=${i18n.language}`;
      if (locationQuery) {
        url += `&location=${encodeURIComponent(locationQuery)}`;
        setLastLocationQuery(locationQuery);
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setHotels(data.data.hotels);
        setSource(data.data.source);
        setDestinationName(data.data.destination);
        // Store the searchDates from the API response
        if (data.data.searchDates) {
          setSearchDates(data.data.searchDates);
        }

        // Cache to sessionStorage for instant re-visits
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({
            ...data.data,
            _ts: Date.now()
          }));
        } catch { /* quota exceeded or unavailable */ }

        return data.data; // Return for chaining
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [currency, i18n.language]);

  // Fetch TripAdvisor ratings when hotels load
  useEffect(() => {
    if (hotels.length > 0 && destinationName) {
      const hotelNames = hotels.filter(h => h.price && h.price > 0).slice(0, 8).map(h => h.name);
      if (hotelNames.length > 0) {
        getTripAdvisorRatings(hotelNames, destinationName)
          .then(ratings => setTaRatings(ratings))
          .catch(err => console.error('TripAdvisor ratings error:', err));
      }
    }
  }, [hotels, destinationName]);

  // Notify parent when content has finished loading (first time only)
  useEffect(() => {
    if (!loading && !hasNotifiedLoaded.current && onLoaded) {
      hasNotifiedLoaded.current = true;
      // Small delay to ensure React has finished rendering
      requestAnimationFrame(() => {
        onLoaded();
      });
    }
  }, [loading, onLoaded]);

  // Initial fetch: load DEFAULT_CITY immediately, then upgrade to detected city
  useEffect(() => {
    hasFetchedWithCity.current = false;

    if (detectedCity) {
      // City already cached from a previous visit — use it immediately
      console.log(`📍 Using cached location: ${detectedCity}`);
      hasFetchedWithCity.current = true;
      fetchSuggestions(detectedCity);
    } else {
      // No city yet — show default city while detection runs
      console.log(`🚀 Loading ${DEFAULT_CITY} hotels while detecting location...`);
      fetchSuggestions(DEFAULT_CITY);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  // When location detection completes, re-fetch with the real city
  useEffect(() => {
    if (detectedCity && !hasFetchedWithCity.current) {
      console.log(`✅ Location detected: ${detectedCity} — refreshing hotels...`);
      hasFetchedWithCity.current = true;
      fetchSuggestions(detectedCity);
    }
  }, [detectedCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch with same location when currency or language changes
  useEffect(() => {
    if (!loading && (hotels.length > 0 || lastLocationQuery)) {
      fetchSuggestions(lastLocationQuery || DEFAULT_CITY);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, i18n.language]);

  // Handle "Use my location" button click
  const handleUseMyLocation = () => {
    localStorage.removeItem('locationDenied');
    sessionStorage.removeItem('userDetectedCity');
    setLoading(true);
    // Reload to re-trigger location detection
    window.location.reload();
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 px-1">{t('suggestedHotels.title')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-sm h-[280px] sm:h-[300px] md:h-[320px] animate-pulse border border-gray-100 flex flex-col">
              <div className="bg-gray-100 h-32 sm:h-36 md:h-40 w-full relative">
                 <div className="absolute -bottom-4 md:-bottom-5 right-3 md:right-4 h-9 w-9 md:h-11 md:w-11 bg-gray-200 rounded-xl border-3 md:border-4 border-white"></div>
              </div>

              <div className="pt-5 md:pt-6 pb-3 md:pb-4 px-3 md:px-4 flex flex-col flex-grow space-y-2 md:space-y-3">
                <div className="space-y-2 md:space-y-3">
                   <div className="flex justify-between items-start">
                      <div className="h-5 md:h-6 bg-gray-200 rounded-md w-3/4"></div>
                   </div>
                   <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="h-3 w-3 md:h-4 md:w-4 bg-gray-100 rounded-full"></div>
                      ))}
                   </div>
                </div>

                <div className="space-y-1.5 md:space-y-2 mt-1 md:mt-2">
                   <div className="h-2.5 md:h-3 bg-gray-100 rounded w-full"></div>
                   <div className="h-2.5 md:h-3 bg-gray-100 rounded w-2/3"></div>
                </div>

                <div className="mt-auto pt-2 md:pt-3 flex justify-end items-baseline border-t border-gray-50">
                   <div className="h-2.5 md:h-3 bg-gray-100 rounded w-6 md:w-8 mr-1"></div>
                   <div className="h-5 md:h-6 bg-gray-200 rounded-lg w-16 md:w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hotels.length === 0) return null;

  // Check if it's after 10 PM to show tomorrow indicator
  const now = new Date();
  const isAfter10PM = now.getHours() >= 22;

  return (
    <section className="py-8 md:py-12 lg:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-6 md:mb-8 lg:mb-12 px-2 md:px-0">
          {isAfter10PM && (
            <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F7871D] to-[#FCAE61] text-white rounded-full shadow-lg animate-pulse">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="font-semibold text-sm md:text-base">
                {t('suggestedHotels.tomorrowAvailability')}
              </span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 mb-3 md:mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 text-center">
              {source === 'history'
                ? t('suggestedHotels.historyTitle', { destination: destinationName })
                : source === 'location'
                ? t('suggestedHotels.locationTitle', { destination: destinationName })
                : t('suggestedHotels.fallbackTitle')
              }
            </h2>
            {source === 'fallback' && (
              <button
                onClick={handleUseMyLocation}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm whitespace-nowrap"
              >
                <svg className="w-3.5 h-3.5 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">{t('suggestedHotels.useMyLocation')}</span>
                <span className="sm:hidden">{t('suggestedHotels.location')}</span>
              </button>
            )}
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            {source === 'history'
              ? t('suggestedHotels.pickUpWhereLeft')
              : t('suggestedHotels.discoverTopRated')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {hotels
            .filter(h => h.price && h.price > 0)
            .slice(0, 8)
            .map((hotel) => {
              // Use the searchDates from API if available, otherwise fallback to today/tomorrow
              let checkIn: string, checkOut: string;
              if (searchDates) {
                checkIn = searchDates.checkIn;
                checkOut = searchDates.checkOut;
              } else {
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                checkIn = today.toISOString().split('T')[0];
                checkOut = tomorrow.toISOString().split('T')[0];
              }

              return (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  taRating={taRatings[hotel.name] || null}
                  onBook={() => history.push(`/hotels/details/${hotel.hid || hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`)}
                />
              );
            })}
        </div>
      </div>
    </section>
  );
};
