import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Hotel } from '../types/hotel';
import { BuildingOfficeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';
import { TripAdvisorRating } from '../services/tripadvisorService';
import { TFunction } from 'i18next';
import { formatNumber } from '../utils/numberFormatter';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface SearchMapViewProps {
  filteredHotels: Hotel[];
  selectedHotel: Hotel | null;
  setSelectedHotel: (h: Hotel | null) => void;
  setFullscreenMap: (v: boolean) => void;
  handleHotelClick: (h: Hotel) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
  destination: string;
  currencySymbol: string;
  formatPrice: (price: number) => string;
  renderStars: (rating: number) => JSX.Element[];
  taRatings: Record<string, TripAdvisorRating>;
  t: TFunction;
  getScoreText: (rating: number, t: TFunction) => string;
  getCityCoordinates: (dest: string) => [number, number];
}

const getHotelPosition = (hotel: Hotel, index: number, cityCenter: [number, number]): [number, number] => {
  const coords = (hotel as any).coordinates;
  const angle = (index * 137.5) * (Math.PI / 180);
  const radius = 0.01 + (index % 10) * 0.003;
  const lat = coords?.latitude || (hotel as any).latitude || cityCenter[0] + Math.cos(angle) * radius;
  const lng = coords?.longitude || (hotel as any).longitude || cityCenter[1] + Math.sin(angle) * radius;
  return [lat, lng];
};

const MapController: React.FC<{
  selectedHotel: Hotel | null;
  filteredHotels: Hotel[];
  cityCenter: [number, number];
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
}> = ({ selectedHotel, filteredHotels, cityCenter, markerRefs }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedHotel) return;
    const idx = filteredHotels.findIndex(h => h.id === selectedHotel.id);
    if (idx === -1) return;
    const [lat, lng] = getHotelPosition(selectedHotel, idx, cityCenter);
    map.flyTo([lat, lng], Math.max(map.getZoom(), 15), { duration: 0.8 });

    const hotelKey = String(selectedHotel.id);
    const timer = setTimeout(() => {
      const marker = markerRefs.current[hotelKey];
      if (marker) marker.openPopup();
    }, 900);
    return () => clearTimeout(timer);
  }, [selectedHotel, filteredHotels, cityCenter, map, markerRefs]);

  return null;
};

const SearchMapView: React.FC<SearchMapViewProps> = ({
  filteredHotels, selectedHotel, setSelectedHotel, setFullscreenMap,
  handleHotelClick, sortBy, setSortBy, destination, currencySymbol,
  formatPrice, renderStars, taRatings, t, getScoreText, getCityCoordinates
}) => {
  const { i18n } = useTranslation();
  const markerRefs = useRef<Record<string, L.Marker>>({});
  const mapCarouselRef = useRef<HTMLDivElement>(null);
  const cityCenter = getCityCoordinates(destination);

  // Sync selected hotel carousel
  useEffect(() => {
    if (!mapCarouselRef.current) return;
    const container = mapCarouselRef.current;
    const cards = container.querySelectorAll<HTMLElement>('[data-hotel-id]');
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
            const hotelId = (entry.target as HTMLElement).dataset.hotelId;
            if (hotelId) {
              setSelectedHotel(
                filteredHotels.find(h => String(h.id) === hotelId) || null
              );
            }
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [filteredHotels, setSelectedHotel]);

  return (
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setFullscreenMap(false)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <XMarkIcon className="h-5 w-5" />
            <span>{String(t('searchResults:map.closeMap', 'Close map'))}</span>
          </button>
          <div className="text-sm text-gray-600">
            {`${filteredHotels.length} ${t('common.properties', 'properties')}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
          >
            <option value="top_picks">Top picks</option>
            <option value="price_low">Price (lowest)</option>
            <option value="price_high">Price (highest)</option>
            <option value="rating">Best reviewed</option>
          </select>
        </div>
      </div>

      {/* Split View */}
      <div className="flex h-[calc(100vh-57px)]">
        {/* Hotels List */}
        <div className="hidden md:block w-80 lg:w-96 border-r overflow-y-auto bg-gray-50">
          {filteredHotels.map((hotel) => {
            const taR = taRatings[hotel.name];
            const backendTA = (hotel as any).tripadvisor_rating;
            const displayRating = taR?.rating || backendTA || null;
            const displayReviews = taR?.num_reviews || (hotel as any).tripadvisor_num_reviews || null;
            const effectiveRating = displayRating ? displayRating * 2 : hotel.rating;

            return (
              <div
                key={hotel.id}
                onClick={() => { setSelectedHotel(hotel); handleHotelClick(hotel); }}
                onMouseEnter={() => setSelectedHotel(hotel)}
                className={`p-3 border-b bg-white hover:bg-blue-50 cursor-pointer transition-colors ${
                  selectedHotel?.id === hotel.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-24 h-20 flex-shrink-0">
                    {hotel.image ? (
                      <img src={hotel.image} alt={hotel.name} className="w-full h-full object-cover rounded" />
                    ) : (
                      <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                        <BuildingOfficeIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-blue-700 text-sm truncate">{hotel.name}</h4>
                    <div className="flex items-center gap-1 mt-0.5">
                      {renderStars((hotel as any).star_rating || Math.round(hotel.rating / 2))}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-blue-900 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                        {formatNumber(Math.min(effectiveRating, 10), i18n.language === 'ar')}
                      </span>
                      <span className="text-xs text-gray-600">
                        {getScoreText(effectiveRating, t)}
                        {displayReviews ? ` (${Number(displayReviews).toLocaleString()})` : ''}
                      </span>
                    </div>
                    {hotel.price && hotel.price > 0 && (
                      <div className="mt-1.5">
                        <span className="font-bold text-gray-900 font-price">{formatPrice(hotel.price)}</span>
                        <span className="text-xs text-gray-500 ml-1">per night</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer center={cityCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            <MapController
              selectedHotel={selectedHotel}
              filteredHotels={filteredHotels}
              cityCenter={cityCenter}
              markerRefs={markerRefs}
            />
            {filteredHotels.map((hotel, index) => {
              const [lat, lng] = getHotelPosition(hotel, index, cityCenter);
              const priceIcon = L.divIcon({
                className: 'custom-price-marker',
                html: `<div class="px-2 py-1 rounded-lg text-xs font-bold shadow-lg whitespace-nowrap ${
                  selectedHotel?.id === hotel.id ? 'bg-blue-600 text-white scale-110' : 'bg-white text-gray-900 border border-gray-300'
                }" style="transform: translate(-50%, -50%);">
                  ${hotel.price && hotel.price > 0 ? `${currencySymbol}${Math.round(hotel.price)}` : 'View'}
                </div>`,
                iconSize: [80, 30],
                iconAnchor: [40, 15],
              });

              return (
                <Marker
                  key={hotel.id}
                  position={[lat, lng]}
                  icon={priceIcon}
                  ref={(ref: any) => { if (ref) markerRefs.current[String(hotel.id)] = ref; }}
                  eventHandlers={{
                    click: () => setSelectedHotel(hotel),
                    mouseover: () => setSelectedHotel(hotel),
                  }}
                >
                  <Popup>
                    <div className="w-48">
                      {hotel.image && <img src={hotel.image} alt={hotel.name} className="w-full h-24 object-cover rounded-t" />}
                      <div className="p-2">
                        <h4 className="font-bold text-sm text-blue-700">{hotel.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                          {(() => {
                            const taR = taRatings[hotel.name];
                            const backendTA = (hotel as any).tripadvisor_rating;
                            const displayRating = taR?.rating || backendTA || null;
                            const effectiveRating = displayRating ? displayRating * 2 : hotel.rating;
                            return (
                              <>
                                <span className="bg-blue-900 text-white text-xs px-1.5 py-0.5 rounded font-bold">
                                  {formatNumber(Math.min(effectiveRating, 10), i18n.language === 'ar')}
                                </span>
                                <span className="text-xs text-gray-600">{getScoreText(effectiveRating, t)}</span>
                              </>
                            );
                          })()}
                        </div>
                        {hotel.price && hotel.price > 0 && (
                          <div className="mt-2 font-bold">
                            {formatPrice(hotel.price)} <span className="text-xs font-normal text-gray-500">per night</span>
                          </div>
                        )}
                        <button onClick={() => handleHotelClick(hotel)} className="mt-2 w-full bg-blue-600 text-white text-xs py-1.5 rounded font-medium">
                          See availability
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Mobile Hotel Carousel */}
          <div ref={mapCarouselRef} className="md:hidden absolute bottom-4 left-0 right-0 z-[1000] flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory safe-area-bottom">
            {filteredHotels.map((hotel) => {
              const taR = taRatings[hotel.name];
              const backendTA = (hotel as any).tripadvisor_rating;
              const displayRating = taR?.rating || backendTA || null;
              const effectiveRating = displayRating ? displayRating * 2 : hotel.rating;

              return (
                <div
                  key={hotel.id}
                  data-hotel-id={String(hotel.id)}
                  onClick={() => setSelectedHotel(hotel)}
                  className={`min-w-[85%] sm:min-w-[300px] bg-white rounded-xl shadow-xl snap-center flex overflow-hidden border transition-all ${
                    selectedHotel?.id === hotel.id ? 'border-orange-500 ring-2 ring-orange-500 ring-opacity-50' : 'border-gray-200'
                  }`}
                >
                  <div className="w-24 bg-gray-200 shrink-0 relative">
                    {hotel.image ? (
                      <img src={hotel.image} className="w-full h-full object-cover" loading="lazy" alt={hotel.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400"><BuildingOfficeIcon className="w-8 h-8" /></div>
                    )}
                  </div>
                  <div className="p-3 flex-1 min-w-0 flex flex-col justify-center relative">
                    <h4 className="font-bold text-sm text-gray-900 truncate mb-1">{hotel.name}</h4>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="bg-blue-900 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">{formatNumber(Math.min(effectiveRating, 10), i18n.language === 'ar')}</span>
                      <span className="text-xs text-gray-500 truncate">{getScoreText(effectiveRating, t)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="font-bold text-[#E67915] text-lg leading-none">{formatPrice(hotel.price)}</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleHotelClick(hotel); }}
                        className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold shadow-sm"
                      >
                        View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchMapView;
