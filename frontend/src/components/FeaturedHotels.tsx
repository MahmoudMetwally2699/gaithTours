import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import { StarIcon, MapPinIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const featuredHotels = [
  {
    id: 1,
    name: 'Burj Al Arab Jumeirah',
    image: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: 'Dubai, UAE',
    rating: 5.0,
    price: 450,
    originalPrice: 550,
    amenities: ['WiFi', 'Pool', 'Spa', 'Restaurant'],
    description: 'Luxury beachfront hotel with world-class amenities'
  },
  {
    id: 2,
    name: 'The Ritz-Carlton',
    image: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: 'Paris, France',
    rating: 4.9,
    price: 380,
    originalPrice: 450,
    amenities: ['WiFi', 'Gym', 'Bar', 'Concierge'],
    description: 'Elegant hotel in the heart of the city'
  },
  {
    id: 3,
    name: 'Park Hyatt Tokyo',
    image: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
    location: 'Tokyo, Japan',
    rating: 4.8,
    price: 320,
    originalPrice: 400,
    amenities: ['WiFi', 'Pool', 'Spa', 'Garden'],
    description: 'Modern luxury with traditional Japanese hospitality'
  }
];

export const FeaturedHotels: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();

  const handleBookNow = () => {
    // Allow all users (guest and authenticated) to view hotels
    history.push('/hotels');
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{/* Section Header */}
        <div
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {t('hotels.featured.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('hotels.featured.subtitle')}
          </p>
        </div>

        {/* Hotels Grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >          {featuredHotels.map((hotel, index) => (
            <div
              key={hotel.id}
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100"
            >
              {/* Hotel Image */}              <div className="relative h-56 overflow-hidden">
                <img
                  src={hotel.image}
                  alt={hotel.name}
                  className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                />
              </div>

              {/* Hotel Content */}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-xl font-bold text-gray-900 flex-1">
                    {hotel.name}
                  </h3>
                  <div className="flex items-center ml-2">
                    <StarIcon className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-gray-600 ml-1">{hotel.rating}</span>
                  </div>
                </div>

                <div className="flex items-center text-sm text-gray-500 mb-3">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {hotel.location}
                </div>

                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {hotel.description}
                </p>                {/* Amenities */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {hotel.amenities.map((amenity) => (
                    <span
                      key={amenity}
                      className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs"
                    >
                      {amenity}
                    </span>
                  ))}
                </div>                {/* Book Button */}
                <button
                  onClick={handleBookNow}
                  className="w-full mt-4 bg-primary-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-700 transition-colors duration-200"
                >
                  {t('hotels.bookNow')}
                </button>
              </div>
            </div>
          ))}
        </div>        {/* View All Hotels Button */}
        <div
          className="text-center mt-12"
        >
          <button
            onClick={handleBookNow}
            className="bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            {t('hotels.viewAll')}
          </button>
        </div>
      </div>
    </section>
  );
};
