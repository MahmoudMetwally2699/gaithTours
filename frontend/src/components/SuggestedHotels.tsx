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

      let url = 'http://localhost:5001/api/hotels/suggested';
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
    // Initial fetch (tries history if logged in) or fallback
    // Pass keepLoading=true so we don't flash content if we need to fetch location immediately after
    fetchSuggestions(undefined, true).then((data) => {
      // If we got fallback results and user hasn't denied location, try to get location
      if (data && data.source === 'fallback' && !localStorage.getItem('locationDenied')) {
        getUserLocation();
      } else {
        // If history found or location denied, we are done
        setLoading(false);
      }
    }).catch(() => setLoading(false));
  }, [isAuthenticated]); // Re-run if auth state changes

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            // Reverse geocoding to get city name
            const { latitude, longitude } = position.coords;
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const geoData = await response.json();

            const city = geoData.address.city || geoData.address.town || geoData.address.state || geoData.address.country;

            if (city) {
              console.log('📍 User location detected:', city);
              fetchSuggestions(city, false); // Don't keep loading, we are done after this
            } else {
              setLoading(false);
            }
          } catch (error) {
            console.error('Reverse geocoding failed:', error);
            setLoading(false);
          }
        },
        (error) => {
          console.log('Location access denied or failed:', error.message);
          localStorage.setItem('locationDenied', 'true');
          setLoading(false);
        }
      );
    } else {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{t('hotels.suggestedForYou', 'Suggested for You')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] overflow-hidden shadow-sm h-[480px] animate-pulse border border-gray-100 flex flex-col">
              {/* Image placeholder with lighter tone */}
              <div className="bg-gray-100 h-64 w-full relative">
                 {/* Badge placeholder with border */}
                 <div className="absolute -bottom-6 right-6 h-14 w-14 bg-gray-200 rounded-xl border-4 border-white"></div>
              </div>

              {/* Content placeholder */}
              <div className="pt-10 pb-6 px-6 flex flex-col flex-grow space-y-4">
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
                <div className="mt-auto pt-4 flex justify-end items-baseline border-t border-gray-50">
                   <div className="h-3 bg-gray-100 rounded w-8 mr-2"></div>
                   <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {source === 'history'
              ? t('suggestions.historyTitle', `Because you viewed ${destinationName}`)
              : source === 'location'
              ? t('suggestions.locationTitle', `Popular near you in ${destinationName}`)
              : t('suggestions.fallbackTitle', 'Popular Accommodations')
            }
          </h2>
          <p className="text-gray-600">
            {source === 'history'
              ? 'Pick up where you left off'
              : 'Discover top rated stays'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {hotels
            .filter(h => h.price && h.price > 0)
            .slice(0, 6)
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
