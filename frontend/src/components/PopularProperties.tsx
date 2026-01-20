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
      const scrollAmount = 350;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Popular 5-star hotels in Saudi Arabia</h2>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[240px] md:min-w-[280px] bg-white rounded-[1.5rem] overflow-hidden shadow-sm h-[320px] animate-pulse border border-gray-100 flex flex-col">
              <div className="bg-gray-100 h-40 w-full relative">
                <div className="absolute -bottom-5 right-4 h-11 w-11 bg-gray-200 rounded-xl border-4 border-white"></div>
              </div>
              <div className="pt-6 pb-4 px-4 flex flex-col flex-grow space-y-3">
                <div className="space-y-3">
                  <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, j) => (
                      <div key={j} className="h-4 w-4 bg-gray-100 rounded-full"></div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2 mt-2">
                  <div className="h-3 bg-gray-100 rounded w-full"></div>
                  <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>
                <div className="mt-auto pt-3 flex justify-end items-baseline border-t border-gray-50">
                  <div className="h-3 bg-gray-100 rounded w-8 mr-1"></div>
                  <div className="h-6 bg-gray-200 rounded-lg w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hotels.length === 0 && !loading) {
    // Show a message instead of hiding completely
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Popular 5-star hotels in Saudi Arabia</h2>
        <p className="text-gray-500 text-center py-8">Loading popular properties...</p>
      </section>
    );
  }

  if (hotels.length === 0) {
    return null;
  }

  // Generate dates matching what the backend uses (today, 1 night)
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const checkIn = today.toISOString().split('T')[0];
  const checkOut = tomorrow.toISOString().split('T')[0];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Popular 5-star hotels in Saudi Arabia</h2>
        <div className="flex gap-2">
           <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full border-2 border-[#FCAE61] text-[#FCAE61] hover:bg-[#FCAE61] hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="h-6 w-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full border-2 border-[#FCAE61] text-[#FCAE61] hover:bg-[#FCAE61] hover:text-white transition-colors"
          >
            <ChevronRightIcon className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hotels.map((hotel) => (
          <div key={hotel.id} className="min-w-[240px] md:min-w-[280px] snap-start">
            <HotelCard
              hotel={hotel}
              onBook={() => history.push(`/hotels/details/${hotel.hid || hotel.id}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
