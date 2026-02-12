import React, { useRef, useState, useEffect, ReactNode } from 'react';

interface LazySectionProps {
  children: ReactNode;
  /** Minimum height for the placeholder to prevent layout shift */
  height?: string;
  /** Skeleton type: 'hotel-cards', 'city-cards', or 'simple' */
  skeleton?: 'hotel-cards' | 'city-cards' | 'simple';
  /** How far before the viewport to start loading (default: 200px) */
  rootMargin?: string;
}

/**
 * LazySection - Defers rendering and data-fetching of below-fold components.
 * Uses IntersectionObserver to detect when the section is near the viewport,
 * then mounts the actual children (which trigger their own data fetches).
 * Shows a lightweight skeleton placeholder until triggered.
 */
export const LazySection: React.FC<LazySectionProps> = ({
  children,
  height = '300px',
  skeleton = 'simple',
  rootMargin = '200px',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    // If IntersectionObserver isn't supported, render immediately
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [rootMargin]);

  // Once visible, render the actual children
  if (isVisible) {
    return <>{children}</>;
  }

  // Placeholder skeleton
  return (
    <div ref={sentinelRef} style={{ minHeight: height }}>
      {skeleton === 'hotel-cards' && <HotelCardsSkeleton />}
      {skeleton === 'city-cards' && <CityCardsSkeleton />}
      {skeleton === 'simple' && <SimpleSkeleton />}
    </div>
  );
};

// --- Skeleton components ---

const HotelCardsSkeleton: React.FC = () => (
  <section className="w-full max-w-7xl mx-auto py-6 md:py-8">
    <div className="px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="h-7 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
      <div className="flex gap-3 md:gap-4 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="min-w-[180px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] bg-white rounded-2xl overflow-hidden shadow-sm h-[280px] sm:h-[300px] md:h-[320px] animate-pulse border border-gray-100 flex-shrink-0 flex flex-col"
          >
            <div className="bg-gray-100 h-32 sm:h-36 md:h-40 w-full" />
            <div className="p-3 md:p-4 flex-grow space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="flex gap-1">
                {[...Array(5)].map((_, j) => (
                  <div key={j} className="h-3 w-3 bg-gray-100 rounded-full" />
                ))}
              </div>
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CityCardsSkeleton: React.FC = () => (
  <section className="w-full max-w-7xl mx-auto py-6 md:py-8 lg:py-12">
    <div className="px-3 sm:px-4 md:px-6 lg:px-8">
      <div className="h-7 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
      <div className="flex gap-3 md:gap-4 lg:gap-6 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="min-w-[160px] sm:min-w-[200px] md:min-w-[240px] lg:min-w-[280px] bg-white rounded-xl overflow-hidden shadow-sm h-[240px] sm:h-[280px] md:h-[300px] lg:h-[320px] animate-pulse border border-gray-100 flex-shrink-0"
          >
            <div className="h-[75%] bg-gray-100" />
            <div className="p-3 md:p-4 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const SimpleSkeleton: React.FC = () => (
  <section className="w-full max-w-7xl mx-auto py-12 md:py-16">
    <div className="px-4 sm:px-6 lg:px-8 flex flex-col items-center space-y-6">
      <div className="h-8 bg-gray-200 rounded w-56 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-80 animate-pulse" />
      <div className="flex gap-6 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-20 w-28 bg-white rounded-2xl shadow-sm animate-pulse border border-gray-100" />
        ))}
      </div>
    </div>
  </section>
);
