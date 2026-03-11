const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface HotelCard {
  hotelId: string;
  name: string;
  city: string;
  country: string;
  starRating: number;
  image: string | null;
  amenities: string[];
  checkInTime: string | null;
  checkOutTime: string | null;
}

export interface AIChatResponse {
  response: string;
  hotelCards: HotelCard[] | null;
}

export async function sendAIChatMessage(
  message: string,
  history: ChatMessage[]
): Promise<AIChatResponse> {
  const res = await fetch(`${API_URL}/ai-chatbot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });

  const data = await res.json();

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to get AI response');
  }

  return {
    response: data.response,
    hotelCards: data.hotelCards || null,
  };
}

export interface PriceInfo {
  price: number;
  pricePerNight: number;
  currency: string;
  nights: number;
  meal: string | null;
  free_cancellation: boolean;
}

export async function fetchHotelPrices(
  city: string,
  checkin: string,
  checkout: string,
  currency: string = 'USD',
  hotelIds: string[] = []
): Promise<{ priceMap: Record<string, PriceInfo>; nights: number; currency: string }> {
  const res = await fetch(`${API_URL}/ai-chatbot/prices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ city, checkin, checkout, currency, hotelIds }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Could not fetch prices');
  }
  return { priceMap: data.priceMap, nights: data.nights, currency: data.currency };
}

