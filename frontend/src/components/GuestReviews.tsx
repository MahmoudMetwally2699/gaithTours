import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Review {
  id: number;
  author: string;
  rating: number;
  review_plus?: string;
  review_minus?: string;
  created?: string;
  room_name?: string;
  traveller_type?: string;
  adults?: number;
  children?: number;
  nights?: number;
}

interface DetailedRatings {
  cleanness?: number;
  location?: number;
  price?: number;
  services?: number;
  room?: number;
  meal?: number;
  wifi?: number;
  hygiene?: number;
}

interface GuestReviewsProps {
  rating: number | null;
  reviewCount: number;
  detailedRatings?: DetailedRatings | null;
  reviews?: Review[];
}

// Helper to get score word
const getScoreWord = (rating: number): string => {
  if (rating >= 9) return 'Wonderful';
  if (rating >= 8) return 'Excellent';
  if (rating >= 7) return 'Very Good';
  if (rating >= 6) return 'Good';
  if (rating >= 5) return 'Pleasant';
  return 'Fair';
};

// Rating category labels mapping
const categoryLabels: { [key: string]: string } = {
  cleanness: 'Cleanliness',
  location: 'Location',
  price: 'Value for money',
  services: 'Staff',
  room: 'Room',
  meal: 'Facilities',
  wifi: 'Free WiFi',
  hygiene: 'Comfort'
};

export const GuestReviews: React.FC<GuestReviewsProps> = ({
  rating,
  reviewCount,
  detailedRatings,
  reviews = []
}) => {
  const { t } = useTranslation();
  const [expandedReview, setExpandedReview] = useState<number | null>(null);

  // Don't render if no rating data
  if (rating === null && reviewCount === 0) {
    return null;
  }

  // Get categories that have ratings
  const ratingCategories = detailedRatings
    ? Object.entries(detailedRatings).filter(([_, value]) => value != null && value > 0)
    : [];

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 mb-8" id="guest-reviews">
      {/* Header */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">Guest reviews</h2>

      {/* Overall Rating Badge */}
      {rating !== null && (
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-[#E67915] text-white px-3 py-2 rounded-lg font-bold text-lg">
            {rating.toFixed(1)}
          </div>
          <div>
            <span className="font-bold text-gray-900">{getScoreWord(rating)}</span>
            <span className="text-gray-500 mx-2">·</span>
            <span className="text-gray-600">{reviewCount.toLocaleString()} reviews</span>
          </div>
        </div>
      )}

      {/* Category Ratings */}
      {ratingCategories.length > 0 && (
        <div className="mb-8">
          <h3 className="font-semibold text-gray-800 mb-4">Categories:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-4">
            {ratingCategories.map(([key, value]) => (
              <div key={key} className="flex items-center justify-between gap-3">
                <span className="text-gray-700 text-sm flex-shrink-0 min-w-[100px]">
                  {categoryLabels[key] || key}
                </span>
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#E67915] h-full rounded-full transition-all duration-500"
                      style={{ width: `${(value as number) * 10}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 w-8 text-right">
                    {(value as number).toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest Reviews */}
      {reviews.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-800 mb-4">Guests who stayed here loved</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map((review) => (
              <div
                key={review.id}
                className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-[#E67915] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {review.author?.charAt(0)?.toUpperCase() || 'G'}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{review.author || 'Guest'}</p>
                    {review.traveller_type && review.traveller_type !== 'unspecified' && (
                      <p className="text-xs text-gray-500 capitalize">
                        {review.traveller_type.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Review Content */}
                <div className="text-gray-700 text-sm">
                  {review.review_plus && (
                    <p className={`${expandedReview === review.id ? '' : 'line-clamp-3'}`}>
                      "{review.review_plus}"
                    </p>
                  )}
                  {review.review_minus && (
                    <p className={`mt-2 text-gray-500 ${expandedReview === review.id ? '' : 'line-clamp-2'}`}>
                      <span className="text-gray-400">Could improve:</span> {review.review_minus}
                    </p>
                  )}
                </div>

                {/* Read More */}
                {(review.review_plus?.length || 0) > 150 && (
                  <button
                    onClick={() => setExpandedReview(expandedReview === review.id ? null : review.id)}
                    className="text-[#E67915] text-sm font-medium mt-2 hover:underline"
                  >
                    {expandedReview === review.id ? 'Show less' : 'Read more'}
                  </button>
                )}

                {/* Stay Details */}
                {(review.nights || review.room_name) && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {review.nights && <span>{review.nights} night{review.nights > 1 ? 's' : ''}</span>}
                    {review.nights && review.room_name && <span className="mx-1">·</span>}
                    {review.room_name && <span>{review.room_name}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* See All Reviews Button */}
          {reviews.length > 6 && (
            <div className="mt-6 text-center">
              <button className="border-2 border-[#E67915] text-[#E67915] px-6 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors">
                Read all {reviewCount.toLocaleString()} reviews
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Reviews Message */}
      {reviews.length === 0 && rating !== null && (
        <p className="text-gray-500 text-sm">
          Rating based on {reviewCount} reviews. Detailed reviews are not available yet.
        </p>
      )}
    </section>
  );
};
