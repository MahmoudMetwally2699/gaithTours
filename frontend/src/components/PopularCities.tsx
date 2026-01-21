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
      image: '/مدن السعودية/جدة.jpg'
    },
    {
      id: 2,
      name: 'Riyadh',
      count: 312,
      image: '/مدن السعودية/الرياض.jpg'
    },
    {
      id: 3,
      name: 'Al Khobar',
      count: 128,
      image: '/مدن السعودية/الخبر.jpg'
    },
    {
      id: 4,
      name: 'Makkah',
      count: 487,
      image: '/مدن السعودية/مكة المكرمة.jpg'
    },
    {
      id: 5,
      name: 'Madinah',
      count: 356,
      image: '/مدن السعودية/المدينة المنورة.png'
    },
    {
      id: 6,
      name: 'Dammam',
      count: 189,
      image: '/مدن السعودية/مدينة الدمام.jpg'
    },
    {
      id: 7,
      name: 'Taif',
      count: 142,
      image: '/مدن السعودية/الطائف.jpg'
    },
    {
      id: 8,
      name: 'AlUla',
      count: 67,
      image: '/مدن السعودية/مدينة العلا.jpg'
    },
    {
      id: 9,
      name: 'Abha',
      count: 98,
      image: '/مدن السعودية/أبها.jpg'
    },
    {
      id: 10,
      name: 'Tabuk',
      count: 76,
      image: '/مدن السعودية/مدينة تبوك.jpeg'
    },
    {
      id: 11,
      name: 'Hail',
      count: 54,
      image: '/مدن السعودية/حائل.jpg'
    },
    {
      id: 12,
      name: 'Jazan',
      count: 63,
      image: '/مدن السعودية/جازان.jpg'
    },
    {
      id: 13,
      name: 'Jubail',
      count: 82,
      image: '/مدن السعودية/مدينة الجبيل.jpg'
    },
    {
      id: 14,
      name: 'Buraydah',
      count: 71,
      image: '/مدن السعودية/مدينة بريدة.jpeg'
    },
    {
      id: 15,
      name: 'Khamis Mushait',
      count: 59,
      image: '/مدن السعودية/مدينة خميس مشيط.jpg'
    },
    {
      id: 16,
      name: 'Najran',
      count: 45,
      image: '/مدن السعودية/نجران.jpg'
    },
    {
      id: 17,
      name: 'Yanbu',
      count: 88,
      image: '/مدن السعودية/ينبع.jpg'
    }
  ]);
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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 lg:mb-8 px-1">Popular Cities in Saudi Arabia</h2>
        <div className="flex gap-3 md:gap-4 lg:gap-6 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(4)].map((_, i) => (
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
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">Popular Cities in Saudi Arabia</h2>
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
              onClick={() => history.push(`/hotels/search?destination=${city.name}`)}
            >
            <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border-b-4 border-[#FCAE61] h-[240px] sm:h-[280px] md:h-[300px] lg:h-[320px] flex flex-col">
              <div className="h-[70%] sm:h-[75%] overflow-hidden relative">
                <img
                  src={city.image}
                  alt={city.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                  }}
                />
              </div>
              <div className="p-3 md:p-4 flex-grow flex flex-col justify-center">
                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{city.name}</h3>
                <p className="text-gray-500 text-xs sm:text-sm">{city.count} hotels</p>
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
