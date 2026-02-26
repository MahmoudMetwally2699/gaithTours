import React, { useState, useEffect } from 'react';
import { useParams, useHistory } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Navbar } from '../components/Navbar';
import { HotelCard } from '../components/HotelCard';
import { TripAdvisorRating } from '../services/tripadvisorService';
import { useCurrency } from '../contexts/CurrencyContext';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';

interface DealHotel {
  hotelId: string;
  hotelName: string;
  hotelNameAr?: string;
  hotelImage?: string;
  city?: string;
  country?: string;
  address?: string;
  rating?: number;
  starRating?: number;
  reviewCount?: string;
  tripadvisorLocationId?: string;
  price?: number;
  pricePerNight?: number;
  currency?: string;
  nights?: number;
}

interface BestPriceDeal {
  _id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  imageUrl: string;
  hotels: DealHotel[];
  isActive: boolean;
}

export const BestPriceDeals: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation(['home', 'common']);
  const history = useHistory();
  const isRTL = i18n.language === 'ar';
  const { currency } = useCurrency();
  const [deal, setDeal] = useState<BestPriceDeal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDeal = async () => {
      try {
        setLoading(true);
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
        const response = await fetch(`${API_URL}/best-prices/${id}?currency=${currency}`);
        const data = await response.json();
        if (data.success && data.data?.deal) {
          setDeal(data.data.deal);
        } else {
          setError('Deal not found');
        }
      } catch (err) {
        console.error('Error fetching deal:', err);
        setError('Failed to load deal');
      } finally {
        setLoading(false);
      }
    };

    fetchDeal();
  }, [id, currency]);

  const handleHotelClick = (hotel: DealHotel) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkIn = today.toISOString().split('T')[0];
    const checkOut = tomorrow.toISOString().split('T')[0];
    history.push(`/hotels/details/${hotel.hotelId}?checkIn=${checkIn}&checkOut=${checkOut}&adults=2`);
  };

  const dealTitle = isRTL && deal?.titleAr ? deal.titleAr : deal?.title;
  const dealDescription = isRTL && deal?.descriptionAr ? deal.descriptionAr : deal?.description;

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Skeleton banner */}
            <div className="w-full h-48 sm:h-64 md:h-72 rounded-2xl bg-gray-200 animate-pulse mb-8" />
            {/* Skeleton cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm h-[280px] animate-pulse border border-gray-100">
                  <div className="bg-gray-100 h-36 w-full" />
                  <div className="p-4 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !deal) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
          <div className="text-center">
            <p className="text-gray-500 text-lg mb-4">{error || 'Deal not found'}</p>
            <button
              onClick={() => history.push('/')}
              className="px-6 py-2 bg-[#FF8C00] text-white rounded-lg hover:bg-[#e07c00] transition"
            >
              {t('common:backToHome', 'Back to Home')}
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-50 pt-20">
        {/* Hero Banner */}
        <div className="relative w-full h-48 sm:h-64 md:h-80 overflow-hidden">
          <img
            src={deal.imageUrl}
            alt={dealTitle || deal.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
            <button
              onClick={() => history.goBack()}
              className="mb-3 flex items-center gap-1 text-white/80 hover:text-white transition-colors text-sm"
            >
              <ChevronLeftIcon className={`h-4 w-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('common:back', 'Back')}
            </button>
            <h1
              className="text-white font-bold text-2xl sm:text-3xl md:text-4xl drop-shadow-lg"
              style={{ direction: isRTL && deal.titleAr ? 'rtl' : 'ltr' }}
            >
              {dealTitle}
            </h1>
            {dealDescription && (
              <p
                className="text-white/80 text-sm sm:text-base mt-2 max-w-2xl drop-shadow"
                style={{ direction: isRTL && deal.descriptionAr ? 'rtl' : 'ltr' }}
              >
                {dealDescription}
              </p>
            )}
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-sm">
              <span className="font-semibold">{deal.hotels.length}</span>
              <span>
                {deal.hotels.length === 1
                  ? t('common:nav.hotels', 'Hotel')
                  : t('common:nav.hotels', 'Hotels')}
              </span>
            </div>
          </div>
        </div>

        {/* Hotels Grid */}
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-10">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {deal.hotels.map((hotel) => (
              <HotelCard
                key={hotel.hotelId}
                hotel={{
                  id: hotel.hotelId,
                  name: hotel.hotelName,
                  nameAr: hotel.hotelNameAr,
                  address: hotel.address || '',
                  city: hotel.city || '',
                  country: hotel.country || '',
                  rating: hotel.rating || 0,
                  image: hotel.hotelImage || '',
                  star_rating: hotel.starRating || 0,
                  reviewCount: hotel.reviewCount ? Number(hotel.reviewCount) : undefined,
                  latitude: 0,
                  longitude: 0,
                } as any}
                taRating={hotel.rating ? {
                  location_id: hotel.tripadvisorLocationId || '',
                  name: hotel.hotelName,
                  rating: hotel.rating,
                  num_reviews: hotel.reviewCount || '0',
                  ranking: null,
                  price_level: null,
                  web_url: null,
                  rating_image_url: null,
                  reviews: [],
                  from_cache: true,
                } : null}
                price={hotel.price}
                currency={hotel.currency}
                onBook={() => handleHotelClick(hotel)}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
