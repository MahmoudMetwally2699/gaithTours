import api from './api';

export interface PriceAlert {
    _id: string;
    userId: string;
    hotelId: string;
    hotelName: string;
    hotelImage?: string;
    destination: string;
    checkIn: string;
    checkOut: string;
    adults: number;
    children: number;
    targetPrice?: number;
    initialPrice: number;
    currentPrice: number;
    lowestPrice: number;
    currency: string;
    notifyVia: string[];
    isActive: boolean;
    lastChecked?: string;
    lastNotified?: string;
    priceHistory: { price: number; date: string }[];
    createdAt: string;
    updatedAt: string;
}

export interface CreatePriceAlertData {
    hotelId: string;
    hotelName: string;
    hotelImage?: string;
    destination: string;
    checkIn: string;
    checkOut: string;
    adults?: number;
    children?: number;
    targetPrice?: number;
    currentPrice: number;
    currency?: string;
}

export interface PriceAlertCheckResponse {
    isWatching: boolean;
    data?: PriceAlert;
}

// Get all active price alerts for the current user
export const getPriceAlerts = async (): Promise<PriceAlert[]> => {
    const response = await api.get('/price-alerts');
    return response.data.data;
};

// Get all price alerts including inactive ones
export const getAllPriceAlerts = async (): Promise<PriceAlert[]> => {
    const response = await api.get('/price-alerts/all');
    return response.data.data;
};

// Create a new price alert
export const createPriceAlert = async (data: CreatePriceAlertData): Promise<PriceAlert> => {
    const response = await api.post('/price-alerts', data);
    return response.data.data;
};

// Update a price alert
export const updatePriceAlert = async (
    id: string,
    data: { targetPrice?: number; notifyVia?: string[]; isActive?: boolean }
): Promise<PriceAlert> => {
    const response = await api.patch(`/price-alerts/${id}`, data);
    return response.data.data;
};

// Delete (deactivate) a price alert
export const deletePriceAlert = async (id: string): Promise<void> => {
    await api.delete(`/price-alerts/${id}`);
};

// Check if user is watching a specific hotel
export const checkPriceAlert = async (
    hotelId: string,
    checkIn?: string,
    checkOut?: string
): Promise<PriceAlertCheckResponse> => {
    const params = new URLSearchParams();
    if (checkIn) params.append('checkIn', checkIn);
    if (checkOut) params.append('checkOut', checkOut);

    const queryString = params.toString();
    const url = `/price-alerts/check/${hotelId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get(url);
    return {
        isWatching: response.data.isWatching,
        data: response.data.data
    };
};
