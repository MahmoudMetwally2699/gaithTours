import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { HotelCard } from './HotelCard';
import { useHistory } from 'react-router-dom';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { Hotel } from '../services/api';

// Extend the base Hotel interface to include properties specific to suggestions
interface ExtendedHotel extends Hotel {
  hid?: string;
  price?: number;
  pricePerNight?: number;
  nights?: number;
  currency?: string;
  isSearchedHotel?: boolean;
}

interface SuggestionResponse {
  hotels: ExtendedHotel[];
  source: 'history' | 'location' | 'fallback';
  destination: string;
}

export const SuggestedHotels: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const history = useHistory();
  const [hotels, setHotels] = useState<ExtendedHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [destinationName, setDestinationName] = useState<string>('');

  const fetchSuggestions = async (locationQuery?: string, keepLoading: boolean = false) => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      let url = `${API_URL}/hotels/suggested`;
      if (locationQuery) {
        url += `?location=${encodeURIComponent(locationQuery)}`;
      }

      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setHotels(data.data.hotels);
        setSource(data.data.source);
        setDestinationName(data.data.destination);
        return data.data; // Return for chaining
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      if (!keepLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Check if location was previously denied
    const locationDenied = localStorage.getItem('locationDenied');

    // Always try to get user location first if not denied
    if (!locationDenied) {
      console.log('🌍 Requesting user location for "Popular near you"...');
      getUserLocation();
    } else {
      // If location denied, fetch default suggestions
      console.log('📍 Location access denied - showing default suggestions');
      fetchSuggestions(undefined, false);
    }
  }, [isAuthenticated]); // Re-run if auth state changes

  const getUserLocation = () => {
    console.log('🌍 Requesting browser geolocation...');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocoding to get city name
            const { latitude, longitude } = position.coords;
            console.log(`📍 Coordinates received: ${latitude}, ${longitude}`);

            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const geoData = await response.json();
            console.log('🗺️ Reverse geocoding response:', geoData);

            const city = geoData.address.city || geoData.address.town || geoData.address.state || geoData.address.country;

            if (city) {
              console.log('✅ User location detected:', city);
              fetchSuggestions(city, false); // Don't keep loading, we are done after this
            } else {
              console.warn('⚠️ Could not determine city from coordinates');
              setLoading(false);
            }
          } catch (error) {
            console.error('❌ Reverse geocoding failed:', error);
            setLoading(false);
          }
        },
        (error) => {
          console.error('❌ Location access denied or failed:', error.message);
          console.log('💡 Falling back to default suggestions');
          localStorage.setItem('locationDenied', 'true');
          fetchSuggestions(undefined, false); // Fetch fallback suggestions
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      console.error('❌ Geolocation not supported by browser');
      fetchSuggestions(undefined, false);
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('hotels.suggestedForYou', 'Suggested for You')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[1.5rem] overflow-hidden shadow-sm h-[320px] animate-pulse border border-gray-100 flex flex-col">
              {/* Image placeholder with lighter tone */}
              <div className="bg-gray-100 h-40 w-full relative">
                 {/* Badge placeholder with border */}
                 <div className="absolute -bottom-5 right-4 h-11 w-11 bg-gray-200 rounded-xl border-4 border-white"></div>
              </div>

              {/* Content placeholder */}
              <div className="pt-6 pb-4 px-4 flex flex-col flex-grow space-y-3">
                {/* Title and Reviews */}
                <div className="space-y-3">
                   <div className="flex justify-between items-start">
                      <div className="h-6 bg-gray-200 rounded-md w-3/4"></div>
                   </div>
                   {/* Stars placeholder */}
                   <div className="flex gap-1">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="h-4 w-4 bg-gray-100 rounded-full"></div>
                      ))}
                   </div>
                </div>

                {/* Address */}
                <div className="space-y-2 mt-2">
                   <div className="h-3 bg-gray-100 rounded w-full"></div>
                   <div className="h-3 bg-gray-100 rounded w-2/3"></div>
                </div>

                {/* Price section at bottom */}
                <div className="mt-auto pt-3 flex justify-end items-baseline border-t border-gray-50">
                   <div className="h-3 bg-gray-100 rounded w-8 mr-1"></div>
                   <div className="h-6 bg-gray-200 rounded-lg w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h2 className="text-3xl font-bold text-gray-900">
              {source === 'history'
                ? t('suggestions.historyTitle', `Because you viewed ${destinationName}`)
                : source === 'location'
                ? t('suggestions.locationTitle', `Popular near you in ${destinationName}`)
                : t('suggestions.fallbackTitle', 'Popular Accommodations')
              }
            </h2>
            {source === 'fallback' && (
              <button
                onClick={() => {
                  localStorage.removeItem('locationDenied');
                  getUserLocation();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Use my location
              </button>
            )}
          </div>
          <p className="text-gray-600">
            {source === 'history'
              ? 'Pick up where you left off'
              : 'Discover top rated stays'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {hotels
            .filter(h => h.price && h.price > 0)
            .slice(0, 8)
            .map((hotel) => (
              <HotelCard
                key={hotel.id}
                hotel={hotel}
                onBook={() => history.push(`/hotels/details/${hotel.hid || hotel.id}`)}
              />
            ))}
        </div>
      </div>
    </section>
  );
};
