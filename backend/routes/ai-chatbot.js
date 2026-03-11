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
- ONLY mention hotel names that appear in the "Relevant Data" section above. NEVER invent, guess, or recall hotel names from your training data.
- If no hotels are listed in the data, say "please search on our website" instead of guessing names.
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
// Includes informal spellings (without ال, ه instead of ة, etc.)
const ARABIC_CITY_MAP = {
  // Egypt
  'القاهرة': 'cairo', 'القاهره': 'cairo', 'قاهرة': 'cairo', 'قاهره': 'cairo', 'مصر': 'cairo',
  'الإسكندرية': 'alexandria', 'الاسكندرية': 'alexandria', 'اسكندريه': 'alexandria', 'اسكندرية': 'alexandria',
  'الغردقة': 'hurghada', 'الغردقه': 'hurghada', 'غردقة': 'hurghada', 'غردقه': 'hurghada',
  'شرم الشيخ': 'sharm el sheikh', 'شرم': 'sharm el sheikh',
  'الأقصر': 'luxor', 'الاقصر': 'luxor', 'اقصر': 'luxor', 'لوكسور': 'luxor',
  'أسوان': 'aswan', 'اسوان': 'aswan',
  // Saudi Arabia
  'الرياض': 'riyadh', 'رياض': 'riyadh',
  'جدة': 'jeddah', 'جده': 'jeddah',
  'مكة': 'mecca', 'مكه': 'mecca', 'مكة المكرمة': 'mecca', 'مكه المكرمه': 'mecca',
  'المدينة': 'medina', 'المدينه': 'medina', 'المدينة المنورة': 'medina', 'المدينه المنوره': 'medina',
  'الدمام': 'dammam', 'دمام': 'dammam',
  'الطائف': 'taif', 'طائف': 'taif', 'الطايف': 'taif',
  'أبها': 'abha', 'ابها': 'abha',
  'تبوك': 'tabuk',
  'ينبع': 'yanbu',
  'الخبر': 'khobar', 'خبر': 'khobar',
  // Gulf
  'دبي': 'dubai',
  'أبوظبي': 'abu dhabi', 'ابوظبي': 'abu dhabi', 'ابو ظبي': 'abu dhabi',
  'الكويت': 'kuwait city', 'كويت': 'kuwait city',
  'الدوحة': 'doha', 'الدوحه': 'doha', 'دوحة': 'doha', 'دوحه': 'doha',
  'المنامة': 'manama', 'المنامه': 'manama', 'منامة': 'manama', 'منامه': 'manama',
  'مسقط': 'muscat',
  // Levant
  'بيروت': 'beirut',
  'عمّان': 'amman', 'عمان': 'amman',
  // Other
  'تونس': 'tunis',
  'مراكش': 'marrakech',
  'إسطنبول': 'istanbul', 'اسطنبول': 'istanbul',
  'لندن': 'london',
  'باريس': 'paris',
  'نيويورك': 'new york',
};

// Extract city name from message (English or Arabic)
function extractCityFromMessage(message) {
  const lower = message.toLowerCase();

  // Check Arabic city names (check longer keys first to avoid partial matches)
  const sortedEntries = Object.entries(ARABIC_CITY_MAP).sort((a, b) => b[0].length - a[0].length);
  for (const [arabic, english] of sortedEntries) {
    if (message.includes(arabic)) return english;
  }

  // Common English city patterns
  const englishCities = [
    'cairo', 'dubai', 'riyadh', 'jeddah', 'mecca', 'medina',
    'alexandria', 'abu dhabi', 'kuwait', 'beirut', 'amman',
    'muscat', 'doha', 'manama', 'tunis', 'marrakech', 'istanbul',
    'london', 'paris', 'new york', 'tokyo', 'bangkok', 'hong kong',
    'sharm el sheikh', 'hurghada', 'luxor', 'aswan', 'tabuk',
    'dammam', 'taif', 'abha', 'khobar', 'yanbu'
  ];
  for (const city of englishCities) {
    if (lower.includes(city)) return city;
  }

  return null;
}

// Extract hotel name keywords from user message
// Recognizes patterns like: "Sofitel Mecca", "فندق هيلتون", "Hilton hotel", etc.
function extractHotelNameFromMessage(message) {
  const lower = message.toLowerCase();

  // Known hotel brand names — match these FIRST (highest priority, most reliable)
  const hotelBrands = [
    'hilton', 'marriott', 'sheraton', 'sofitel', 'novotel', 'ibis',
    'hyatt', 'radisson', 'movenpick', 'mövenpick', 'four seasons',
    'ritz carlton', 'ritz-carlton', 'intercontinental', 'crowne plaza',
    'holiday inn', 'le meridien', 'westin', 'w hotel', 'conrad',
    'fairmont', 'kempinski', 'swissotel', 'pullman', 'raffles',
    'rotana', 'millennium', 'jumeirah', 'anantara', 'shangri-la',
    'هيلتون', 'ماريوت', 'شيراتون', 'سوفيتيل', 'نوفوتيل',
    'حياة', 'حياط', 'راديسون', 'موفنبيك', 'فور سيزونز',
    'ريتز كارلتون', 'كراون بلازا', 'هوليداي إن', 'ويستن',
    'كونراد', 'فيرمونت', 'كمبينسكي', 'روتانا', 'ميلينيوم',
    'جميرا', 'شانغريلا', 'رافلز', 'بولمان', 'دار التوحيد'
  ];
  for (const brand of hotelBrands) {
    if (lower.includes(brand) || message.includes(brand)) {
      return brand;
    }
  }

  // Arabic hotel name patterns: "فندق X" — but ONLY if X is a proper name, not "في مدينة"
  const arabicHotelMatch = message.match(/فندق\s+([^\s,،.؟?]+(?:\s+[^\s,،.؟?]+)*?)(?:\s+في|\s+ب|\s+عايز|\s+اريد|\s+ابي|\s*[,،.؟?]|$)/i);
  if (arabicHotelMatch && arabicHotelMatch[1]) {
    const candidate = arabicHotelMatch[1].trim();
    // Reject if candidate is just a city name, a common word, or starts with في/ب
    const rejectWords = ['في', 'ب', 'من', 'احسن', 'أحسن', 'كويس', 'حلو', 'رخيص', 'غالي', 'قريب', 'جديد'];
    const isCity = extractCityFromMessage(candidate) !== null;
    const isRejectWord = rejectWords.some(w => candidate.startsWith(w));
    if (!isCity && !isRejectWord && candidate.length > 2) {
      return candidate;
    }
  }

  // English hotel name patterns
  const englishHotelPatterns = [
    /(?:hotel|hotels)\s+(.+?)(?:\s+in\s|\s+at\s|\s*[,?.!]|$)/i,
    /(.+?)\s+(?:hotel|resort|inn|suites?)(?:\s+in\s|\s*[,?.!]|$)/i,
  ];
  for (const pattern of englishHotelPatterns) {
    const match = lower.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      const candidate = match[1].trim();
      if (['the', 'a', 'best', 'good', 'cheap', 'nice', 'any', 'suggest', 'recommend'].includes(candidate)) continue;
      return candidate;
    }
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
    const hotelName = extractHotelNameFromMessage(message);
    const lower = message.toLowerCase();

    // 1. If user mentions a specific hotel name, search by name
    if (hotelName) {
      // Build a regex to search hotel name (case-insensitive, partial match)
      const escapedName = hotelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameQuery = { name: { $regex: escapedName, $options: 'i' } };

      // If city is also mentioned, narrow by city too
      if (city) {
        nameQuery.cityNormalized = city.toLowerCase().trim();
      }

      const matchedHotels = await HotelContent.find(
        nameQuery,
        'name city country starRating amenities checkInTime checkOutTime'
      ).limit(10).lean().catch(() => []);

      // Also try Arabic name field
      if (matchedHotels.length === 0) {
        const arMatched = await HotelContent.find(
          { nameAr: { $regex: escapedName, $options: 'i' }, ...(city ? { cityNormalized: city.toLowerCase().trim() } : {}) },
          'name nameAr city country starRating amenities checkInTime checkOutTime'
        ).limit(10).lean().catch(() => []);
        matchedHotels.push(...arMatched);
      }

      if (matchedHotels.length > 0) {
        const hotelList = matchedHotels.map(h =>
          `${h.name} — ${h.starRating || '?'}★, ${h.city || 'Unknown City'}, ${h.country || ''}${h.checkInTime ? `, Check-in: ${h.checkInTime}` : ''}`
        ).join('\n');
        contextParts.push(`Hotels matching "${hotelName}" in our database:\n${hotelList}`);
      } else {
        contextParts.push(`We could not find a hotel named "${hotelName}" in our database. The customer should try searching on our website for the most up-to-date availability.`);
      }
    }

    // 2. If user mentions a city, fetch hotels in that city
    if (city) {
      const cityNormalized = city.toLowerCase().trim();

      // Get city stats
      const cityStats = await CityStats.findOne({ cityNormalized }).lean().catch(() => null);
      if (cityStats) {
        contextParts.push(`We have hotels available in ${cityStats.cityDisplay}, ${cityStats.country}.`);
      }

      // Get real hotels in that city (more samples = less hallucination)
      const hotels = await HotelContent.find(
        { cityNormalized },
        'name starRating'
      ).sort({ starRating: -1 }).limit(20).lean().catch(() => []);

      if (hotels.length > 0) {
        const hotelList = hotels.map(h => `${h.name} (${h.starRating || '?'}★)`).join(', ');
        contextParts.push(`Real hotels we have in ${city}: ${hotelList}`);
        contextParts.push(`IMPORTANT: Only mention hotels from this list. Do NOT invent or guess hotel names.`);
      }
    }

    // 3. If user asks about destinations/cities in general
    const destinationKeywords = ['destination', 'city', 'cities', 'where', 'country', 'countries', 'available', 'offer', 'وجهة', 'مدن', 'دول', 'متاح', 'نوفر'];
    if (!city && !hotelName && destinationKeywords.some(k => lower.includes(k))) {
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

    // 4. If user asks about amenities or specific hotel features
    const amenityKeywords = ['pool', 'wifi', 'gym', 'spa', 'breakfast', 'parking', 'حمام سباحة', 'إنترنت', 'مسبح'];
    if (amenityKeywords.some(k => lower.includes(k))) {
      contextParts.push('Many of our hotels include amenities like free WiFi, swimming pools, gyms, spas, and breakfast options. Filter by amenity on our search page for exact matches.');
    }

    return contextParts.length > 0 ? contextParts.join('\n\n') : null;
  } catch (err) {
    console.error('Context fetch error (non-fatal):', err.message);
    return null;
  }
}


// Fetch hotel cards for visual display (separate from context text)
// Now intelligently matches by hotel name first, falls back to city
// Detects "show more" intent and excludes already-shown hotels
async function fetchHotelCards(message, shownHotelIds = []) {
  try {
    const HotelContent = require('../models/HotelContent');
    const city = extractCityFromMessage(message);
    const hotelName = extractHotelNameFromMessage(message);

    // Detect "show more" intent — user wants different hotels
    const moreKeywords = ['more', 'other', 'else', 'different', 'another',
      'تاني', 'تانيه', 'تانية', 'غيرها', 'غيرهم', 'كمان', 'زيادة', 'زياده',
      'اخرى', 'أخرى', 'ثاني', 'ثانيه', 'ثانية', 'المزيد', 'بعد'];
    const isMoreRequest = moreKeywords.some(k => message.toLowerCase().includes(k) || message.includes(k));

    // Build exclusion filter for already-shown hotels
    const excludeFilter = shownHotelIds.length > 0
      ? { hotelId: { $nin: shownHotelIds } }
      : {};

    let hotels = [];

    // Priority 1: If user asked about a specific hotel, show THAT hotel
    if (hotelName && !isMoreRequest) {
      const escapedName = hotelName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const nameQuery = { name: { $regex: escapedName, $options: 'i' }, ...excludeFilter };
      if (city) nameQuery.cityNormalized = city.toLowerCase().trim();

      hotels = await HotelContent.find(
        nameQuery,
        'hotelId name city country starRating mainImage amenities checkInTime checkOutTime'
      ).limit(6).lean().catch(() => []);

      // Also try Arabic name
      if (hotels.length === 0) {
        hotels = await HotelContent.find(
          { nameAr: { $regex: escapedName, $options: 'i' }, ...excludeFilter, ...(city ? { cityNormalized: city.toLowerCase().trim() } : {}) },
          'hotelId name city country starRating mainImage amenities checkInTime checkOutTime'
        ).limit(6).lean().catch(() => []);
      }
    }

    // Priority 2: Top hotels in the city (skip already shown if "more" request)
    if (hotels.length === 0 && city) {
      const cityNormalized = city.toLowerCase().trim();
      const skipCount = isMoreRequest && shownHotelIds.length === 0 ? 6 : 0;
      hotels = await HotelContent.find(
        { cityNormalized, ...excludeFilter },
        'hotelId name city country starRating mainImage amenities checkInTime checkOutTime'
      ).sort({ starRating: -1 }).skip(skipCount).limit(6).lean().catch(() => []);
    }

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

    const { message, history = [], shownHotelIds = [] } = req.body;

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
    const city = extractCityFromMessage(message);
    const hotelName = extractHotelNameFromMessage(message);
    console.log(`🤖 AI Chat: "${message}" → city=${city}, hotelName=${hotelName}, shownIds=${shownHotelIds.length}`);

    const [contextData, hotelCards] = await Promise.all([
      fetchRelevantContext(message),
      fetchHotelCards(message, shownHotelIds),
    ]);
    console.log(`   📋 Context length: ${contextData?.length || 0}, Hotel cards: ${hotelCards?.length || 0}`);

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
