import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatNumber, formatTextWithNumbers } from '../utils/numberFormatter';
import { getTripAdvisorRatings, TripAdvisorRating, TripAdvisorReview } from '../services/tripadvisorService';

interface TripAdvisorReviewsProps {
  hotelName: string;
  city: string;
}

/**
 * TripAdvisor Reviews Section
 * Fetches and displays TripAdvisor ratings and reviews for a hotel.
 * Data is fetched from our backend (which caches it permanently in MongoDB).
 */
export const TripAdvisorReviews: React.FC<TripAdvisorReviewsProps> = ({ hotelName, city }) => {
  const { t, i18n } = useTranslation(['common', 'hotelDetails']);
  const [taData, setTaData] = useState<TripAdvisorRating | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    const fetchTripAdvisorData = async () => {
      if (!hotelName || !city) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const ratings = await getTripAdvisorRatings([hotelName], city);

        // Try to find by exact name first, then by any key
        const data = ratings[hotelName] || Object.values(ratings)[0] || null;
        setTaData(data);
      } catch (error) {
        console.error('Error fetching TripAdvisor data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTripAdvisorData();
  }, [hotelName, city]);

  // Render TripAdvisor bubble rating (1-5 scale)
  const renderBubbleRating = (rating: number) => {
    const bubbles = [];
    for (let i = 1; i <= 5; i++) {
      const isFull = i <= Math.floor(rating);
      const isHalf = !isFull && i <= rating + 0.5;
      bubbles.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 ${
            isFull
              ? 'bg-[#34E0A1] border-[#34E0A1]'
              : isHalf
              ? 'bg-gradient-to-r from-[#34E0A1] from-50% to-white to-50% border-[#34E0A1]'
              : 'bg-white border-gray-300'
          }`}
        />
      );
    }
    return <div className="flex gap-0.5">{bubbles}</div>;
  };

  // Format date
  const formatReviewDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(i18n.language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get rating text
  const getRatingText = (rating: number) => {
    if (rating >= 5) return 'Excellent';
    if (rating >= 4) return 'Very Good';
    if (rating >= 3) return 'Average';
    if (rating >= 2) return 'Poor';
    return 'Terrible';
  };

  // Loading state
  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 animate-pulse">
            <svg viewBox="0 0 24 24" className="w-full h-full text-gray-300">
              <circle cx="12" cy="12" r="12" fill="currentColor" />
            </svg>
          </div>
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // No data
  if (!taData || !taData.rating) return null;

  const reviewsToShow = showAllReviews ? taData.reviews : taData.reviews?.slice(0, 3);

  return (
    <div className="mb-12">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        {/* TripAdvisor Logo */}
        <svg viewBox="0 0 40 40" className="w-10 h-10 flex-shrink-0">
          <circle cx="20" cy="20" r="20" fill="#34E0A1" />
          <text x="20" y="26" textAnchor="middle" fill="white" fontSize="18" fontWeight="bold" fontFamily="Arial, sans-serif">T</text>
        </svg>
        <div>
          <h2 className="text-xl font-bold text-gray-800">TripAdvisor Reviews</h2>
          {taData.ranking && (
            <p className="text-sm text-gray-500">{taData.ranking}</p>
          )}
        </div>
      </div>

      {/* Rating Summary Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Rating Score */}
          <div className="flex items-center gap-4">
            <div className="bg-[#34E0A1] text-white text-3xl font-bold w-16 h-16 rounded-xl flex items-center justify-center shadow-sm">
              {formatNumber(taData.rating, i18n.language === 'ar')}
            </div>
            <div>
              <div className="text-lg font-bold text-gray-800">{getRatingText(taData.rating)}</div>
              {renderBubbleRating(taData.rating)}
              <div className="text-sm text-gray-500 mt-1">
                {formatTextWithNumbers(`${Number(taData.num_reviews).toLocaleString()} ${t('common:hotels.reviews', 'reviews')}`, i18n.language === 'ar')}
              </div>
            </div>
          </div>

          {/* Link to TripAdvisor */}
          {taData.web_url && (
            <a
              href={taData.web_url}
              target="_blank"
              rel="noopener noreferrer"
              className="sm:ms-auto text-sm text-[#34E0A1] hover:text-[#2bc48a] font-medium flex items-center gap-1 transition-colors"
            >
              View on TripAdvisor
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {taData.reviews && taData.reviews.length > 0 && (
        <div className="space-y-4">
          {reviewsToShow.map((review: TripAdvisorReview, index: number) => (
            <div
              key={review.id || index}
              className="bg-white border border-gray-100 rounded-lg p-5 hover:shadow-sm transition-shadow"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {review.user?.avatar?.small ? (
                    <img
                      src={review.user.avatar.small}
                      alt={review.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                      {(review.user?.username || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">
                      {review.user?.username || 'Traveler'}
                    </div>
                    {review.user?.user_location?.name && (
                      <div className="text-xs text-gray-500">{review.user.user_location.name}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-gray-400">
                  {review.published_date && formatReviewDate(review.published_date)}
                </div>
              </div>

              {/* Rating Bubbles */}
              <div className="flex items-center gap-2 mb-2">
                {renderBubbleRating(review.rating)}
                {review.trip_type && (
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                    {review.trip_type.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Title */}
              {review.title && (
                <h4 className="font-bold text-gray-800 mb-1">{review.title}</h4>
              )}

              {/* Review Text */}
              <p className="text-gray-600 text-sm leading-relaxed">
                {review.text}
              </p>

              {/* Helpful votes */}
              {review.helpful_votes && Number(review.helpful_votes) > 0 && (
                <div className="mt-2 text-xs text-gray-400">
                  👍 {review.helpful_votes} found this helpful
                </div>
              )}
            </div>
          ))}

          {/* Show More Button */}
          {taData.reviews.length > 3 && (
            <button
              onClick={() => setShowAllReviews(!showAllReviews)}
              className="w-full text-center py-3 text-[#34E0A1] hover:text-[#2bc48a] font-medium text-sm transition-colors"
            >
              {showAllReviews
                ? t('common:common.showLess', 'Show less')
                : `Show all ${taData.reviews.length} reviews`
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
};
