import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PreloaderProps {
  isLoading: boolean;
  minDisplayTime?: number;
  maxDisplayTime?: number;
}

// Fix for Framer Motion v4 with React 18 types

export const Preloader: React.FC<PreloaderProps> = ({
  isLoading,
  minDisplayTime = 600,
  maxDisplayTime = 4000 // Reduced from 15s to 4s to avoid blocking LCP
}) => {
  const { t: translate } = useTranslation();
  const [showPreloader, setShowPreloader] = useState(true);
  const [hasMinTimePassed, setHasMinTimePassed] = useState(false);
  const [forceHide, setForceHide] = useState(false);

  // Ensure minimum display time for smooth UX (reduced from 1500ms to 600ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinTimePassed(true);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Maximum display time failsafe - force hide after maxDisplayTime
  useEffect(() => {
    const maxTimer = setTimeout(() => {
      console.warn('Preloader reached maximum display time, forcing hide');
      setForceHide(true);
    }, maxDisplayTime);

    return () => clearTimeout(maxTimer);
  }, [maxDisplayTime]);

  // Hide preloader when: (loading is done AND min time passed) OR force hide triggered
  useEffect(() => {
    if (forceHide || (!isLoading && hasMinTimePassed)) {
      // Small delay for exit animation
      const hideTimer = setTimeout(() => {
        setShowPreloader(false);
      }, 200);
      return () => clearTimeout(hideTimer);
    }
  }, [isLoading, hasMinTimePassed, forceHide]);

  if (!showPreloader) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
      style={{ pointerEvents: showPreloader ? 'auto' : 'none' }}
    >

      {/* Main Content */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Logo Container with Glow */}
        <div
          className="relative"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 blur-2xl bg-white/30 rounded-full scale-150" />

          {/* Logo with Pulse Animation */}
          <div
            className="relative z-10"
          >
            <img
              src="/new-design/logo.svg"
              alt="Gaith Tours"
              className="w-48 h-auto md:w-64 drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Loading Indicator */}
        <div
          className="mt-8 flex flex-col items-center gap-4"
        >
          {/* Modern Loading Dots */}
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 bg-white rounded-full"
              />
            ))}
          </div>

          {/* Loading Text */}
          <p
            className="text-white/90 text-lg font-medium tracking-wide"
          >
            {translate('common.preparingJourney')}
          </p>
        </div>

        {/* Progress Bar */}
        <div
          className="mt-6 relative w-48 h-1 bg-white/30 rounded-full overflow-hidden"
        >
          <div
            className="absolute inset-y-0 left-0 bg-white rounded-full"
          />
        </div>
      </div>

      {/* Bottom Decorative Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 120"
          fill="none"
          className="w-full h-20 md:h-32"
        >
          <path
            d="M0,60 C360,120 720,0 1080,60 C1260,90 1440,40 1440,40 L1440,120 L0,120 Z"
            fill="rgba(255,255,255,0.1)"
          />
        </svg>
      </div>
    </div>
  );
};
