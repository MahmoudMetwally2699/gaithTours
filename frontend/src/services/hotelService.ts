// filepath: e:\gaithgroup\frontend\src\services\hotelService.ts
import { HotelSearchResponse } from '../types/hotel';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Search hotels by destination name with pagination and date support
 * @param destination - The destination name (e.g., "Tokyo", "Paris", "New York")
 * @param page - Page number (default: 1)
 * @param limit - Number of hotels per page (default: 10, max: 50)
 * @param options - Optional search parameters (dates, guests)
 * @returns Promise that resolves to hotel search results
 */
interface SearchOptions {
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: number | string;
    currency?: string;
    language?: string;
    starRating?: number[]; // Filter by star ratings (e.g., [2, 3, 4])
    facilities?: string[]; // Filter by facilities (e.g., ['free_wifi', 'pool'])
    mealPlan?: string[]; // Filter by meal plan (e.g., ['breakfast', 'half_board'])
    cancellationPolicy?: string; // 'free_cancellation' or 'non_refundable'
    guestRating?: number; // Minimum guest rating (7, 8, or 9)
}

const searchHotels = async (
    destination: string,
    page: number = 1,
    limit: number = 10,
    options?: SearchOptions
): Promise<HotelSearchResponse> => {
    try {
        // Get auth token from localStorage (optional for search)
        const token = localStorage.getItem('token');

        const requestOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        // Build URL with all parameters
        const params = new URLSearchParams({
            destination: destination,
            page: page.toString(),
            limit: limit.toString()
        });

        // Add optional date/guest parameters
        if (options?.checkin) params.append('checkin', options.checkin);
        if (options?.checkout) params.append('checkout', options.checkout);
        if (options?.adults) params.append('adults', options.adults.toString());
        if (options?.children) params.append('children', options.children?.toString() || '');
        if (options?.currency) params.append('currency', options.currency);
        if (options?.language) params.append('language', options.language);
        if (options?.starRating && options.starRating.length > 0) {
            params.append('starRating', options.starRating.join(','));
        }
        if (options?.facilities && options.facilities.length > 0) {
            params.append('facilities', options.facilities.join(','));
        }
        if (options?.mealPlan && options.mealPlan.length > 0) {
            params.append('mealPlan', options.mealPlan.join(','));
        }
        if (options?.cancellationPolicy && options.cancellationPolicy !== 'any') {
            params.append('cancellationPolicy', options.cancellationPolicy);
        }
        if (options?.guestRating && options.guestRating > 0) {
            params.append('guestRating', options.guestRating.toString());
        }

        const url = `${API_BASE_URL}/hotels/search?${params.toString()}`;

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Check if the response is successful
        if (!data.success) {
            throw new Error(data.message || 'Hotel search failed');
        }

        return data.data; // Return the data object containing hotels, total, page info

    } catch (error) {
        console.error('Error searching hotels:', error);
        throw error;
    }
};

/**
 * Get hotel details by ID
 * @param {string} hotelId - The hotel ID
 * @param {object} options - Optional parameters for dates and guests
 * @returns {Promise<Object>} - Promise that resolves to hotel details
 */
interface HotelDetailsOptions {
    checkin?: string;
    checkout?: string;
    adults?: number;
    children?: string;
    currency?: string;
    language?: string;
}

const getHotelDetails = async (hotelId: string, options?: HotelDetailsOptions) => {
    try {
        // No client-side cache — prices must always be fresh from backend
        // Backend caches static content (images, reviews) but always fetches live rates

        // Get auth token from localStorage (optional for hotel details)
        const token = localStorage.getItem('token');

        const requestOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        // Build URL with optional query parameters
        let url = `${API_BASE_URL}/hotels/details/${hotelId}`;
        const params = new URLSearchParams();

        if (options?.checkin) params.append('checkin', options.checkin);
        if (options?.checkout) params.append('checkout', options.checkout);
        if (options?.adults) params.append('adults', options.adults.toString());
        if (options?.children) params.append('children', options.children);
        if (options?.currency) params.append('currency', options.currency);
        if (options?.language) params.append('language', options.language);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Check if the response is successful
        if (!data.success) {
            throw new Error(data.message || 'Failed to get hotel details');
        }

        const hotel = data.data.hotel;

        return hotel;

    } catch (error) {
        console.error('Error getting hotel details:', error);
        throw error;
    }
};

/**
 * Get popular destinations
 * @returns {Promise<Object>} - Promise that resolves to popular destinations
 */
const getPopularDestinations = async () => {
    try {
        const options = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const url = `${API_BASE_URL}/hotels/popular`;

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;

    } catch (error) {
        console.error('Error getting popular destinations:', error);
        throw error;
    }
};

/**
 * Search destinations for autocomplete
 * @param {string} query - The search query
 * @returns {Promise<Object>} - Promise that resolves to location suggestions
 */
const searchDestinations = async (query: string) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required');
        }

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const url = `${API_BASE_URL}/hotels/locations?query=${encodeURIComponent(query)}`;

        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;

    } catch (error) {
        console.error('Error searching destinations:', error);
        throw error;
    }
};

/**
 * Suggest hotels worldwide for autocomplete (no dates required)
 * @param {string} query - The search query
 * @returns {Promise<Object>} - Promise that resolves to hotel and region suggestions
 */
const suggestHotels = async (query: string, language?: string) => {
    try {
        // Get auth token from localStorage (optional for autocomplete)
        const token = localStorage.getItem('token');

        const options: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        const url = `${API_BASE_URL}/hotels/suggest?query=${encodeURIComponent(query)}${language ? `&language=${language}` : ''}`;
        const response = await fetch(url, options);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.data;

    } catch (error) {
        console.error('Error suggesting hotels:', error);
        throw error;
    }
};

/**
 * Get hotel static content from DB (fast — no rates)
 * Returns hotel info, images, amenities, reviews immediately
 * while rates are fetched separately via getHotelDetails
 */
const getHotelContent = async (hotelId: string, language?: string) => {
    try {
        const token = localStorage.getItem('token');

        const requestOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        let url = `${API_BASE_URL}/hotels/content/${hotelId}`;
        if (language) {
            url += `?language=${language}`;
        }

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to get hotel content');
        }

        return data.data.hotel;

    } catch (error) {
        console.error('Error getting hotel content:', error);
        throw error;
    }
};

export { searchHotels, getHotelDetails, getHotelContent, getPopularDestinations, searchDestinations, suggestHotels };
export default searchHotels;
