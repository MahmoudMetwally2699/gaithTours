import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { HotelCard } from './HotelCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';
import { TripAdvisorRating, getTripAdvisorRatings } from '../services/tripadvisorService';

interface ExtendedHotel extends Hotel {
  hid?: string;
  price?: number;
  pricePerNight?: number;
  nights?: number;
  currency?: string;
  reviewCount?: number;
  reviewScoreWord?: string;
  star_rating?: number; // Actual hotel star rating (1-5)
  tripadvisor_rating?: number;
  tripadvisor_num_reviews?: string;
  tripadvisor_location_id?: string;
}

export const PopularProperties: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const history = useHistory();
  const { currency } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hotels, setHotels] = useState<ExtendedHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [taRatings, setTaRatings] = useState<Record<string, TripAdvisorRating>>({});

  useEffect(() => {
    const abortController = new AbortController();

    const fetchPopularHotels = async () => {
      const cacheKey = `popularProperties:${currency}:${i18n.language}`;

      // Stale-while-revalidate: serve cached data immediately
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          const age = Date.now() - (cachedData._ts || 0);
          // Use cache if less than 10 minutes old
          if (age < 10 * 60 * 1000) {
            console.log('⚡ PopularProperties: serving from sessionStorage cache');
            setHotels(cachedData.hotels);
            buildTaRatingsFromBackend(cachedData.hotels);
            setLoading(false);
            // Background refetch if cache > 5 min old
            if (age <= 5 * 60 * 1000) return;
          }
        }
      } catch { /* sessionStorage unavailable or parse error */ }

      try {
        setLoading(prev => prev); // Keep current loading state (may be false from cache)
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

        const response = await fetch(
          `${API_URL}/hotels/popular-properties?currency=${currency}&language=${i18n.language}`,
          { signal: abortController.signal }
        );
        const data = await response.json();

        if (data.success && data.data.hotels) {
          console.log(`✅ Popular properties: ${data.data.hotels.length} 5-star hotels`);
          setHotels(data.data.hotels);
          buildTaRatingsFromBackend(data.data.hotels);

          // Cache to sessionStorage
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              hotels: data.data.hotels,
              _ts: Date.now()
            }));
          } catch { /* quota exceeded */ }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching popular 5-star properties:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    // Build TripAdvisor ratings map from backend-enriched data (no extra API calls!)
    const buildTaRatingsFromBackend = (hotelList: ExtendedHotel[]) => {
      const ratings: Record<string, TripAdvisorRating> = {};
      hotelList.forEach(h => {
        if (h.tripadvisor_rating && h.name) {
          ratings[h.name] = {
            location_id: h.tripadvisor_location_id || '',
            name: h.name,
            rating: h.tripadvisor_rating,
            num_reviews: h.tripadvisor_num_reviews || '0',
            ranking: null,
            price_level: null,
            web_url: null,
            rating_image_url: null,
            reviews: [],
            from_cache: true,
          };
        }
      });
      if (Object.keys(ratings).length > 0) {
        setTaRatings(ratings);
      }
    };

    fetchPopularHotels();

    return () => abortController.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, i18n.language]);

  // Fallback: fetch TripAdvisor ratings for hotels not enriched by backend
  useEffect(() => {
    if (hotels.length > 0) {
      // Find hotels without TA data
      const unenriched = hotels.filter(h => !taRatings[h.name]);
      if (unenriched.length === 0) return;

      // Group by city for efficient fetching
      const hotelsByCity: Record<string, string[]> = {};
      unenriched.forEach(h => {
        const hotelCity = h.address?.split(',').pop()?.trim() || h.city || 'Saudi Arabia';
        if (!hotelsByCity[hotelCity]) hotelsByCity[hotelCity] = [];
        hotelsByCity[hotelCity].push(h.name);
      });

      Object.entries(hotelsByCity).forEach(([city, names]) => {
        getTripAdvisorRatings(names, city)
          .then(ratings => {
            if (Object.keys(ratings).length > 0) {
              setTaRatings(prev => ({ ...prev, ...ratings }));
            }
          })
          .catch(err => console.error('TripAdvisor fallback error:', err));
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hotels]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 px-1">{t('popularProperties.title')}</h2>
        <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] bg-white rounded-2xl md:rounded-[1.5rem] overflow-hidden shadow-sm h-[280px] sm:h-[300px] md:h-[320px] animate-pulse border border-gray-100 flex flex-col flex-shrink-0">
              <div className="bg-gray-100 h-32 sm:h-36 md:h-40 w-full relative">
                <div className="absolute -bottom-4 md:-bottom-5 right-3 md:right-4 h-9 w-9 md:h-11 md:w-11 bg-gray-200 rounded-xl border-3 md:border-4 border-white"></div>
              </div>
              <div className="pt-5 md:pt-6 pb-3 md:pb-4 px-3 md:px-4 flex flex-col flex-grow space-y-2 md:space-y-3">
                <div className="space-y-2 md:space-y-3">
                  <div className="h-5 md:h-6 bg-gray-200 rounded-md w-3/4"></div>
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

  if (hotels.length === 0 && !loading) {
    return (
      <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8 px-1">{t('popularProperties.title')}</h2>
        <p className="text-gray-500 text-center py-8">{t('popularProperties.loadingProperties')}</p>
      </section>
    );
  }

  if (hotels.length === 0) {
    return null;
  }

  // Apply the same 10 PM rule as the backend
  const now = new Date();
  const currentHour = now.getHours();
  const daysOffset = currentHour >= 22 ? 1 : 0; // After 10 PM, use tomorrow

  const checkInDate = new Date();
  checkInDate.setDate(checkInDate.getDate() + daysOffset);
  const checkOutDate = new Date(checkInDate);
  checkOutDate.setDate(checkOutDate.getDate() + 1);

  const checkIn = checkInDate.toISOString().split('T')[0];
  const checkOut = checkOutDate.toISOString().split('T')[0];
  const isAfter10PM = daysOffset === 1;

  return (
    <section className="w-full max-w-7xl mx-auto py-6 md:py-8">
      <div className="px-3 sm:px-4 md:px-6 lg:px-8">
        {isAfter10PM && (
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#F7871D] to-[#FCAE61] text-white rounded-full shadow-lg">
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <span className="font-semibold text-sm md:text-base">{t('popularProperties.checkingTomorrow')}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mb-4 md:mb-6 px-3 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{t('popularProperties.title')}</h2>
        <div className="hidden sm:flex gap-2">
           <button
            onClick={() => scroll('left')}
            className="p-1.5 md:p-2 rounded-full border-2 border-[#FCAE61] text-[#FCAE61] hover:bg-[#FCAE61] hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 md:p-2 rounded-full border-2 border-[#FCAE61] text-[#FCAE61] hover:bg-[#FCAE61] hover:text-white transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto pb-4 px-3 sm:px-4 md:px-6 lg:px-8 scrollbar-hide scroll-smooth overscroll-x-contain snap-x snap-proximity md:snap-mandatory w-full max-w-full"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              className="w-[78%] max-w-[280px] sm:w-auto min-w-[180px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] flex-shrink-0 snap-start"
            >
              <HotelCard
                hotel={hotel}
                taRating={taRatings[hotel.name] || null}
                onBook={() => history.push(`/hotels/details/${hotel.hid || hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`)}
              />
            </div>
          ))}
          <div className="w-[22%] sm:w-4 md:w-6 lg:w-8 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};
