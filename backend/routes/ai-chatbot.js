const express = require('express');
const router = express.Router();
const { Groq } = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
// Simple in-memory rate limiting per IP
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 15; // 15 requests per minute per IP

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// Build a system prompt with GaithTours context
function buildSystemPrompt(contextData) {
  return `You are GaithBot, the friendly AI assistant for Gaith Tours — a professional travel agency specializing in hotel bookings worldwide, with a focus on the Middle East and top global destinations.

## Your Role
- Help customers find hotels, understand pricing, and make booking decisions
- Answer questions about destinations, amenities, and travel tips
- Guide users through the booking process on the website
- Be helpful, friendly, and professional
- If asked in Arabic, respond in Arabic. If asked in English, respond in English.

## About Gaith Tours
- We offer hotel bookings worldwide through our platform
- Competitive pricing with best price guarantee
- Support for multiple currencies and payment methods (credit card, Kashier)
- Customer support available via chat
- Loyalty program for frequent travelers
- Promo codes and special deals available

## Booking Process
1. Search for your destination and dates on our website
2. Browse available hotels and compare rooms
3. Select your room and fill in guest information
4. Complete payment (card or other methods)
5. Receive confirmation email instantly

## Relevant Data from Our System
${contextData || 'No specific hotel data retrieved for this query.'}

## Important Rules
- Do NOT make up specific prices or hotel names that aren't in the provided data
- If you don't have specific information, suggest the customer use the search on our website or contact human support
- Keep responses concise and helpful (2-4 sentences usually)
- Never share internal system details or API keys

## CRITICAL FORMATTING RULES — YOU MUST FOLLOW THESE
- NEVER use markdown formatting: no **bold**, no *italic*, no ## headers, no numbered lists (1. 2. 3.)
- NEVER use asterisks (*) around words
- NEVER mention specific hotel counts or numbers (e.g. do not say "25,987 hotels" or "13,981 options") — just name the city naturally
- When listing cities or items, use a natural comma-separated sentence like: "We offer hotels in Cairo, Dubai, London, Paris and more."
- Write in plain conversational prose only — like a friendly human chat agent
- Do NOT exceed 3-4 sentences per response`;
}

// Map Arabic city names to English for DB lookup
const ARABIC_CITY_MAP = {
  'القاهرة': 'cairo',
  'دبي': 'dubai',
  'الرياض': 'riyadh',
  'جدة': 'jeddah',
  'مكة': 'mecca',
  'المدينة': 'medina',
  'الإسكندرية': 'alexandria',
  'أبوظبي': 'abu dhabi',
  'الكويت': 'kuwait city',
  'بيروت': 'beirut',
  'عمّان': 'amman',
  'مسقط': 'muscat',
  'الدوحة': 'doha',
  'المنامة': 'manama',
  'تونس': 'tunis',
  'مراكش': 'marrakech',
  'إسطنبول': 'istanbul',
  'لندن': 'london',
  'باريس': 'paris',
  'نيويورك': 'new york',
};

// Extract city name from message (English or Arabic)
function extractCityFromMessage(message) {
  const lower = message.toLowerCase();

  // Check Arabic city names
  for (const [arabic, english] of Object.entries(ARABIC_CITY_MAP)) {
    if (message.includes(arabic)) return english;
  }

  // Common English city patterns
  const englishCities = [
    'cairo', 'dubai', 'riyadh', 'jeddah', 'mecca', 'medina',
    'alexandria', 'abu dhabi', 'kuwait', 'beirut', 'amman',
    'muscat', 'doha', 'manama', 'tunis', 'marrakech', 'istanbul',
    'london', 'paris', 'new york', 'tokyo', 'bangkok', 'hong kong'
  ];
  for (const city of englishCities) {
    if (lower.includes(city)) return city;
  }

  return null;
}

// Fetch relevant context from MongoDB based on user message
async function fetchRelevantContext(message) {
  try {
    const HotelContent = require('../models/HotelContent');
    const CityStats = require('../models/CityStats');

    const contextParts = [];
    const city = extractCityFromMessage(message);
    const lower = message.toLowerCase();

    // 1. If user mentions a specific city, fetch hotels in that city
    if (city) {
      const cityNormalized = city.toLowerCase().trim();

      // Get city stats (total hotel count)
      const cityStats = await CityStats.findOne({ cityNormalized }).lean().catch(() => null);
      if (cityStats) {
        contextParts.push(`Hotels available in ${cityStats.cityDisplay}, ${cityStats.country}.`);
      }

      // Get sample hotels in that city
      const hotels = await HotelContent.find(
        { cityNormalized },
        'name starRating checkInTime checkOutTime amenities'
      ).sort({ starRating: -1 }).limit(5).lean().catch(() => []);

      if (hotels.length > 0) {
        const hotelList = hotels.map(h =>
          `${h.name} (${h.starRating || '?'}★)${h.checkInTime ? `, Check-in: ${h.checkInTime}` : ''}`
        ).join('; ');
        contextParts.push(`Sample hotels in ${city}: ${hotelList}`);
      }
    }

    // 2. If user asks about destinations/cities in general
    const destinationKeywords = ['destination', 'city', 'cities', 'where', 'country', 'countries', 'available', 'offer', 'وجهة', 'مدن', 'دول', 'متاح', 'نوفر'];
    if (!city && destinationKeywords.some(k => lower.includes(k))) {
      const topCities = await CityStats.find({}, 'cityDisplay country totalHotels')
        .sort({ totalHotels: -1 })
        .limit(12)
        .lean()
        .catch(() => []);

      if (topCities.length > 0) {
        const cityList = topCities.map(c => `${c.cityDisplay} (${c.country})`).join(', ');
        contextParts.push(`Our top destinations: ${cityList}`);
      }
    }

    // 3. If user asks about amenities or specific hotel features
    const amenityKeywords = ['pool', 'wifi', 'gym', 'spa', 'breakfast', 'parking', 'حمام سباحة', 'إنترنت', 'مسبح'];
    if (amenityKeywords.some(k => lower.includes(k))) {
      contextParts.push('Many of our hotels include amenities like free WiFi, swimming pools, gyms, spas, and breakfast options. Filter by amenity on our search page for exact matches.');
    }

    return contextParts.length > 0 ? contextParts.join('\n') : null;
  } catch (err) {
    console.error('Context fetch error (non-fatal):', err.message);
    return null;
  }
}


// Fetch hotel cards for visual display (separate from context text)
async function fetchHotelCards(message) {
  try {
    const HotelContent = require('../models/HotelContent');
    const city = extractCityFromMessage(message);
    if (!city) return null;

    const cityNormalized = city.toLowerCase().trim();
    const hotels = await HotelContent.find(
      { cityNormalized },
      'hotelId name city country starRating mainImage amenities checkInTime checkOutTime'
    ).sort({ starRating: -1 }).limit(6).lean().catch(() => []);

    if (!hotels.length) return null;

    return hotels.map(h => ({
      hotelId: h.hotelId || String(h._id),
      name: h.name,
      city: h.city,
      country: h.country,
      starRating: h.starRating || 0,
      image: h.mainImage ? h.mainImage.replace('{size}', '640x400') : null,
      amenities: (h.amenities || []).slice(0, 4),
      checkInTime: h.checkInTime || null,
      checkOutTime: h.checkOutTime || null,
    }));
  } catch (err) {
    return null;
  }
}

// POST /api/ai-chatbot/chat
router.post('/chat', async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Rate limit check
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please wait a moment before sending another message.'
      });
    }

    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        message: 'Message is too long (max 1000 characters)'
      });
    }

    // Fetch context text + hotel cards in parallel
    const [contextData, hotelCards] = await Promise.all([
      fetchRelevantContext(message),
      fetchHotelCards(message),
    ]);

    const systemPrompt = buildSystemPrompt(contextData);

    // Build conversation history for Groq format
    const formattedHistory = (history || [])
      .slice(-10)
      .filter(h => h.role && h.content)
      .map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      }));

    // Send message and get response
    const result = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        ...formattedHistory,
        { role: 'user', content: message.trim() }
      ],
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.7,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
    });
    
    const responseText = result.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    res.json({
      success: true,
      response: responseText,
      // Hotel cards for visual display (null if not a hotel query)
      hotelCards: hotelCards || null,
    });

  } catch (error) {
    console.error('AI Chatbot error:', error);
    
    if (error.message?.includes('API_KEY_INVALID') || error.message?.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact support.'
      });
    }

    if (error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('quota') || error.status === 429) {
      return res.status(503).json({
        success: false,
        message: 'Our AI assistant has reached its daily limit. Please try again later or contact our human support via the chat button on the right. 🙏'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Sorry, I couldn\'t process your request. Please try again.'
    });
  }
});

// POST /api/ai-chatbot/prices
// Fetches real prices from RateHawk for hotel cards displayed in chat
router.post('/prices', async (req, res) => {
  try {
    const { city, checkin, checkout, currency = 'USD', hotelIds = [] } = req.body;

    if (!city || !checkin || !checkout) {
      return res.status(400).json({ success: false, message: 'city, checkin, and checkout are required' });
    }

    // Validate dates
    const checkinDate = new Date(checkin);
    const checkoutDate = new Date(checkout);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkinDate) || isNaN(checkoutDate)) {
      return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    if (checkinDate < today) {
      return res.status(400).json({ success: false, message: 'Check-in date cannot be in the past' });
    }
    if (checkoutDate <= checkinDate) {
      return res.status(400).json({ success: false, message: 'Check-out must be after check-in' });
    }

    const rateHawk = require('../utils/RateHawkService');

    // Step 1: Get region_id from city name via suggest API
    console.log(`🤖 Chatbot price search: ${city} (${checkin} → ${checkout})`);
    const suggestions = await rateHawk.suggest(city, 'en');
    const region = suggestions?.regions?.[0];

    if (!region) {
      return res.status(404).json({ success: false, message: `No region found for "${city}"` });
    }

    const regionId = region.id;
    console.log(`   ✅ Region: ${region.name} (ID: ${regionId})`);

    // Step 2: Search for hotels with prices
    // Don't trim results — we need to find specific hotelIds from the chatbot cards
    const nights = Math.round((checkoutDate - checkinDate) / (1000 * 60 * 60 * 24));
    const results = await rateHawk.searchByRegion(regionId, {
      checkin,
      checkout,
      adults: 2,
      children: [],
      rooms: 1,
      residency: 'gb',
      language: 'en',
      currency,
      maxResults: 0, // 0 = no trim, get all results
      enrichmentLimit: 0,
    });

    // Step 3: Build price map — filter to only the hotelIds we were asked about
    const requestedIds = new Set(hotelIds);
    const priceMap = {};
    for (const hotel of (results?.hotels || [])) {
      // Match by hotelId string, or include all if no filter provided
      const matchesFilter = requestedIds.size === 0 || requestedIds.has(hotel.hotelId);
      if (matchesFilter && hotel.hotelId && hotel.price > 0) {
        priceMap[hotel.hotelId] = {
          price: hotel.price,
          pricePerNight: hotel.pricePerNight || Math.round(hotel.price / nights),
          currency: hotel.currency || currency,
          nights,
          meal: hotel.meal || null,
          free_cancellation: hotel.free_cancellation || false,
        };
      }
    }

    console.log(`   ✅ Got prices for ${Object.keys(priceMap).length} hotels`);

    res.json({
      success: true,
      priceMap,
      regionName: region.name,
      nights,
      currency,
    });

  } catch (error) {
    console.error('AI Chatbot prices error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Could not fetch prices. Please try searching on our website.'
    });
  }
});

module.exports = router;
