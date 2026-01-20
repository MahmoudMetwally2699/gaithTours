const MarginRule = require('../models/MarginRule');

class MarginService {
  // In-memory rule cache for performance (avoids DB query on every request)
  static cachedRules = null;
  static cacheTimestamp = 0;
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached active margin rules, fetching from DB only if cache expired
   * @returns {Promise<Array>} - Array of active margin rules sorted by priority
   */
  static async getCachedRules() {
    const now = Date.now();
    if (this.cachedRules && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.cachedRules;
    }
    console.log('💰 Refreshing margin rules cache...');
    this.cachedRules = await MarginRule.find({ status: 'active' }).sort({ priority: -1 }).lean();
    this.cacheTimestamp = now;
    console.log(`✅ Cached ${this.cachedRules.length} active margin rules`);
    return this.cachedRules;
  }

  /**
   * Invalidate the cached rules (call after create/update/delete operations)
   */
  static invalidateCache() {
    console.log('🗑️  Invalidating margin rules cache...');
    this.cachedRules = null;
    this.cacheTimestamp = 0;
  }

  /**
   * Get the applicable margin for a booking context
   * Returns the highest priority matching rule or default margin
   */
  static async getApplicableMargin(bookingContext) {
    try {
      // Use cached rules for performance
      const allRules = await this.getCachedRules();
      const matchingRules = allRules.filter(rule => this.matchesRule(rule, bookingContext));

      if (matchingRules.length === 0) {
        // Return default margin if no rules match
        return {
          rule: null,
          marginType: 'percentage',
          marginValue: 15, // Default 15% margin
          isDefault: true
        };
      }

      // Return highest priority rule (already sorted by priority desc)
      const topRule = matchingRules[0];
      return {
        rule: topRule,
        marginType: topRule.type,
        marginValue: topRule.type === 'fixed' ? topRule.fixedAmount : topRule.value,
        isDefault: false
      };
    } catch (error) {
      console.error('Error getting applicable margin:', error);
      // Return default on error
      return {
        rule: null,
        marginType: 'percentage',
        marginValue: 15,
        isDefault: true,
        error: error.message
      };
    }
  }

  /**
   * Apply margin to a base price
   */
  static applyMargin(basePrice, marginInfo) {
    const { marginType, marginValue, rule } = marginInfo;

    // Ensure basePrice is a number (in case it's passed as a string)
    basePrice = parseFloat(basePrice) || 0;

    let marginAmount = 0;
    let finalPrice = basePrice;

    switch (marginType) {
      case 'percentage':
        marginAmount = basePrice * (marginValue / 100);
        break;
      case 'fixed':
        marginAmount = marginValue;
        break;
      case 'hybrid':
        const percentageMargin = basePrice * (marginValue / 100);
        const fixedMargin = rule?.fixedAmount || marginValue;
        marginAmount = Math.max(percentageMargin, fixedMargin);
        break;
      default:
        marginAmount = basePrice * 0.15; // Default 15%
    }

    finalPrice = basePrice + marginAmount;

    const result = {
      basePrice: Math.round(basePrice * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      finalPrice: Math.round(finalPrice * 100) / 100,
      marginPercentage: basePrice > 0 ? Math.round((marginAmount / basePrice) * 100 * 100) / 100 : 0
    };

    return result;
  }

  /**
   * Calculate price with margin for hotel search results
   */
  static async calculatePriceWithMargin(hotel, bookingContext) {
    const marginInfo = await this.getApplicableMargin({
      country: hotel.country || bookingContext.country,
      city: hotel.city || bookingContext.city,
      starRating: hotel.star_rating || hotel.propertyClass || 3,
      bookingValue: hotel.price || 0,
      checkInDate: bookingContext.checkInDate,
      mealType: hotel.meal || 'room_only',
      customerType: bookingContext.customerType || 'b2c'
    });

    const priceResult = this.applyMargin(hotel.price, marginInfo);

    // Track rule usage
    if (marginInfo.rule) {
      await MarginRule.findByIdAndUpdate(marginInfo.rule._id, {
        $inc: { appliedCount: 1, totalRevenueGenerated: priceResult.marginAmount }
      });
    }

    return {
      ...priceResult,
      appliedRule: marginInfo.rule ? {
        id: marginInfo.rule._id,
        name: marginInfo.rule.name,
        type: marginInfo.rule.type
      } : null,
      isDefaultMargin: marginInfo.isDefault
    };
  }

  /**
   * Check if a rule matches the given context
   */
  static matchesRule(rule, context) {
    const c = rule.conditions;
    if (!c) return true; // No conditions = always match (global rule)

    // Check country
    if (c.countries && c.countries.length > 0) {
      if (!context.country || !c.countries.includes(context.country)) {
        return false;
      }
    }

    // Check city
    if (c.cities && c.cities.length > 0) {
      if (!context.city || !c.cities.includes(context.city)) return false;
    }

    // Check star rating
    if (c.starRating) {
      if (c.starRating.min && context.starRating < c.starRating.min) return false;
      if (c.starRating.max && context.starRating > c.starRating.max) return false;
    }

    // Check booking value
    if (c.bookingValue) {
      if (c.bookingValue.min && context.bookingValue < c.bookingValue.min) return false;
      if (c.bookingValue.max && context.bookingValue > c.bookingValue.max) return false;
    }

    // Check date range
    if (c.dateRange) {
      const checkIn = new Date(context.checkInDate || Date.now());
      if (c.dateRange.start && checkIn < new Date(c.dateRange.start)) return false;
      if (c.dateRange.end && checkIn > new Date(c.dateRange.end)) return false;
    }

    // Check meal type
    if (c.mealTypes && c.mealTypes.length > 0) {
      if (!context.mealType || !c.mealTypes.includes(context.mealType)) return false;
    }

    // Check customer type
    if (c.customerType && c.customerType !== 'all') {
      if (context.customerType && c.customerType !== context.customerType) return false;
    }

    return true;
  }

  /**
   * Find the first matching rule from a list of sorted rules
   */
  static findMatchingRule(context, sortedRules) {
    return sortedRules.find(rule => this.matchesRule(rule, context));
  }

  /**
   * Bulk apply margins to search results
   */
  static async applyMarginsToSearchResults(hotels, bookingContext) {
    // Get all active rules once to avoid multiple DB calls
    const allRules = await MarginRule.find({ status: 'active' }).sort({ priority: -1 });

    return hotels.map(hotel => {
      const hotelContext = {
        country: hotel.country || bookingContext.country,
        city: hotel.city || bookingContext.city,
        starRating: hotel.star_rating || hotel.propertyClass || 3,
        bookingValue: hotel.price || 0,
        checkInDate: bookingContext.checkInDate,
        mealType: hotel.meal || 'room_only',
        customerType: bookingContext.customerType || 'b2c'
      };

      // Find matching rule from cached rules
      const matchingRule = this.findMatchingRule(hotelContext, allRules);

      const marginInfo = matchingRule ? {
        rule: matchingRule,
        marginType: matchingRule.type,
        marginValue: matchingRule.type === 'fixed' ? matchingRule.fixedAmount : matchingRule.value,
        isDefault: false
      } : {
        rule: null,
        marginType: 'percentage',
        marginValue: 15,
        isDefault: true
      };

      const priceResult = this.applyMargin(hotel.price || 0, marginInfo);

      return {
        ...hotel,
        originalPrice: hotel.price,
        price: priceResult.finalPrice,
        marginApplied: priceResult.marginAmount,
        marginInfo: {
          ruleName: matchingRule?.name || 'Default',
          marginPercentage: priceResult.marginPercentage
        }
      };
    });
  }

  /**
   * Get margin statistics
   */
  static async getMarginStats() {
    const stats = await MarginRule.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: null,
          totalRules: { $sum: 1 },
          totalApplied: { $sum: '$appliedCount' },
          totalRevenue: { $sum: '$totalRevenueGenerated' },
          avgMargin: { $avg: '$value' }
        }
      }
    ]);

    const byType = await MarginRule.aggregate([
      { $match: { status: 'active' } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          avgValue: { $avg: '$value' }
        }
      }
    ]);

    return {
      summary: stats[0] || { totalRules: 0, totalApplied: 0, totalRevenue: 0, avgMargin: 0 },
      byType
    };
  }
}

module.exports = MarginService;
