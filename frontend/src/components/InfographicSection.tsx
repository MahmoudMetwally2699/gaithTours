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
    >      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-0 w-full"
        >
          {infographicData.map((item, index) => (            <React.Fragment key={item.id}>              <motion.div
                variants={itemVariants}
                className={`grid grid-cols-1 lg:grid-cols-2 ${index === 0 ? 'gap-1 lg:gap-2' : 'gap-4 lg:gap-6'} items-center justify-items-center py-8 sm:py-12 lg:py-20 max-w-5xl mx-auto`}
              >{/* Text Content - Right Side in RTL (Left side visually) */}                <div className={`order-2 lg:order-1 text-center lg:text-right w-full flex flex-col justify-center items-center lg:items-end ${index === 0 ? 'px-4 lg:pl-8 lg:pr-0 lg:-ml-48' : 'px-4 lg:px-2'}`}>                  <h2
                    className={`font-bold mb-2 sm:mb-3 lg:mb-6 ${index === 0 ? 'whitespace-nowrap text-sm sm:text-base md:text-lg lg:text-2xl xl:text-3xl' : index === 2 ? 'text-sm sm:text-base md:text-lg lg:text-2xl xl:text-3xl text-center lg:text-right lg:-ml-24' : 'whitespace-nowrap text-sm sm:text-base md:text-lg lg:text-2xl xl:text-3xl text-center lg:text-right lg:-ml-16'}`}
                    style={{
                      color: '#0F5F5F', // Dark teal
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  >
                    {t(`infographic.${item.translationKey}.headline`)}
                  </h2>                  <p
                    className={`text-xs sm:text-xs md:text-sm lg:text-base xl:text-lg ${index === 2 ? '' : 'whitespace-nowrap'}`}
                    style={{
                      color: '#9CA3AF', // Light grey
                      fontFamily: 'Cairo, sans-serif'
                    }}
                  >
                    {t(`infographic.${item.translationKey}.supportingText`)}
                  </p>
                </div>{/* Asset Image - Left Side in RTL (Right side visually) */}                <div className="order-1 lg:order-2 flex justify-center lg:justify-start items-center w-full">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-full lg:max-w-md xl:max-w-lg">
                    <img
                      src={item.assetImage}
                      alt={`Asset ${item.id}`}
                      className="w-full h-full object-contain select-none lg:max-h-80 xl:max-h-96"
                      style={{
                        imageRendering: 'auto'
                      }}
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                </div>
              </motion.div>{/* Orange Separator Line */}
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
