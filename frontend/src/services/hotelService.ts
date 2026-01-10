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
        if (options?.children) params.append('children', options.children.toString());

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
}

const getHotelDetails = async (hotelId: string, options?: HotelDetailsOptions) => {
    try {
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

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        const response = await fetch(url, requestOptions);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Debug logging

        // Check if the response is successful
        if (!data.success) {
            throw new Error(data.message || 'Failed to get hotel details');
        }

        return data.data.hotel; // Return the hotel object

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
const suggestHotels = async (query: string) => {
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

        const url = `${API_BASE_URL}/hotels/suggest?query=${encodeURIComponent(query)}`;
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

export { searchHotels, getHotelDetails, getPopularDestinations, searchDestinations, suggestHotels };
export default searchHotels;
