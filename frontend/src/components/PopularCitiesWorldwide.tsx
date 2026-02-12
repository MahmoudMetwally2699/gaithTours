import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useHistory } from 'react-router-dom';

interface City {
  id: number;
  name: string;
  count: number;
  image: string;
}

export const PopularCitiesWorldwide: React.FC = () => {
  const { t } = useTranslation('home');
  const history = useHistory();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Static city data with curated images
  const cities: City[] = [
    {
      id: 1,
      name: t('popularCitiesWorldwide.cities.dubai'),
      count: 523,
      image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 2,
      name: t('popularCitiesWorldwide.cities.paris'),
      count: 1247,
      image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      name: t('popularCitiesWorldwide.cities.london'),
      count: 1089,
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 4,
      name: t('popularCitiesWorldwide.cities.newYork'),
      count: 876,
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 5,
      name: t('popularCitiesWorldwide.cities.tokyo'),
      count: 654,
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 6,
      name: t('popularCitiesWorldwide.cities.istanbul'),
      count: 432,
      image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    }
  ];

  const [loading] = useState(false);

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
      <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8 lg:py-12">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 lg:mb-8 px-1">{t('popularCitiesWorldwide.title')}</h2>
        <div className="flex gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm h-[240px] sm:h-[280px] md:h-[300px] lg:h-[320px] animate-pulse border border-gray-100 flex-shrink-0">
              <div className="h-[70%] sm:h-[75%] bg-gray-100"></div>
              <div className="p-3 md:p-4 space-y-2">
                <div className="h-5 md:h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 md:h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (cities.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto py-6 md:py-8 lg:py-12">
      <div className="flex items-center justify-between mb-4 md:mb-6 lg:mb-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">{t('popularCitiesWorldwide.title')}</h2>
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
          className="flex gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-4 px-3 sm:px-4 md:px-6 lg:px-8 scrollbar-hide scroll-smooth overscroll-x-contain snap-x snap-proximity md:snap-mandatory w-full max-w-full"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {cities.map((city) => (
            <div
              key={city.id}
              className="w-[78%] max-w-[280px] sm:w-auto min-w-[180px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] cursor-pointer group flex-shrink-0 snap-start"
              onClick={() => {
                const today = new Date();
                const checkIn = new Date(today);
                checkIn.setDate(today.getDate() + 1);
                const checkOut = new Date(today);
                checkOut.setDate(today.getDate() + 2);
                const params = new URLSearchParams({
                  destination: city.name,
                  checkIn: checkIn.toISOString().split('T')[0],
                  checkOut: checkOut.toISOString().split('T')[0],
                  rooms: '1',
                  adults: '2',
                  children: '0'
                });
                history.push(`/hotels/search?${params.toString()}`);
              }}
            >
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-b-4 border-[#FCAE61] h-[240px] sm:h-[280px] md:h-[300px] lg:h-[320px] flex flex-col">
              <div className="h-[70%] sm:h-[75%] overflow-hidden relative">
                <img
                  src={city.image}
                  alt={city.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
              <div className="p-3 md:p-4 flex-grow flex flex-col justify-center">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{city.name}</h3>
                <p className="text-gray-500 text-xs sm:text-sm">{city.count} {t('popularCitiesWorldwide.hotels')}</p>
              </div>
            </div>
          </div>
        ))}
        <div className="w-[22%] sm:w-4 md:w-6 lg:w-8 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};
