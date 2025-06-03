// filepath: e:\gaithgroup\frontend\src\services\hotelService.ts
import { Hotel, HotelSearchResponse } from '../types/hotel';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

/**
 * Search hotels by destination name with pagination support
 * @param destination - The destination name (e.g., "Tokyo", "Paris", "New York")
 * @param page - Page number (default: 1)
 * @param limit - Number of hotels per page (default: 10, max: 50)
 * @returns Promise that resolves to hotel search results
 */
const searchHotels = async (destination: string, page: number = 1, limit: number = 10): Promise<HotelSearchResponse> => {
  try {
    // Get auth token from localStorage
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

    // URL with destination, page, and limit parameters
    const url = `${API_BASE_URL}/hotels/search?destination=${encodeURIComponent(destination)}&page=${page}&limit=${limit}`;

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data; // Return the data object containing hotels, total, page info

  } catch (error) {
    console.error('Error searching hotels:', error);
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

export { searchHotels, getPopularDestinations, searchDestinations };
export default searchHotels;
