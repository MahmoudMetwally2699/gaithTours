import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { HotelCard } from './HotelCard';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';

interface ExtendedHotel extends Hotel {
  hid?: string;
  price?: number;
  currency?: string;
  reviewCount?: number;
  reviewScoreWord?: string;
}

export const PopularProperties: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hotels, setHotels] = useState<ExtendedHotel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPopularHotels = async () => {
      try {
        setLoading(true);
        // Fetch popular hotels in Saudi Arabia (using Riyadh, Jeddah, or Makkah)
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
        const response = await fetch(`${API_URL}/api/hotels/suggested?location=Riyadh`);
        const data = await response.json();

        if (data.success && data.data.hotels) {
          // Filter hotels with prices and sort by rating (highest first)
          const popularHotels = data.data.hotels
            .filter((h: ExtendedHotel) => {
              const hasPrice = h.price && h.price > 0;
              const hasRating = h.rating && h.rating > 0;
              return hasPrice && hasRating;
            })
            .sort((a: ExtendedHotel, b: ExtendedHotel) => {
              // Primary sort: rating (highest first)
              const ratingDiff = (b.rating || 0) - (a.rating || 0);
              if (ratingDiff !== 0) return ratingDiff;

              // Secondary sort: price (lower first for same rating)
              return (a.price || 0) - (b.price || 0);
            })
            .slice(0, 15); // Limit to top 15 properties

          setHotels(popularHotels);
        }
      } catch (error) {
        console.error('Error fetching popular properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPopularHotels();
  }, []);

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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Popular properties in Saudi Arabia</h2>
        <div className="flex gap-6 overflow-x-auto pb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[300px] md:min-w-[340px] bg-white rounded-[2rem] overflow-hidden shadow-sm h-[450px] animate-pulse border border-gray-100 flex flex-col">
              <div className="bg-gray-100 h-64 w-full relative">
                <div className="absolute -bottom-6 right-6 h-14 w-14 bg-gray-200 rounded-xl border-4 border-white"></div>
              </div>
              <div className="pt-10 pb-6 px-6 flex flex-col flex-grow space-y-4">
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
                <div className="mt-auto pt-4 flex justify-end items-baseline border-t border-gray-50">
                  <div className="h-3 bg-gray-100 rounded w-8 mr-2"></div>
                  <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
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
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Popular properties in Saudi Arabia</h2>
        <p className="text-gray-500 text-center py-8">Loading popular properties...</p>
      </section>
    );
  }

  if (hotels.length === 0) {
    return null;
  }

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Popular properties in Saudi Arabia</h2>
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
        className="flex gap-6 overflow-x-auto pb-8 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hotels.map((hotel) => (
          <div key={hotel.id} className="min-w-[300px] md:min-w-[340px] snap-start h-[450px]">
            <HotelCard
              hotel={hotel}
              onBook={() => history.push(`/hotels/details/${hotel.hid || hotel.id}`)}
            />
          </div>
        ))}
      </div>
    </section>
  );
};
