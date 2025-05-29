// Hotel and search related type definitions

export interface Hotel {
  id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  price: number;
  currency: string;
  rating: number;
  image: string | null;
  description: string;
  reviewScore: number;
  reviewCount: number;
  facilities: string[];
  propertyClass: number;
  reviewScoreWord: string | null;
  isPreferred: boolean;
  checkIn: string | null;
  checkOut: string | null;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface HotelSearchResponse {
  hotels: Hotel[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  destinationsSearched: number;
  totalDestinationsFound: number;
}

export interface PopularDestination {
  id: string;
  name: string;
  label: string;
  country: string;
  image: string;
  hotels: number;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  dest_type: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}
