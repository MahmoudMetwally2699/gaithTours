import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InfographicItem {
  id: number;
  assetImage: string;
  translationKey: string;
}

const infographicData: InfographicItem[] = [
  {
    id: 1,
    assetImage: '/photos/asset-1.png',
    translationKey: 'section1'
  },
  {
    id: 2,
    assetImage: '/photos/asset-2.png',
    translationKey: 'section2'
  },
  {
    id: 3,
    assetImage: '/photos/asset-3.png',
    translationKey: 'section3'
  }
];

export const InfographicSection: React.FC = () => {
  const { t } = useTranslation();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (    <section
      className="py-12 sm:py-16 lg:py-24 relative overflow-hidden"
      style={{ backgroundColor: '#E1FAFF' }}
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0"
        >
          {infographicData.map((item, index) => (
            <React.Fragment key={item.id}>              <motion.div
                variants={itemVariants}
                className="flex flex-row lg:grid lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 lg:gap-16 items-start lg:items-center py-8 sm:py-12 lg:py-20"
              >
                {/* Text Content - Right Side in RTL (Left side visually) */}
                <div className="flex-1 order-2 lg:order-1 text-right px-2 sm:px-4 lg:px-8">
                  <h2
                    className="text-base sm:text-lg md:text-2xl lg:text-4xl xl:text-5xl font-bold mb-2 sm:mb-3 lg:mb-6 leading-tight"
                    style={{
                      color: '#0F5F5F', // Dark teal
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  >
                    {t(`infographic.${item.translationKey}.headline`)}
                  </h2>                  <p
                    className="text-xs sm:text-sm md:text-base lg:text-xl xl:text-2xl leading-relaxed"
                    style={{
                      color: '#9CA3AF', // Light grey
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  >
                    {t(`infographic.${item.translationKey}.supportingText`)}
                  </p>
                </div>                {/* Asset Image - Left Side in RTL (Right side visually) */}                <div className="flex-shrink-0 order-1 lg:order-2 flex justify-start items-center">
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 lg:w-full lg:max-w-md">                    <img
                      src={item.assetImage}
                      alt={`Asset ${item.id}`}
                      className="w-full h-full lg:w-auto lg:h-auto object-contain select-none"                      style={{
                        maxHeight: '120px',
                        imageRendering: 'auto'
                      }}
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                </div>
              </motion.div>              {/* Orange Separator Line */}
              {index < infographicData.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.8, delay: index * 0.3 + 0.6 }}
                  className="flex justify-center py-4 sm:py-6 lg:py-8"
                >
                  <div
                    className="h-0.5 sm:h-1"
                    style={{
                      backgroundColor: '#FF8C00', // Orange
                      width: '70%',
                      maxWidth: '800px'
                    }}
                  />
                </motion.div>
              )}
            </React.Fragment>
          ))}
        </motion.div>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-20 left-10 w-32 h-32 bg-white/30 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 right-10 w-40 h-40 bg-blue-200/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-1/3 w-36 h-36 bg-cyan-200/30 rounded-full blur-2xl"></div>
      </div>
    </section>
  );
};
