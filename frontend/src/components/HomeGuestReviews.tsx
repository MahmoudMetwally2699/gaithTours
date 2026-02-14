import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeftIcon, ChevronRightIcon, StarIcon } from '@heroicons/react/24/solid';

interface Review {
  id: string;
  hotelName: string;
  hotelCity: string;
  hotelRating: number;
  hotelReviewCount: string;
  reviewTitle: string;
  reviewText: string;
  reviewRating: number;
  tripType: string;
  travelDate: string;
  publishedDate: string;
  author: string;
  authorLocation: string;
  authorAvatar: string;
}

export const HomeGuestReviews: React.FC = () => {
  const { t, i18n } = useTranslation('home');
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchReviews = async () => {
      const cacheKey = `homeGuestReviews:${i18n.language}`;

      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          const age = Date.now() - (cachedData._ts || 0);
          if (age < 30 * 60 * 1000) {
            setReviews(cachedData.reviews);
            setLoading(false);
            return;
          }
        }
      } catch { /* ignore */ }

      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const response = await fetch(
          `${API_URL}/reviews/top-reviews?limit=8&language=${i18n.language}`,
          { signal: abortController.signal }
        );
        const data = await response.json();

        if (data.success && data.data.reviews) {
          setReviews(data.data.reviews);
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({
              reviews: data.data.reviews,
              _ts: Date.now()
            }));
          } catch { /* quota */ }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching guest reviews:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
    return () => abortController.abort();
  }, [i18n.language]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const getTripTypeLabel = (tripType: string) => {
    const map: Record<string, string> = {
      'Family': t('guestReviews.tripTypes.family', 'Family'),
      'Couples': t('guestReviews.tripTypes.couples', 'Couples'),
      'Solo travel': t('guestReviews.tripTypes.solo', 'Solo'),
      'Business': t('guestReviews.tripTypes.business', 'Business'),
      'Friends getaway': t('guestReviews.tripTypes.friends', 'Friends'),
    };
    return map[tripType] || tripType;
  };

  const truncateText = (text: string, maxLen: number) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen).replace(/\s+\S*$/, '') + '...';
  };

  if (loading) {
    return (
      <section className="w-full max-w-7xl mx-auto py-8 md:py-12 px-3 sm:px-4 md:px-6 lg:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-6">{t('guestReviews.title', 'What Our Guests Say')}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="min-w-[280px] sm:min-w-[320px] bg-white rounded-2xl p-5 shadow-sm border border-orange-100 animate-pulse flex-shrink-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-orange-100" />
                <div className="flex-1">
                  <div className="h-4 bg-orange-100 rounded w-24 mb-1" />
                  <div className="h-3 bg-orange-50 rounded w-16" />
                </div>
              </div>
              <div className="h-3 bg-orange-50 rounded w-full mb-2" />
              <div className="h-3 bg-orange-50 rounded w-full mb-2" />
              <div className="h-3 bg-orange-50 rounded w-2/3" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (reviews.length === 0) return null;

  return (
    <section className="w-full max-w-7xl mx-auto py-8 md:py-12">
      <div className="flex items-center justify-between mb-6 md:mb-8 px-3 sm:px-4 md:px-6 lg:px-8">
        <div>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
            {t('guestReviews.title', 'What Our Guests Say')}
          </h2>
          <p className="text-gray-500 text-sm md:text-base mt-1">
            {t('guestReviews.subtitle', 'Real reviews from verified guests')}
          </p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 md:p-2 rounded-full border-2 border-[#F7871D] text-[#F7871D] hover:bg-[#F7871D] hover:text-white transition-colors"
          >
            <ChevronLeftIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 md:p-2 rounded-full border-2 border-[#F7871D] text-[#F7871D] hover:bg-[#F7871D] hover:text-white transition-colors"
          >
            <ChevronRightIcon className="h-5 w-5 md:h-6 md:w-6" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 px-3 sm:px-4 md:px-6 lg:px-8 scrollbar-hide scroll-smooth snap-x snap-proximity"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {reviews.map((review, index) => (
          <div
            key={review.id || index}
            className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] max-w-[380px] bg-white rounded-2xl p-5 md:p-6 shadow-md border border-orange-100 hover:shadow-lg hover:border-[#F7871D]/40 transition-all duration-300 flex-shrink-0 snap-start flex flex-col"
          >
            {/* Author Row */}
            <div className="flex items-center gap-3 mb-3">
              {review.authorAvatar ? (
                <img
                  src={review.authorAvatar}
                  alt={review.author}
                  className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover border-2 border-orange-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.onerror = null;
                    target.style.display = 'none';
                    if (target.nextElementSibling) {
                      (target.nextElementSibling as HTMLElement).classList.remove('hidden');
                    }
                  }}
                />
              ) : null}
              <div
                className={`w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-[#F7871D] to-[#FCAE61] flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${review.authorAvatar ? 'hidden' : ''}`}
              >
                {review.author.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm md:text-base truncate">{review.author}</p>
                {review.authorLocation && (
                  <p className="text-gray-400 text-xs truncate">{review.authorLocation}</p>
                )}
              </div>
            </div>

            {/* Rating Stars + Trip Type */}
            <div className="flex items-center gap-2 mb-3">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`h-4 w-4 ${i < review.reviewRating ? 'text-[#F7871D]' : 'text-gray-200'}`}
                  />
                ))}
              </div>
              {review.tripType && (
                <span className="text-xs bg-orange-50 text-[#F7871D] px-2 py-0.5 rounded-full font-medium">
                  {getTripTypeLabel(review.tripType)}
                </span>
              )}
            </div>

            {/* Review Title */}
            {review.reviewTitle && (
              <h4 className="font-semibold text-gray-800 text-sm mb-2 line-clamp-1">
                "{review.reviewTitle}"
              </h4>
            )}

            {/* Review Text */}
            <p className="text-gray-600 text-sm leading-relaxed flex-grow mb-3">
              {truncateText(review.reviewText, 180)}
            </p>

            {/* Hotel Info Footer */}
            <div className="mt-auto pt-3 border-t border-orange-50 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[#F7871D] font-semibold text-xs md:text-sm truncate">
                  {review.hotelName}
                </p>
                <p className="text-gray-400 text-xs truncate">{review.hotelCity}</p>
              </div>
              <div className="bg-[#F7871D] text-white rounded-lg px-2 py-1 ml-2 flex-shrink-0">
                <span className="text-sm font-bold">{(review.hotelRating * 2).toFixed(1)}</span>
              </div>
            </div>
          </div>
        ))}
        <div className="w-4 md:w-6 lg:w-8 flex-shrink-0" aria-hidden="true" />
      </div>
    </section>
  );
};
