import { useState, useEffect, useRef } from 'react';

interface UserLocationResult {
    city: string;
    isDetecting: boolean;
    error: string | null;
}

const SESSION_CACHE_KEY = 'userDetectedCity';
const LOCATION_DENIED_KEY = 'locationDenied';

// Module-level singleton to prevent duplicate geolocation calls
// across multiple component instances mounting simultaneously
let activePromise: Promise<string | null> | null = null;

/**
 * Shared hook for user geolocation detection.
 * - Detects location once, caches in sessionStorage
 * - Both MainSection and SuggestedHotels use this single source of truth
 * - Respects the 'locationDenied' localStorage flag
 * - Falls back to IP-based geolocation if browser geolocation fails/times out
 */
export function useUserLocation(language: string): UserLocationResult {
    const [city, setCity] = useState<string>(() => {
        // Return cached city immediately if available
        return sessionStorage.getItem(SESSION_CACHE_KEY) || '';
    });
    const [isDetecting, setIsDetecting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasRun = useRef(false);

    useEffect(() => {
        // If we already have a cached city, skip detection
        const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
        if (cached) {
            setCity(cached);
            setIsDetecting(false);
            return;
        }

        // If location was previously denied, don't attempt
        if (localStorage.getItem(LOCATION_DENIED_KEY)) {
            setIsDetecting(false);
            return;
        }

        // Only run once per mount cycle
        if (hasRun.current) return;
        hasRun.current = true;

        setIsDetecting(true);

        // If another component already started detection, reuse that promise
        if (!activePromise) {
            activePromise = detectLocation(language);
        }

        activePromise
            .then((detectedCity) => {
                if (detectedCity) {
                    sessionStorage.setItem(SESSION_CACHE_KEY, detectedCity);
                    setCity(detectedCity);
                    console.log(`✅ Location detected and cached: ${detectedCity}`);
                }
            })
            .catch((err) => {
                console.log('📍 Location detection failed:', err?.message || err);
                setError(err?.message || 'Location detection failed');
            })
            .finally(() => {
                setIsDetecting(false);
                activePromise = null;
            });
    }, []); // Run once on mount

    return { city, isDetecting, error };
}

/**
 * Detect user location. Strategy:
 * 1. Try browser geolocation API (15s timeout)
 * 2. If that fails/times out, fall back to IP-based geolocation
 * 3. Reverse geocode coordinates via Nominatim
 */
async function detectLocation(language: string): Promise<string | null> {
    // Try browser geolocation first
    try {
        const coords = await getBrowserCoords();
        console.log(`📍 Browser coordinates: ${coords.lat}, ${coords.lon}`);
        const city = await reverseGeocode(coords.lat, coords.lon, language);
        if (city) return city;
    } catch (browserErr: any) {
        console.log(`⚠️ Browser geolocation failed: ${browserErr?.message || browserErr}`);

        // If user explicitly denied, don't try IP fallback — mark as denied
        if (browserErr?.code === 1) {
            // PERMISSION_DENIED
            localStorage.setItem(LOCATION_DENIED_KEY, 'true');
            throw browserErr;
        }
    }

    // Fallback: IP-based geolocation (works even when browser geolocation times out)
    try {
        console.log('🌐 Trying IP-based geolocation fallback...');
        const city = await ipBasedLocation(language);
        if (city) return city;
    } catch (ipErr) {
        console.log('⚠️ IP-based geolocation also failed:', ipErr);
    }

    return null;
}

/**
 * Get coordinates from browser's geolocation API.
 */
function getBrowserCoords(): Promise<{ lat: number; lon: number }> {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                });
            },
            (geoError) => {
                reject(geoError);
            },
            {
                enableHighAccuracy: false,
                timeout: 15000,        // 15 seconds — desktop Windows can be slow
                maximumAge: 600000,    // 10 min browser cache
            }
        );
    });
}

/**
 * Reverse geocode coordinates to a city name using Nominatim.
 */
async function reverseGeocode(lat: number, lon: number, language: string): Promise<string | null> {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=${language}&zoom=10`,
        {
            headers: {
                'User-Agent': 'GaithTours/1.0 (https://gaithtours.com)',
                'Accept': 'application/json',
            },
        }
    );

    if (!response.ok) {
        throw new Error(`Nominatim HTTP ${response.status}`);
    }

    const geoData = await response.json();
    return (
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.state ||
        geoData.address?.country ||
        null
    );
}

/**
 * IP-based geolocation fallback using ip-api.com (free, no key needed).
 * Returns city name directly without needing reverse geocoding.
 */
async function ipBasedLocation(language: string): Promise<string | null> {
    const response = await fetch(
        `http://ip-api.com/json/?fields=status,city,regionName,country&lang=${language === 'ar' ? 'ar' : 'en'}`,
        { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
        throw new Error(`ip-api HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'success') {
        const city = data.city || data.regionName || data.country || null;
        console.log(`🌐 IP-based location: ${city}`);
        return city;
    }

    return null;
}
