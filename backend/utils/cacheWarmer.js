const rateHawkService = require('./RateHawkService');

/**
 * Cache Warmer for Popular Destinations
 * Pre-loads search results for commonly searched destinations to reduce API calls
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

    this.warmupInterval = 6 * 60 * 60 * 1000; // Warm up every 6 hours
  }

  /**
   * Get default search dates (30 days from now, 3 night stay)
   */
  getDefaultDates() {
    const checkin = new Date();
    checkin.setDate(checkin.getDate() + 30);

    const checkout = new Date(checkin);
    checkout.setDate(checkout.getDate() + 3);

    const formatDate = (date) => date.toISOString().split('T')[0];

    return {
      checkin: formatDate(checkin),
      checkout: formatDate(checkout)
    };
  }

  /**
   * Warm up cache for a single destination
   */
  async warmDestination(destination) {
    try {
      const dates = this.getDefaultDates();
      console.log(`🔥 Warming cache for ${destination.name}...`);

      await rateHawkService.searchByRegion(destination.regionId, {
        ...dates,
        adults: 2,
        children: [],
        enrichmentLimit: 20 // Limit to reduce API calls during warmup
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
      // Add delay between warmup requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
    }

    console.log('✅ Cache warmup completed');
  }

  /**
   * Start periodic cache warming
   */
  startPeriodicWarmup() {
    // Initial warmup after 30 seconds (give server time to start)
    setTimeout(() => {
      this.warmAllDestinations();
    }, 30000);

    // Periodic warmup
    setInterval(() => {
      this.warmAllDestinations();
    }, this.warmupInterval);

    console.log(`🌡️  Cache warmer scheduled (every ${this.warmupInterval / 1000 / 60 / 60} hours)`);
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
