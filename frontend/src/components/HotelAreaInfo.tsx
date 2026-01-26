import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLandmark,
  faUtensils,
  faTrain,
  faTree,
  faPlane,
  faShoppingBag,
  faTheaterMasks,
  faMapMarkerAlt
} from '@fortawesome/free-solid-svg-icons';

/**
 * HotelAreaInfo Component
 *
 * Displays nearby points of interest in a Booking.com-style layout
 * Categories: Top attractions, Restaurants & cafes, Public transit, Natural beauty, Closest Airports
 */

interface POIItem {
  name: string;
  distance: number;
  distanceKm: string | null;
  type: string;
  subType: string;
}

interface POIData {
  attractions?: POIItem[];
  restaurants?: POIItem[];
  transit?: POIItem[];
  naturalBeauty?: POIItem[];
  airports?: POIItem[];
  shopping?: POIItem[];
  entertainment?: POIItem[];
}

interface HotelAreaInfoProps {
  poiData: POIData | null;
  neighborhoodDescription?: string;
}

// Format distance for display
const formatDistance = (distanceMeters: number): string => {
  if (!distanceMeters) return '';
  if (distanceMeters < 1000) {
    return `${distanceMeters} m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)} km`;
};

// Get icon and color for each category
const getCategoryConfig = (category: string) => {
  const configs: { [key: string]: { icon: any; label: string; color: string } } = {
    attractions: {
      icon: faLandmark,
      label: 'Top attractions',
      color: 'text-purple-600'
    },
    restaurants: {
      icon: faUtensils,
      label: 'Restaurants & cafes',
      color: 'text-orange-600'
    },
    transit: {
      icon: faTrain,
      label: 'Public transit',
      color: 'text-blue-600'
    },
    naturalBeauty: {
      icon: faTree,
      label: 'Natural Beauty',
      color: 'text-green-600'
    },
    airports: {
      icon: faPlane,
      label: 'Closest Airports',
      color: 'text-sky-600'
    },
    shopping: {
      icon: faShoppingBag,
      label: 'Shopping',
      color: 'text-pink-600'
    },
    entertainment: {
      icon: faTheaterMasks,
      label: 'Entertainment',
      color: 'text-red-600'
    }
  };
  return configs[category] || { icon: faMapMarkerAlt, label: category, color: 'text-gray-600' };
};

// POI Category Column Component
const POICategory: React.FC<{ category: string; items: POIItem[] }> = ({ category, items }) => {
  const config = getCategoryConfig(category);

  if (!items || items.length === 0) return null;

  return (
    <div className="flex-1 min-w-[200px]">
      {/* Category Header */}
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={config.icon} className={`w-4 h-4 ${config.color}`} />
        <h4 className="text-sm font-semibold text-gray-900">{config.label}</h4>
      </div>

      {/* POI Items */}
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between text-sm">
            <div className="flex-1 min-w-0 pr-2">
              {/* Type badge for transit/airports */}
              {(category === 'transit' || category === 'airports') && item.type && (
                <span className="text-xs text-gray-500 block">
                  {item.type.replace('(Entrace)', '').trim()}
                </span>
              )}
              <span className="text-gray-700 hover:text-blue-600 cursor-pointer truncate block">
                {item.name}
              </span>
            </div>
            <span className="text-gray-400 text-xs whitespace-nowrap">
              {formatDistance(item.distance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const HotelAreaInfo: React.FC<HotelAreaInfoProps> = ({
  poiData,
  neighborhoodDescription
}) => {
  const { t } = useTranslation();

  if (!poiData || Object.keys(poiData).length === 0) {
    return null;
  }

  // Define display order for categories
  const categoryOrder = ['attractions', 'restaurants', 'transit', 'naturalBeauty', 'airports', 'shopping', 'entertainment'];
  const availableCategories = categoryOrder.filter(cat => poiData[cat as keyof POIData]?.length);

  if (availableCategories.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            {t('hotels.areaInfo', 'Hotel area info')}
          </h3>
          {neighborhoodDescription && (
            <p className="text-sm text-gray-600 mt-1">
              {neighborhoodDescription}
            </p>
          )}
        </div>

        <button className="text-blue-600 text-sm font-medium hover:underline flex items-center gap-1">
          <span>{t('hotels.showMap', 'Show map')}</span>
        </button>
      </div>

      {/* POI Grid - Responsive columns like Booking.com */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {availableCategories.map(category => (
          <POICategory
            key={category}
            category={category}
            items={poiData[category as keyof POIData] || []}
          />
        ))}
      </div>
    </div>
  );
};

export default HotelAreaInfo;
