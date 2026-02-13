const rateHawkService = require('./RateHawkService');

/**
 * Cache Warmer for Popular Destinations
 * Pre-loads search results for commonly searched destinations to reduce API calls.
 * NEW: Also persists home page hotel data to MongoDB for instant serving.
 */
class CacheWarmer {
  constructor() {
    this.popularDestinations = [
      { name: 'Mecca', regionId: 6289 },
      { name: 'Medina', regionId: 6166 },
      { name: 'Riyadh', regionId: 6254 },
      { name: 'Jeddah', regionId: 6099 },
      { name: 'Dubai', regionId: 1942 },
      { name: 'London', regionId: 2114 },
      { name: 'Paris', regionId: 2555 },
      { name: 'Istanbul', regionId: 6510 },
      { name: 'Cairo', regionId: 3714 },
      { name: 'Tokyo', regionId: 2735 }
    ];

    // Cities used for "Popular near you" (suggested section)
    this.suggestedCities = ['Makkah', 'Riyadh', 'Jeddah', 'Medina', 'Cairo', 'Dubai'];

    // Cities for "Popular 5-star hotels in Saudi Arabia"
    this.popularCities = ['Riyadh', 'Jeddah', 'Makkah'];

    // Currencies and languages to pre-cache
    this.currencies = ['SAR', 'USD'];
    this.languages = ['en', 'ar'];

    this.warmupInterval = 6 * 60 * 60 * 1000; // Warm up every 6 hours
    this.homePageInterval = 30 * 60 * 1000; // Home page cache every 30 minutes
  }

  /**
   * Get default search dates (today/tomorrow for home page, 30 days out for general)
   */
  getDefaultDates(forHomePage = false) {
    if (forHomePage) {
      const now = new Date();
      const daysOffset = now.getHours() >= 22 ? 1 : 0;
      return rateHawkService.constructor.getDefaultDates(daysOffset, 1);
    }

    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 30);
    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 3);
    const formatDate = (date) => date.toISOString().split('T')[0];
    return { checkin: formatDate(checkin), checkout: formatDate(checkout) };
  }

  /**
   * Warm up cache for a single destination (in-memory only)
   */
  async warmDestination(destination) {
    try {
      const dates = this.getDefaultDates();
      console.log(`🔥 Warming cache for ${destination.name}...`);

      await rateHawkService.searchByRegion(destination.regionId, {
        ...dates,
        adults: 2,
        children: [],
        enrichmentLimit: 20
      });

      console.log(`✅ Cache warmed for ${destination.name}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to warm cache for ${destination.name}:`, error.message);
      return false;
    }
  }

  /**
   * Warm up cache for all popular destinations with rate limiting
   */
  async warmAllDestinations() {
    console.log('🌡️  Starting cache warmup for popular destinations...');

    for (const destination of this.popularDestinations) {
      await this.warmDestination(destination);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    console.log('✅ Cache warmup completed');
  }

  /**
   * NEW: Warm the home page cache and persist to MongoDB.
   * Pre-fetches hotels for "Popular near you" and "Popular 5-star" sections.
   */
  async warmHomePage() {
    let CachedHomePage;
    try {
      CachedHomePage = require('../models/CachedHomePage');
    } catch (err) {
      console.error('❌ CachedHomePage model not available:', err.message);
      return;
    }

    console.log('🔄 Home page cache warming started...');

    const dates = this.getDefaultDates(true);
    let totalSaved = 0;

    // --- 1. Warm "Popular near you" (suggested) for each city/currency/language ---
    for (const city of this.suggestedCities) {
      for (const currency of this.currencies) {
        for (const language of this.languages) {
          try {
            const hotels = await this._fetchSuggestedHotels(city, currency, language, dates);

            if (hotels.length > 0) {
              const key = `${city}:${currency}:${language}`;
              await CachedHomePage.upsertCache('suggested', key, hotels, {
                source: 'location',
                destination: city,
                searchDates: { checkIn: dates.checkin, checkOut: dates.checkout }
              });
              totalSaved++;
              console.log(`   📦 Saved suggested cache: ${key} (${hotels.length} hotels)`);
            }

            // Rate limit protection
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.error(`   ❌ Failed suggested for ${city}/${currency}/${language}:`, error.message);
          }
        }
      }
    }

    // --- 2. Warm "Popular 5-star hotels in Saudi Arabia" ---
    for (const currency of this.currencies) {
      for (const language of this.languages) {
        try {
          const popularHotels = await this._fetchPopular5Star(currency, language, dates);

          if (popularHotels.length > 0) {
            const key = `popular:${currency}:${language}`;
            await CachedHomePage.upsertCache('popular', key, popularHotels, {
              searchDates: { checkIn: dates.checkin, checkOut: dates.checkout }
            });
            totalSaved++;
            console.log(`   📦 Saved popular cache: ${key} (${popularHotels.length} hotels)`);
          }

          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
          console.error(`   ❌ Failed popular for ${currency}/${language}:`, error.message);
        }
      }
    }

    console.log(`✅ Home page cache warming done — ${totalSaved} cache entries saved to MongoDB`);
  }

  /**
   * Fetch suggested hotels for a single city (reuses existing search logic)
   */
  async _fetchSuggestedHotels(city, currency, language, dates) {
    const suggestions = await rateHawkService.suggest(city, language);
    if (!suggestions.regions.length && !suggestions.hotels.length) return [];

    const target = suggestions.regions[0] || suggestions.hotels[0];
    const regionId = target.region_id || target.id;

    const searchResults = await rateHawkService.searchByRegion(regionId, {
      ...dates,
      adults: 2,
      currency,
      language,
      enrichmentLimit: 0,
      refreshPrices: 0,
      maxResults: 20
    });

    // Filter for enriched hotels with valid data
    const enriched = (searchResults.hotels || []).filter(h =>
      h.price && h.price > 0 &&
      h.image && !h.image.includes('placeholder') &&
      h.name && h.isEnriched !== false
    ).slice(0, 9);

    // Enrich with TripAdvisor data from DB
    return this._enrichWithTripAdvisor(enriched, city);
  }

  /**
   * Fetch popular 5-star hotels across Saudi cities
   */
  async _fetchPopular5Star(currency, language, dates) {
    const allHotels = [];

    for (const city of this.popularCities) {
      try {
        const suggestions = await rateHawkService.suggest(city, language);
        if (!suggestions.regions.length && !suggestions.hotels.length) continue;

        const target = suggestions.regions[0] || suggestions.hotels[0];
        const regionId = target.region_id || target.id;

        const searchResults = await rateHawkService.searchByRegion(regionId, {
          ...dates,
          adults: 2,
          currency,
          language,
          enrichmentLimit: 0,
          refreshPrices: 0,
          maxResults: 25
        });

        const enriched = (searchResults.hotels || []).filter(h =>
          h.price && h.price > 0 &&
          h.image && !h.image.includes('placeholder') &&
          h.name && h.isEnriched !== false
        );

        allHotels.push(...enriched);

        // Rate limit between cities
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`   ❌ Popular 5-star fetch error for ${city}:`, error.message);
      }
    }

    // Filter for 5-star, sort, limit
    const popularHotels = allHotels
      .filter(h => h.star_rating && h.star_rating >= 5)
      .sort((a, b) => {
        const ratingDiff = (b.star_rating || 0) - (a.star_rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        return (a.price || 0) - (b.price || 0);
      })
      .slice(0, 15);

    // Enrich with TripAdvisor
    return this._enrichWithTripAdvisor(popularHotels);
  }

  /**
   * Enrich hotels with TripAdvisor data from the DB
   */
  async _enrichWithTripAdvisor(hotels, defaultCity = 'Saudi Arabia') {
    try {
      const TripAdvisorHotel = require('../models/TripAdvisorHotel');

      const hotelsByCity = {};
      hotels.forEach(h => {
        const city = h.city || defaultCity;
        if (!hotelsByCity[city]) hotelsByCity[city] = [];
        hotelsByCity[city].push(h);
      });

      for (const [city, cityHotels] of Object.entries(hotelsByCity)) {
        const names = cityHotels.map(h => h.name);
        const taResults = await TripAdvisorHotel.findByNamesAndCity(names, city);

        const taMap = {};
        taResults.forEach(ta => {
          taMap[ta.name_normalized] = ta;
          if (ta.search_names) {
            ta.search_names.forEach(alias => { taMap[alias] = ta; });
          }
        });

        cityHotels.forEach(h => {
          const nameNorm = h.name.toLowerCase().trim();
          const ta = taMap[nameNorm];
          if (ta) {
            h.tripadvisor_rating = ta.rating;
            h.tripadvisor_num_reviews = ta.num_reviews;
            h.tripadvisor_location_id = ta.location_id;
          }
        });
      }
    } catch (taError) {
      console.error('   ⚠️ TripAdvisor enrichment error (non-fatal):', taError.message);
    }

    return hotels;
  }

  /**
   * Start periodic cache warming
   */
  startPeriodicWarmup() {
    // Initial warmup after 30 seconds (give server time to start)
    setTimeout(() => {
      this.warmAllDestinations();
    }, 30000);

    // Periodic warmup for general destinations
    setInterval(() => {
      this.warmAllDestinations();
    }, this.warmupInterval);

    console.log(`🌡️  Cache warmer scheduled (every ${this.warmupInterval / 1000 / 60 / 60} hours)`);
  }

  /**
   * Start periodic home page cache warming (MongoDB-backed)
   */
  startHomePageWarmup() {
    // Initial warmup after 45 seconds (give DB time to connect)
    setTimeout(() => {
      this.warmHomePage().catch(err => {
        console.error('❌ Home page warmup error:', err.message);
      });
    }, 45000);

    // Periodic warmup every 30 minutes
    setInterval(() => {
      this.warmHomePage().catch(err => {
        console.error('❌ Home page warmup error:', err.message);
      });
    }, this.homePageInterval);

    console.log(`🏠 Home page cache warmer scheduled (every ${this.homePageInterval / 1000 / 60} minutes)`);
  }

  /**
   * Warm cache for specific dates (useful for upcoming holidays/events)
   */
  async warmSpecificDates(destination, checkin, checkout) {
    try {
      console.log(`🔥 Warming cache for ${destination.name} (${checkin} to ${checkout})...`);

      await rateHawkService.searchByRegion(destination.regionId, {
        checkin,
        checkout,
        adults: 2,
        children: [],
        enrichmentLimit: 20
      });

      console.log(`✅ Cache warmed for ${destination.name}`);
    } catch (error) {
      console.error(`❌ Failed to warm cache:`, error.message);
    }
  }
}

module.exports = new CacheWarmer();
