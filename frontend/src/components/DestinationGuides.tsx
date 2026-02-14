import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';

interface CityGuide {
  name: string;
  nameKey: string;
  englishName: string;
  image: string;
  bestTimeKey: string;
  highlightKey: string;
  tempRange: string;
  hotelCount: number;
}

export const DestinationGuides: React.FC = () => {
  const { t } = useTranslation('home');
  const history = useHistory();
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});

  // Fetch real hotel counts from CityStats
  useEffect(() => {
    const fetchCounts = async () => {
      const cacheKey = 'destinationGuideCounts';
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - (data._ts || 0) < 60 * 60 * 1000) {
            setCityCounts(data.counts);
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const cities = ['Makkah', 'Madinah', 'Riyadh', 'Jeddah', 'Al Ula', 'Abha'];
        const counts: Record<string, number> = {};

        // Use the hotels search count endpoint or CityStats
        await Promise.all(cities.map(async (city) => {
          try {
            const resp = await fetch(`${API_URL}/hotels/city-count?city=${encodeURIComponent(city)}`);
            const data = await resp.json();
            if (data.success) {
              counts[city.toLowerCase()] = data.data.count || 0;
            }
          } catch { /* fallback */ }
        }));

        setCityCounts(counts);
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ counts, _ts: Date.now() }));
        } catch { /* quota */ }
      } catch (err) {
        console.error('Failed to fetch city counts:', err);
      }
    };

    fetchCounts();
  }, []);

  const cities: CityGuide[] = [
    {
      name: t('destinationGuides.cities.makkah.name', 'Makkah'),
      nameKey: 'makkah',
      englishName: 'Makkah',
      image: '/مدن السعودية/مكة المكرمة.jpg',
      bestTimeKey: 'destinationGuides.cities.makkah.bestTime',
      highlightKey: 'destinationGuides.cities.makkah.highlight',
      tempRange: '24-42°C',
      hotelCount: cityCounts['makkah'] || 487,
    },
    {
      name: t('destinationGuides.cities.madinah.name', 'Madinah'),
      nameKey: 'madinah',
      englishName: 'Madinah',
      image: '/مدن السعودية/المدينة المنورة.png',
      bestTimeKey: 'destinationGuides.cities.madinah.bestTime',
      highlightKey: 'destinationGuides.cities.madinah.highlight',
      tempRange: '18-40°C',
      hotelCount: cityCounts['madinah'] || 356,
    },
    {
      name: t('destinationGuides.cities.riyadh.name', 'Riyadh'),
      nameKey: 'riyadh',
      englishName: 'Riyadh',
      image: '/مدن السعودية/الرياض.jpg',
      bestTimeKey: 'destinationGuides.cities.riyadh.bestTime',
      highlightKey: 'destinationGuides.cities.riyadh.highlight',
      tempRange: '15-45°C',
      hotelCount: cityCounts['riyadh'] || 312,
    },
    {
      name: t('destinationGuides.cities.jeddah.name', 'Jeddah'),
      nameKey: 'jeddah',
      englishName: 'Jeddah',
      image: '/مدن السعودية/جدة.jpg',
      bestTimeKey: 'destinationGuides.cities.jeddah.bestTime',
      highlightKey: 'destinationGuides.cities.jeddah.highlight',
      tempRange: '24-38°C',
      hotelCount: cityCounts['jeddah'] || 245,
    },
    {
      name: t('destinationGuides.cities.alula.name', 'Al Ula'),
      nameKey: 'alula',
      englishName: 'Al Ula',
      image: '/مدن السعودية/مدينة العلا.jpg',
      bestTimeKey: 'destinationGuides.cities.alula.bestTime',
      highlightKey: 'destinationGuides.cities.alula.highlight',
      tempRange: '12-38°C',
      hotelCount: cityCounts['al ula'] || 67,
    },
    {
      name: t('destinationGuides.cities.abha.name', 'Abha'),
      nameKey: 'abha',
      englishName: 'Abha',
      image: '/مدن السعودية/أبها.jpg',
      bestTimeKey: 'destinationGuides.cities.abha.bestTime',
      highlightKey: 'destinationGuides.cities.abha.highlight',
      tempRange: '10-30°C',
      hotelCount: cityCounts['abha'] || 98,
    },
  ];

  const handleCityClick = (englishName: string) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];
    history.push(`/hotels/search?destination=${encodeURIComponent(englishName)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
  };

  return (
    <section className="w-full max-w-7xl mx-auto py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
          {t('destinationGuides.title', 'Destination Guides')}
        </h2>
        <p className="text-gray-500 text-sm md:text-base mt-2">
          {t('destinationGuides.subtitle', 'Explore top destinations in Saudi Arabia')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {cities.map((city) => (
          <div
            key={city.nameKey}
            onClick={() => handleCityClick(city.englishName)}
            className="group relative rounded-2xl overflow-hidden cursor-pointer h-[220px] md:h-[260px] shadow-md hover:shadow-xl transition-all duration-300"
          >
            {/* Background Image */}
            <img
              src={city.image}
              alt={city.name}
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />

            {/* Dark Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Top Badge */}
            <div className="absolute top-3 right-3 md:top-4 md:right-4">
              <span className="bg-white/90 backdrop-blur-sm text-[#F7871D] font-semibold text-xs px-3 py-1 rounded-full">
                {city.hotelCount}+ {t('destinationGuides.hotels', 'hotels')}
              </span>
            </div>

            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
              <h3 className="text-white font-bold text-lg md:text-xl mb-1">
                {city.name}
              </h3>

              {/* Info Row */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1 text-white/80 text-xs md:text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                  <span>{city.tempRange}</span>
                </div>
                <div className="flex items-center gap-1 text-white/80 text-xs md:text-sm">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  <span>{t(city.bestTimeKey, 'Year-round')}</span>
                </div>
              </div>

              {/* Highlight */}
              <p className="text-white/70 text-xs md:text-sm line-clamp-1">
                {t(city.highlightKey, '')}
              </p>

              {/* Explore Button - appears on hover */}
              <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="inline-flex items-center gap-1 text-[#FCAE61] font-semibold text-sm">
                  {t('destinationGuides.explore', 'Explore Hotels')}
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
