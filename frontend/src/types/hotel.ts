// Hotel and search related type definitions

export interface Hotel {
    id: string;
    hid?: number; // Numeric hotel ID from RateHawk
    name: string;
    nameAr?: string; // Arabic name (set by admin)
    address: string;
    city?: string; // Optional - from Content API region.name
    country?: string; // Optional - not reliable in Content API
    price: number; // Base price WITHOUT taxes (after margin)
    currency: string;
    total_taxes?: number; // Total taxes amount (displayed separately)
    taxes_currency?: string; // Currency for taxes
    rating: number;
    star_rating?: number; // Explicit star rating from API
    image: string | null;
    images?: string[]; // Array of image URLs
    description: string;
    reviewScore: number;
    reviewCount: number;
    amenities?: string[]; // From Content API amenity_groups
    facilities?: string[]; // Legacy field, use amenities instead
    propertyClass: number;
    reviewScoreWord: string | null;
    isPreferred: boolean;
    isEnriched?: boolean; // Flag for enriched content
    checkIn: string | null;
    checkOut: string | null;
    coordinates: {
        latitude: number;
        longitude: number;
    };
    // Hotel policies
    check_in_time?: string;
    check_out_time?: string;
    metapolicy_extra_info?: string;
    metapolicy_struct?: any; // Structured policy data from ETG API
    rates?: Array<{
        match_hash: string;
        room_name: string;
        meal: string;
        price: number;
        original_price?: number;
        currency: string;
        daily_prices?: string[];
        cancellation_policies?: any;
        // Room data
        room_data?: any;
        bed_groups?: Array<{
            beds: Array<{
                type: string;
                count: number;
            }>;
        }>;
        room_size?: number;
        max_occupancy?: number;
        room_amenities?: string[];
        // Meal data
        meal_data?: {
            breakfast_included?: boolean;
            meal_type?: string;
        };
        // Booking policies
        is_free_cancellation?: boolean;
        free_cancellation_before?: string;
        requires_prepayment?: boolean;
        requires_credit_card?: boolean;
        requires_cvc?: boolean;
        payment_type?: string;
        // Tax and pricing details
        taxes?: Array<{
            name: string;
            amount: number;
            currency: string;
            included: boolean;
        }>;
        tax_data?: any;
        vat_data?: any;
        // Detailed cancellation policies
        cancellation_details?: Array<{
            start_date: string | null;
            end_date: string | null;
            penalty_amount: number;
            penalty_show_amount: number;
            currency: string;
        }>;
        amenities?: string[];
    }>;
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
