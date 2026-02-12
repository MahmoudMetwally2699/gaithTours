import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface TripAdvisorRating {
    location_id: string;
    name: string;
    rating: number | null;
    num_reviews: string;
    ranking: string | null;
    price_level: string | null;
    web_url: string | null;
    rating_image_url: string | null;
    reviews: TripAdvisorReview[];
    from_cache: boolean;
}

export interface TripAdvisorReview {
    id: string;
    lang: string;
    published_date: string;
    rating: number;
    helpful_votes: string;
    rating_image_url: string;
    url: string;
    text: string;
    title: string;
    trip_type: string;
    travel_date: string;
    user: {
        username: string;
        user_location?: {
            name: string;
            id: string;
        };
        avatar?: {
            thumbnail: string;
            small: string;
            medium: string;
            large: string;
            original: string;
        };
    };
    subratings: Record<string, any> | null;
}

export interface TripAdvisorReviewsResponse {
    location_id: string;
    name: string | null;
    rating: number | null;
    num_reviews: string;
    rating_image_url: string | null;
    web_url: string | null;
    reviews: TripAdvisorReview[];
    from_cache: boolean;
}

/**
 * Get TripAdvisor ratings for a batch of hotels in a city.
 * Returns a map of hotel_name → TripAdvisorRating
 */
export const getTripAdvisorRatings = async (
    hotelNames: string[],
    city: string
): Promise<Record<string, TripAdvisorRating>> => {
    try {
        if (!hotelNames || hotelNames.length === 0) return {};

        // Batch in groups of 10 to avoid very long URLs
        const batchSize = 10;
        const results: Record<string, TripAdvisorRating> = {};

        for (let i = 0; i < hotelNames.length; i += batchSize) {
            const batch = hotelNames.slice(i, i + batchSize);
            const namesParam = batch.join('||');

            const response = await axios.get(`${API_URL}/tripadvisor/ratings`, {
                params: {
                    hotelNames: namesParam,
                    city: city
                },
                timeout: 30000
            });

            if (response.data?.success && response.data?.data) {
                Object.assign(results, response.data.data);
            }
        }

        return results;
    } catch (error) {
        console.error('Error fetching TripAdvisor ratings:', error);
        return {};
    }
};

/**
 * Get TripAdvisor reviews for a specific hotel by its TripAdvisor location ID.
 */
export const getTripAdvisorReviews = async (
    locationId: string,
    language: string = 'en'
): Promise<TripAdvisorReviewsResponse | null> => {
    try {
        const response = await axios.get(`${API_URL}/tripadvisor/reviews/${locationId}`, {
            params: { language },
            timeout: 15000
        });

        if (response.data?.success && response.data?.data) {
            return response.data.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching TripAdvisor reviews:', error);
        return null;
    }
};
