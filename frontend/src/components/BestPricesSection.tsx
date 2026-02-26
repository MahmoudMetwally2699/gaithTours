import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface BestPriceDeal {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl: string;
  hotels: Array<{ hotelId: string; hotelName: string }>;
  isActive: boolean;
}

export const BestPricesSection: React.FC = () => {
  const { t, i18n } = useTranslation(['home', 'common']);
  const history = useHistory();
  const isRTL = i18n.language === 'ar';
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deals, setDeals] = useState<BestPriceDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/best-prices`);
        const data = await response.json();
        if (data.success && data.data?.deals) {
          setDeals(data.data.deals);
        }
      } catch (error) {
        console.error('Error fetching best price deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeals();
  }, []);

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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-4 md:mb-6 px-1">
          {t('home:bestPrices.title', 'Best Prices')}
        </h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse border border-gray-100 flex-shrink-0">
              <div className="bg-gray-200 h-44 sm:h-48 md:h-52 w-full" />
              <div className="p-4 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (deals.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto py-6 md:py-8">
      <div className="flex items-center justify-between mb-4 md:mb-6 px-3 sm:px-4 md:px-6 lg:px-8">
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800">
            {t('home:bestPrices.title', 'Best Prices')}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('home:bestPrices.subtitle', 'Handpicked deals with the best rates')}
          </p>
        </div>
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
          className="flex gap-4 md:gap-5 overflow-x-auto pb-4 px-3 sm:px-4 md:px-6 lg:px-8 scrollbar-hide scroll-smooth overscroll-x-contain snap-x snap-proximity"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {deals.map((deal) => (
            <div
              key={deal._id}
              onClick={() => history.push(`/best-prices/${deal._id}`)}
              className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] flex-shrink-0 snap-start cursor-pointer group"
            >
              <div className="bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-lg border border-gray-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                {/* Image */}
                <div className="relative h-44 sm:h-48 md:h-52 w-full overflow-hidden">
                  <img
                    src={deal.imageUrl}
                    alt={isRTL && deal.titleAr ? deal.titleAr : deal.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Title on image */}
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3
                      className="text-white font-bold text-lg md:text-xl drop-shadow-lg"
                      style={{ direction: isRTL && deal.titleAr ? 'rtl' : 'ltr' }}
                    >
                      {isRTL && deal.titleAr ? deal.titleAr : deal.title}
                    </h3>
                    {((isRTL && deal.descriptionAr) || (!isRTL && deal.description)) && (
                      <p className="text-white/80 text-sm mt-1 line-clamp-1 drop-shadow">
                        {isRTL && deal.descriptionAr ? deal.descriptionAr : deal.description}
                      </p>
                    )}
                  </div>
                  {/* Hotels count badge */}
                  <div className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} bg-[#FF8C00] text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg`}>
                    {deal.hotels.length} {deal.hotels.length === 1
                      ? t('common:nav.hotels', 'Hotel')
                      : t('common:nav.hotels', 'Hotels')}
                  </div>
                </div>
                {/* CTA */}
                <div className="p-3 flex items-center justify-between">
                  <span className="text-[#FF8C00] font-semibold text-sm group-hover:underline">
                    {t('home:bestPrices.viewDeals', 'View Deals')}
                  </span>
                  <svg className={`w-4 h-4 text-[#FF8C00] transition-transform group-hover:translate-x-0.5 ${isRTL ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
          <div className="w-4 md:w-6 lg:w-8 flex-shrink-0" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
};
