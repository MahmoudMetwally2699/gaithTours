import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PromotionalBanner {
  _id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string;
}

export const ForNewUsers: React.FC = () => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const response = await fetch(`${API_URL}/promotional-banners`);
      const data = await response.json();
      if (data.success && data.data.banners.length > 0) {
        setBanners(data.data.banners);
      }
    } catch (error) {
      console.error('Error fetching promotional banners:', error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const cardWidth = 400; // Approximate card width + gap
      const scrollAmount = direction === 'left' ? -cardWidth : cardWidth;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleBannerClick = (banner: PromotionalBanner) => {
    if (banner.linkUrl) {
      window.open(banner.linkUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Don't render anything if loading or no banners
  if (loading || banners.length === 0) {
    return null;
  }

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
      <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 px-1">
        For new users
      </h3>

      <div className="relative group">
        {/* Navigation Arrows */}
        {banners.length > 3 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-1/2"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-1/2"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700" />
            </button>
          </>
        )}

        {/* Banners Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {banners.map((banner) => (
            <div
              key={banner._id}
              onClick={() => handleBannerClick(banner)}
              className={`flex-shrink-0 w-[280px] sm:w-[320px] md:w-[380px] rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 ${
                banner.linkUrl ? 'cursor-pointer hover:scale-[1.02]' : ''
              }`}
            >
              <div className="aspect-[16/9] overflow-hidden">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
