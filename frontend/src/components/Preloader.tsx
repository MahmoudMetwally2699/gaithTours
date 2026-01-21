import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PreloaderProps {
  isLoading: boolean;
  minDisplayTime?: number;
}

// Fix for Framer Motion v4 with React 18 types
const AnimatePresenceWithChildren = AnimatePresence as React.FC<React.PropsWithChildren<any>>;

export const Preloader: React.FC<PreloaderProps> = ({
  isLoading,
  minDisplayTime = 1500
}) => {
  const [showPreloader, setShowPreloader] = useState(true);
  const [hasMinTimePassed, setHasMinTimePassed] = useState(false);

  // Ensure minimum display time for smooth UX
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasMinTimePassed(true);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime]);

  // Hide preloader when both loading is done AND minimum time has passed
  useEffect(() => {
    if (!isLoading && hasMinTimePassed) {
      // Small delay for exit animation
      const hideTimer = setTimeout(() => {
        setShowPreloader(false);
      }, 300);
      return () => clearTimeout(hideTimer);
    }
  }, [isLoading, hasMinTimePassed]);

  return (
    <AnimatePresenceWithChildren>
      {showPreloader ? (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.1, pointerEvents: 'none' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500"
          style={{ pointerEvents: showPreloader ? 'auto' : 'none' }}
        >
          {/* Animated Background Patterns */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Floating circles */}
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-white/10"
                style={{
                  width: `${100 + i * 50}px`,
                  height: `${100 + i * 50}px`,
                  left: `${10 + i * 15}%`,
                  top: `${20 + (i % 3) * 25}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  x: [0, 15, 0],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>

          {/* Main Content */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Logo Container with Glow */}
            <motion.div
              className="relative"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Glow Effect */}
              <div className="absolute inset-0 blur-2xl bg-white/30 rounded-full scale-150" />

              {/* Logo with Pulse Animation */}
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className="relative z-10"
              >
                <img
                  src="/new-design/logo.svg"
                  alt="Gaith Tours"
                  className="w-48 h-auto md:w-64 drop-shadow-2xl"
                />
              </motion.div>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 flex flex-col items-center gap-4"
            >
              {/* Modern Loading Dots */}
              <div className="flex items-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-3 h-3 bg-white rounded-full"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </div>

              {/* Loading Text */}
              <motion.p
                className="text-white/90 text-lg font-medium tracking-wide"
                animate={{
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                Preparing your journey...
              </motion.p>
            </motion.div>

            {/* Progress Bar */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 relative w-48 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-white rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: hasMinTimePassed && !isLoading ? '100%' : '85%' }}
                transition={{
                  duration: hasMinTimePassed && !isLoading ? 0.3 : minDisplayTime / 1000,
                  ease: 'easeOut',
                }}
              />
            </motion.div>
          </div>

          {/* Bottom Decorative Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 120"
              fill="none"
              className="w-full h-20 md:h-32"
            >
              <motion.path
                d="M0,60 C360,120 720,0 1080,60 C1260,90 1440,40 1440,40 L1440,120 L0,120 Z"
                fill="rgba(255,255,255,0.1)"
                animate={{
                  d: [
                    "M0,60 C360,120 720,0 1080,60 C1260,90 1440,40 1440,40 L1440,120 L0,120 Z",
                    "M0,80 C360,20 720,100 1080,40 C1260,60 1440,80 1440,80 L1440,120 L0,120 Z",
                    "M0,60 C360,120 720,0 1080,60 C1260,90 1440,40 1440,40 L1440,120 L0,120 Z",
                  ],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </svg>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresenceWithChildren>
  );
};
