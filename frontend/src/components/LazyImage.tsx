import React, { useState, useEffect, useRef, CSSProperties } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  priority?: boolean;
  sizes?: string;
  placeholderSrc?: string;
  onLoad?: () => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  loading?: 'lazy' | 'eager';
  decoding?: 'async' | 'auto' | 'sync';
  onClick?: () => void;
}

/**
 * Advanced LazyImage Component with Progressive Loading
 *
 * Features:
 * - Intersection Observer API for lazy loading
 * - Blur-up placeholder technique
 * - Progressive image loading
 * - Responsive image sizing
 * - Error handling with fallback
 * - Priority loading for above-the-fold images
 * - Async decoding for better performance
 * - Memory-efficient cleanup
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className = '',
  style,
  priority = false,
  sizes,
  placeholderSrc,
  onLoad,
  onError,
  objectFit = 'cover',
  loading = 'lazy',
  decoding = 'async',
  onClick
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(priority ? src : null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Generate blur placeholder from original image URL (tiny version)
  const getBlurPlaceholder = (url: string): string => {
    if (placeholderSrc) return placeholderSrc;

    // Create a tiny version for blur effect
    if (url.includes('1024x768') || url.includes('640x400')) {
      return url.replace(/\d+x\d+/, '40x40');
    }

    // For other URLs, use a data URI placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"%3E%3Crect width="40" height="40" fill="%23f3f4f6"/%3E%3C/svg%3E';
  };

  useEffect(() => {
    // If priority, load immediately
    if (priority) {
      setImageSrc(src);
      return;
    }

    // Setup Intersection Observer for lazy loading
    const img = imgRef.current;
    if (!img) return;

    // Check if IntersectionObserver is supported
    if ('IntersectionObserver' in window) {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Start loading image when it enters viewport
              setImageSrc(src);

              // Disconnect observer after loading starts
              if (observerRef.current && img) {
                observerRef.current.unobserve(img);
              }
            }
          });
        },
        {
          // Start loading slightly before image enters viewport
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );

      observerRef.current.observe(img);
    } else {
      // Fallback for browsers without IntersectionObserver
      setImageSrc(src);
    }

    // Cleanup
    return () => {
      if (observerRef.current && img) {
        observerRef.current.unobserve(img);
      }
    };
  }, [src, priority]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoading(false);
    setImageError(false);
    onLoad?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setImageLoading(false);
    setImageError(true);
    onError?.(e);
  };

  const containerStyle: CSSProperties = {
    position: 'relative',
    overflow: 'hidden',
    ...style
  };

  const imageStyle: CSSProperties = {
    objectFit,
    transition: 'opacity 0.3s ease-in-out, filter 0.3s ease-in-out',
    opacity: imageLoading ? 0 : 1,
    filter: imageLoading ? 'blur(10px)' : 'none',
    width: '100%',
    height: '100%'
  };

  const placeholderStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit,
    filter: 'blur(10px)',
    transform: 'scale(1.1)',
    opacity: imageLoading && !imageError ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    pointerEvents: 'none'
  };

  return (
    <div
      className={className}
      style={containerStyle}
      onClick={onClick}
    >
      {/* Blur placeholder - loads first */}
      {!priority && (
        <img
          src={getBlurPlaceholder(src)}
          alt=""
          style={placeholderStyle}
          aria-hidden="true"
          loading="eager"
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={imageSrc || getBlurPlaceholder(src)}
        alt={alt}
        style={imageStyle}
        onLoad={handleLoad}
        onError={handleError}
        loading={priority ? 'eager' : loading}
        decoding={decoding}
        sizes={sizes}
        {...(priority && { fetchPriority: 'high' as const })}
      />

      {/* Loading spinner overlay */}
      {imageLoading && !imageError && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 1
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(249, 115, 22, 0.2)',
              borderTopColor: '#F97316',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite'
            }}
          />
        </div>
      )}

      {/* Error fallback */}
      {imageError && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#9ca3af'
          }}
        >
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}

      {/* CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LazyImage;
