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

export const PopularCities: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const scrollRef = useRef<HTMLDivElement>(null);
  // Static city data with curated images
  const [cities] = useState<City[]>([
    {
      id: 1,
      name: 'Jeddah',
      count: 245,
      image: '/hero/jeddah-corniche-red-sea-saudi-arabia-p63d.avif'
    },
    {
      id: 2,
      name: 'Riyadh',
      count: 312,
      image: 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 3,
      name: 'Al Khobar',
      count: 128,
      image: 'https://images.unsplash.com/photo-1580837119756-563d608dd119?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
      id: 4,
      name: 'Makkah',
      count: 487,
      image: 'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    }
  ]);
  const [loading] = useState(false);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Popular Cities in Saudi Arabia</h2>
        <div className="flex gap-6 overflow-x-auto pb-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="min-w-[280px] md:min-w-[300px] bg-white rounded-xl overflow-hidden shadow-sm h-[320px] animate-pulse border border-gray-100">
              <div className="h-[75%] bg-gray-100"></div>
              <div className="p-4 space-y-2">
                <div className="h-6 bg-gray-200 rounded w-2/3"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
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
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Popular Cities in Saudi Arabia</h2>
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
        className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cities.map((city) => (
          <div
            key={city.id}
            className="min-w-[280px] md:min-w-[300px] snap-start cursor-pointer group"
            onClick={() => history.push(`/hotels/search?destination=${city.name}`)}
          >
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-b-4 border-[#FCAE61] h-[320px] flex flex-col">
              <div className="h-[75%] overflow-hidden relative">
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1591604466107-ec97de577aff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
              <div className="p-4 flex-grow flex flex-col justify-center">
                <h3 className="text-xl font-bold text-gray-900 mb-1">{city.name}</h3>
                <p className="text-gray-500 text-sm">{city.count} hotels</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
