import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StarIcon, MapPinIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';

interface SimilarHotelsProps {
  city: string;
  currentHotelId: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  children?: number;
}

interface Hotel {
  id: string;
  name: string;
  rating: number;
  price: number;
  currency: string;
  image: string;
  address: string;
}

export const SimilarHotels: React.FC<SimilarHotelsProps> = ({
  city,
  currentHotelId,
  checkIn,
  checkOut,
  adults,
  children = 0
}) => {
  const { t, i18n } = useTranslation();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchSimilarHotels = async () => {
      if (!city) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

        // Use the /hotels/suggested endpoint which returns enriched hotels with images
        // Pass the city as a location hint
        const params = new URLSearchParams({
          location: city,
          currency: 'USD'
        });

        const response = await fetch(`${API_URL}/hotels/suggested?${params}`, {
          signal: abortController.signal
        });

        const data = await response.json();

        if (data.success && data.data?.hotels && data.data.hotels.length > 0) {
          const filteredHotels = data.data.hotels
            .filter((h: any) => {
              const hotelId = String(h.hid || h.id);
              return hotelId !== String(currentHotelId);
            })
            .slice(0, 8)
            .map((h: any) => ({
              id: h.hid || h.id,
              name: h.name,
              rating: h.star_rating || h.rating || 0,
              price: h.price || 0,
              currency: h.currency || 'USD',
              image: h.image || h.images?.[0] || '/placeholder-hotel.jpg',
              address: h.address || h.city || city
            }));

          setHotels(filteredHotels);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.error('[SimilarHotels] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarHotels();

    return () => abortController.abort();
  }, [city, currentHotelId, i18n.language]);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = 320;
      const newPosition = direction === 'left'
        ? scrollPosition - scrollAmount
        : scrollPosition + scrollAmount;

      containerRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const sectionTitle = `${t('hotels.similarHotels', 'Similar Hotels in')} ${city || 'this area'}`;

  if (loading) {
    return (
      <div className="bg-gray-50 rounded-xl p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">{sectionTitle}</h3>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-72 animate-pulse">
              <div className="bg-gray-200 h-40 rounded-lg mb-3"></div>
              <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
              <div className="bg-gray-200 h-3 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (hotels.length === 0) return null;

  return (
    <div className="bg-gray-50 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-gray-900">{sectionTitle}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2 rounded-full bg-white shadow hover:bg-gray-50 transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {hotels.map((hotel) => (
          <Link
            key={hotel.id}
            to={`/hotels/details/${hotel.id}?destination=${encodeURIComponent(hotel.address || city)}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`}
            className="flex-shrink-0 w-72 bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group"
          >
            <div className="relative h-40">
              <img
                src={hotel.image}
                alt={hotel.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/placeholder-hotel.jpg';
                }}
              />
              {hotel.price > 0 && (
                <div className="absolute bottom-2 right-2 bg-orange-600 text-white px-2 py-1 rounded text-sm font-bold">
                  {hotel.currency} {hotel.price.toFixed(0)}
                </div>
              )}
            </div>
            <div className="p-3">
              <h4 className="font-semibold text-gray-900 text-sm line-clamp-1 mb-1">
                {hotel.name}
              </h4>
              <div className="flex items-center gap-1 mb-1">
                {[...Array(5)].map((_, i) => (
                  <StarIcon
                    key={i}
                    className={`w-3 h-3 ${i < hotel.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPinIcon className="w-3 h-3" />
                <span className="line-clamp-1">{hotel.address}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};
