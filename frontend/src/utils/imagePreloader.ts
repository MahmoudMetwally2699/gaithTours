/**
 * Image Preloading and Prefetching Utilities
 *
 * Provides functions to preload critical images and prefetch below-the-fold images
 * for optimal performance and user experience
 */

interface PreloadOptions {
    priority?: boolean;
    type?: 'image/webp' | 'image/jpeg' | 'image/png';
    as?: 'image';
    fetchpriority?: 'high' | 'low' | 'auto';
}

/**
 * Preload a single image by creating a link element
 * This is more efficient than creating Image objects
 */
export const preloadImage = (
    url: string,
    options: PreloadOptions = {}
): HTMLLinkElement => {
    const link = document.createElement('link');
    link.rel = options.priority ? 'preload' : 'prefetch';
    link.as = options.as || 'image';
    link.href = url;

    if (options.type) {
        link.type = options.type;
    }

    if (options.fetchpriority) {
        link.setAttribute('fetchpriority', options.fetchpriority);
    }

    document.head.appendChild(link);
    return link;
};

/**
 * Preload multiple images
 */
export const preloadImages = (
    urls: string[],
    options: PreloadOptions = {}
): HTMLLinkElement[] => {
    return urls.map(url => preloadImage(url, options));
};

/**
 * Preload critical images (above-the-fold)
 * Uses high priority preload
 */
export const preloadCriticalImages = (urls: string[]): HTMLLinkElement[] => {
    return preloadImages(urls, {
        priority: true,
        fetchpriority: 'high'
    });
};

/**
 * Prefetch below-the-fold images
 * Uses low priority prefetch to not block critical resources
 */
export const prefetchImages = (urls: string[]): HTMLLinkElement[] => {
    return preloadImages(urls, {
        priority: false,
        fetchpriority: 'low'
    });
};

/**
 * Intelligently preload images based on viewport and connection
 * Uses Network Information API when available
 */
export const smartPreload = (
    urls: string[],
    options: {
        maxImages?: number;
        respectDataSaver?: boolean;
    } = {}
): HTMLLinkElement[] => {
    const { maxImages = 10, respectDataSaver = true } = options;

    // Check for data saver mode
    if (respectDataSaver && 'connection' in navigator) {
        const conn = (navigator as any).connection;
        if (conn && conn.saveData) {
            // User has data saver enabled, skip prefetching
            return [];
        }

        // On slow connections, reduce preloading
        if (conn && conn.effectiveType &&
            (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
            return preloadCriticalImages(urls.slice(0, 2));
        }
    }

    // Preload first few as high priority, rest as low priority
    const criticalUrls = urls.slice(0, 3);
    const prefetchUrls = urls.slice(3, maxImages);

    return [
        ...preloadCriticalImages(criticalUrls),
        ...prefetchImages(prefetchUrls)
    ];
};

/**
 * Preload image in background using Image object
 * Returns a promise that resolves when image is loaded
 */
export const preloadImageAsync = (url: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

/**
 * Batch preload images with promise
 */
export const preloadImagesAsync = async (
    urls: string[],
    options: {
        parallel?: boolean;
        onProgress?: (loaded: number, total: number) => void;
    } = {}
): Promise<void> => {
    const { parallel = true, onProgress } = options;

    if (parallel) {
        // Load all images in parallel
        const promises = urls.map(url =>
            preloadImageAsync(url).catch(err => {
                console.warn(`Failed to preload image: ${url}`, err);
                return undefined;
            })
        );

        // Track progress if callback provided
        if (onProgress) {
            let loaded = 0;
            const total = urls.length;

            promises.forEach(promise => {
                promise?.then(() => {
                    loaded++;
                    onProgress(loaded, total);
                });
            });
        }

        await Promise.allSettled(promises);
    } else {
        // Load images sequentially
        let loaded = 0;
        for (const url of urls) {
            try {
                await preloadImageAsync(url);
                loaded++;
                onProgress?.(loaded, urls.length);
            } catch (err) {
                console.warn(`Failed to preload image: ${url}`, err);
            }
        }
    }
};

/**
 * Remove preload/prefetch links from document head
 */
export const clearPreloadLinks = (links: HTMLLinkElement[]): void => {
    links.forEach(link => {
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    });
};

/**
 * Create optimized image URL with size parameter
 */
export const getOptimizedImageUrl = (
    url: string,
    size: string = '640x400'
): string => {
    if (!url) return '';

    // Replace size pattern in URL
    if (url.includes('1024x768') || url.includes('640x400') || url.includes('170x154')) {
        return url.replace(/\d+x\d+/, size);
    }

    return url;
};

/**
 * Generate responsive image sizes for srcset
 */
export const generateResponsiveSizes = (
    baseUrl: string,
    sizes: number[] = [400, 640, 800, 1024, 1280, 1600]
): string => {
    return sizes
        .map(size => `${getOptimizedImageUrl(baseUrl, `${size}x${Math.round(size * 0.75)}`)} ${size}w`)
        .join(', ');
};

const imagePreloader = {
    preloadImage,
    preloadImages,
    preloadCriticalImages,
    prefetchImages,
    smartPreload,
    preloadImageAsync,
    preloadImagesAsync,
    clearPreloadLinks,
    getOptimizedImageUrl,
    generateResponsiveSizes
};

export default imagePreloader;
