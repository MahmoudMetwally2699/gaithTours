import React from 'react';
import {
  MapPinIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlane, faTrain, faSubway, faBus, faMapMarkerAlt, faCity, faLandmark, faRoad } from '@fortawesome/free-solid-svg-icons';

/**
 * HotelLocationBadge Component
 *
 * Displays hotel location information in a visually appealing way,
 * similar to Booking.com's location display.
 *
 * Shows:
 * - Region type (City, Airport, Neighborhood, Point of Interest, etc.)
 * - Region name
 * - IATA code for airports
 * - Country
 */

interface Region {
  country_code?: string;
  iata?: string;
  id?: string;
  name?: string;
  type?: string;
}

interface HotelLocationBadgeProps {
  address?: string;
  city?: string;
  country?: string;
  countryCode?: string;
  region?: Region;
  showFullAddress?: boolean;
}

// Get icon based on region type
const getRegionIcon = (type: string | undefined) => {
  const iconClass = "w-4 h-4";

  switch (type?.toLowerCase()) {
    case 'airport':
      return <FontAwesomeIcon icon={faPlane} className={iconClass} />;
    case 'bus station':
      return <FontAwesomeIcon icon={faBus} className={iconClass} />;
    case 'city':
      return <FontAwesomeIcon icon={faCity} className={iconClass} />;
    case 'neighborhood':
      return <HomeIcon className={iconClass} />;
    case 'point of interest':
      return <FontAwesomeIcon icon={faLandmark} className={iconClass} />;
    case 'railway station':
    case 'multi-railway station':
      return <FontAwesomeIcon icon={faTrain} className={iconClass} />;
    case 'subway (entrace)':
      return <FontAwesomeIcon icon={faSubway} className={iconClass} />;
    case 'street':
      return <FontAwesomeIcon icon={faRoad} className={iconClass} />;
    case 'province (state)':
    case 'country':
    case 'continent':
      return <GlobeAltIcon className={iconClass} />;
    case 'multi-city (vicinity)':
    case 'multi-region (within a country)':
      return <BuildingOffice2Icon className={iconClass} />;
    default:
      return <MapPinIcon className={iconClass} />;
  }
};

// Get human-readable region type label
const getRegionTypeLabel = (type: string | undefined): string => {
  if (!type) return '';

  const typeLabels: { [key: string]: string } = {
    'airport': 'Near Airport',
    'bus station': 'Near Bus Station',
    'city': 'City',
    'neighborhood': 'Neighborhood',
    'point of interest': 'Point of Interest',
    'railway station': 'Near Railway Station',
    'multi-railway station': 'Railway Area',
    'subway (entrace)': 'Near Metro',
    'street': 'Street Location',
    'province (state)': 'Province',
    'country': 'Country',
    'continent': 'Continent',
    'multi-city (vicinity)': 'Vicinity',
    'multi-region (within a country)': 'Region'
  };

  return typeLabels[type.toLowerCase()] || type;
};

// Get badge color based on region type
const getRegionBadgeColor = (type: string | undefined): string => {
  switch (type?.toLowerCase()) {
    case 'airport':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'city':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'neighborhood':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'point of interest':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'railway station':
    case 'multi-railway station':
    case 'bus station':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

export const HotelLocationBadge: React.FC<HotelLocationBadgeProps> = ({
  address,
  city,
  country,
  countryCode,
  region,
  showFullAddress = true
}) => {
  const hasRegion = region && region.name;
  const regionType = region?.type;
  const regionName = region?.name || city;
  const iata = region?.iata;

  return (
    <div className="space-y-2">
      {/* Main Location Display */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Region Type Badge */}
        {regionType && regionType !== 'City' && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getRegionBadgeColor(regionType)}`}>
            {getRegionIcon(regionType)}
            <span>{getRegionTypeLabel(regionType)}</span>
          </span>
        )}

        {/* IATA Badge for Airports */}
        {iata && (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-blue-500 text-white">
            <FontAwesomeIcon icon={faPlane} className="w-3 h-3" />
            {iata}
          </span>
        )}
      </div>

      {/* Location Details */}
      <div className="flex items-start gap-2 text-sm text-gray-600">
        <MapPinIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div>
          {/* Region/City Name */}
          <span className="font-medium text-gray-900">
            {regionName}
          </span>

          {/* Country */}
          {country && (
            <span className="text-gray-500">
              {regionName ? ', ' : ''}{country}
              {countryCode && (
                <span className="ml-1 text-xs uppercase text-gray-400">
                  ({countryCode})
                </span>
              )}
            </span>
          )}

          {/* Full Address */}
          {showFullAddress && address && (
            <p className="text-gray-500 mt-1">
              {address}
            </p>
          )}
        </div>
      </div>

      {/* Quick Info Badges */}
      {hasRegion && (
        <div className="flex flex-wrap gap-2 mt-2">
          {/* City Badge */}
          {city && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600 border border-gray-200">
              <FontAwesomeIcon icon={faCity} className="w-3 h-3" />
              {city}
            </span>
          )}

          {/* Country Badge */}
          {country && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 rounded text-xs text-gray-600 border border-gray-200">
              <GlobeAltIcon className="w-3 h-3" />
              {country}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelLocationBadge;
