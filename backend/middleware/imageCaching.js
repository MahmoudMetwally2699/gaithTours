/**
 * Image Caching Middleware for Express
 *
 * Adds aggressive caching headers for image responses
 * to improve client-side caching and reduce server load
 */

/**
 * Cache configuration for different image types
 */
const CACHE_CONFIGS = {
  // Static images (logos, icons) - cache for 1 year
  static: {
    maxAge: 31536000, // 1 year
    immutable: true
  },
  // Hotel/room images - cache for 1 week
  hotel: {
    maxAge: 604800, // 1 week
    immutable: false
  },
  // User uploaded images - cache for 1 day
  upload: {
    maxAge: 86400, // 1 day
    immutable: false
  },
  // Temporary/dynamic images - cache for 1 hour
  dynamic: {
    maxAge: 3600, // 1 hour
    immutable: false
  }
};

/**
 * Middleware to add caching headers for images
 */
export const imageCacheMiddleware = (cacheType: keyof typeof CACHE_CONFIGS = 'hotel') => {
  return (req: any, res: any, next: any) => {
    const config = CACHE_CONFIGS[cacheType];

    // Set Cache-Control header
    const cacheControl = [
      'public',
      `max-age=${config.maxAge}`,
      config.immutable ? 'immutable' : 'must-revalidate'
    ].join(', ');

    res.setHeader('Cache-Control', cacheControl);

    // Set additional caching headers
    const expiresDate = new Date(Date.now() + config.maxAge * 1000);
    res.setHeader('Expires', expiresDate.toUTCString());

    // Enable stale-while-revalidate for better UX
    res.setHeader('Stale-While-Revalidate', '86400'); // 1 day

    // Add ETag support for conditional requests
    if (!res.getHeader('ETag')) {
      // Generate simple ETag based on URL and timestamp
      const etag = `"${Buffer.from(req.url).toString('base64').substring(0, 20)}"`;
      res.setHeader('ETag', etag);
    }

    next();
  };
};

/**
 * Handle conditional requests (304 Not Modified)
 */
export const conditionalRequestMiddleware = (req: any, res: any, next: any) => {
  const ifNoneMatch = req.headers['if-none-match'];
  const etag = res.getHeader('ETag');

  // If client has same version, return 304
  if (ifNoneMatch && etag && ifNoneMatch === etag) {
    return res.status(304).end();
  }

  next();
};

/**
 * Compression hints for images
 */
export const imageCompressionHints = (req: any, res: any, next: any) => {
  // Add Accept-Encoding hint
  res.setHeader('Vary', 'Accept-Encoding');

  // Suggest compression support
  res.setHeader('Content-Encoding-Hint', 'br, gzip');

  next();
};

/**
 * Complete image optimization middleware stack
 */
export const optimizeImageResponse = (cacheType: keyof typeof CACHE_CONFIGS = 'hotel') => {
  return [
    imageCacheMiddleware(cacheType),
    conditionalRequestMiddleware,
    imageCompressionHints
  ];
};

export default {
  imageCacheMiddleware,
  conditionalRequestMiddleware,
  imageCompressionHints,
  optimizeImageResponse
};
