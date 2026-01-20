// Image Optimization Component
import React, { useState, useEffect, useRef } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
  /**
   * Priority loading (adds rel="preload" behavior)
   * if true, uses loading="eager", otherwise "lazy"
   */
  priority?: boolean;
  /**
   * Target size for RateHawk images (e.g., "640x400")
   * If provided, will replace {size} or existing dimensions in URL
   */
  size?: string;
  /**
   * Helper to determine aspect ratio for skeleton
   * Default: video (16/9)
   */
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
  /**
   * Fallback image if source fails
   */
  fallbackSrc?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
  size,
  aspectRatio = 'auto',
  fallbackSrc = '/placeholder-room.jpg',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Process URL to handle resizing logic
  const getProcessedUrl = (url: string, targetSize?: string) => {
    if (!url) return '';
    if (!targetSize) return url;

    // RateHawk URL pattern often contains dimensions like 1024x768 or {size} placeholder
    // If URL has {size}, replace it
    if (url.includes('{size}')) {
      return url.replace('{size}', targetSize);
    }

    // Attempt to replace existing common dimensions if found
    const commonSizes = ['1024x768', '800x600', '640x400', '320x240'];
    for (const s of commonSizes) {
      if (url.includes(s)) {
        return url.replace(s, targetSize);
      }
    }

    return url;
  };

  useEffect(() => {
    if (!src) return;
    const finalSrc = getProcessedUrl(src, size);
    setCurrentSrc(finalSrc);
    // Reset states when src changes
    setIsLoaded(false);
    setHasError(false);
  }, [src, size]);

  // Handle load completion
  const handleLoad = () => {
    setIsLoaded(true);
  };

  // Handle error
  const handleError = () => {
    setHasError(true);
    if (!currentSrc.includes(fallbackSrc) && fallbackSrc) {
       setCurrentSrc(fallbackSrc);
    }
  };

  // Determine aspect ratio class for skeleton
  const getAspectRatioClass = () => {
    if (aspectRatio === 'square') return 'aspect-square';
    if (aspectRatio === 'video') return 'aspect-video';
    if (aspectRatio === 'portrait') return 'aspect-[3/4]';
    return '';
  };

  return (
    <div className={`relative overflow-hidden bg-gray-200 ${getAspectRatioClass()} ${className}`}>
      {/* Skeleton / Loading State */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 animate-pulse z-10">
           <PhotoIcon className="w-1/3 h-1/3 text-gray-300" />
        </div>
      )}

      {/* Actual Image */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-500
          ${isLoaded ? 'opacity-100' : 'opacity-0'}
          ${className}
        `}
        {...props}
      />

      {/* Error State Fallback UI (if image completely fails and no fallback works) */}
      {hasError && !currentSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-400">
           <span className="text-xs text-center p-2">Image unavailable</span>
        </div>
      )}
    </div>
  );
};
