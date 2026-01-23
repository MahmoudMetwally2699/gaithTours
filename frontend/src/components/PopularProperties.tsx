import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { HotelCard } from './HotelCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';
import { useCurrency } from '../contexts/CurrencyContext';

interface ExtendedHotel extends Hotel {
  hid?: string;
  price?: number;
  pricePerNight?: number;
  nights?: number;
  currency?: string;
  reviewCount?: number;
  reviewScoreWord?: string;
  star_rating?: number; // Actual hotel star rating (1-5)
}

export const PopularProperties: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const { currency } = useCurrency();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hotels, setHotels] = useState<ExtendedHotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularHotels = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

        // Fetch from multiple major Saudi cities to get more 5-star hotels
        // Using Promise.all for PARALLEL fetching (3x faster than sequential)
        const cities = ['Riyadh', 'Jeddah', 'Makkah'];

        const cityPromises = cities.map(async (city) => {
          try {
            const response = await fetch(`${API_URL}/hotels/suggested?location=${city}&currency=${currency}`);
            const data = await response.json();
            return data.success && data.data.hotels ? data.data.hotels : [];
          } catch (error) {
            console.error(`Error fetching hotels from ${city}:`, error);
            return [];
          }
        });

        const cityResults = await Promise.all(cityPromises);
        const allHotels: ExtendedHotel[] = cityResults.flat();

        // Debug: Log all hotels before filtering
        console.log(`📊 Total hotels fetched: ${allHotels.length}`);
        console.log('Hotel data:', allHotels.map(h => ({
          name: h.name,
          star_rating: h.star_rating,
          rating: h.rating,
          price: h.price
        })));

        // Filter for 5-star hotels using star_rating field (1-5 scale)
        const popularHotels = allHotels
          .filter((h: ExtendedHotel) => {
            const hasPrice = h.price && h.price > 0;
            const isFiveStar = h.star_rating && h.star_rating >= 5; // Only 5-star hotels
            return hasPrice && isFiveStar;
          })
          .sort((a: ExtendedHotel, b: ExtendedHotel) => {
            // Primary sort: star_rating (highest first)
            const ratingDiff = (b.star_rating || 0) - (a.star_rating || 0);
            if (ratingDiff !== 0) return ratingDiff;

            // Secondary sort: price (lower first for same rating)
            return (a.price || 0) - (b.price || 0);
          })
          .slice(0, 15); // Limit to top 15 properties

        console.log(`✅ Filtered to ${popularHotels.length} 5-star hotels`);
        console.log('Filtered hotels:', popularHotels.map(h => ({
          name: h.name,
          star_rating: h.star_rating,
          price: h.price
        })));

        setHotels(popularHotels);
      } catch (error) {
        console.error('Error fetching popular 5-star properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularHotels();
  }, [currency]); // Re-fetch when currency changes

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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 px-1">Popular 5-star hotels in Saudi Arabia</h2>
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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6 md:mb-8 px-1">Popular 5-star hotels in Saudi Arabia</h2>
        <p className="text-gray-500 text-center py-8">Loading popular properties...</p>
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
            <span className="font-semibold text-sm md:text-base">Checking hotels for tomorrow</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mb-4 md:mb-6 px-3 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Popular 5-star hotels in Saudi Arabia</h2>
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
