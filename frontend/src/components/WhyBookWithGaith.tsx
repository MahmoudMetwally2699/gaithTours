import React from 'react';
import { useTranslation } from 'react-i18next';

interface TrustBadge {
  image: string;
  alt: string;
  titleKey: string;
  descKey: string;
  imageScale: string;
}

export const WhyBookWithGaith: React.FC = () => {
  const { t } = useTranslation('home');

  const badges: TrustBadge[] = [
    {
      image: '/home/coins.png',
      alt: 'Best Price',
      titleKey: 'whyBook.bestPrice.title',
      descKey: 'whyBook.bestPrice.desc',
      imageScale: 'scale-125',
    },
    {
      image: '/home/Message_perspective_matte_s 1.png',
      alt: '24/7 Support',
      titleKey: 'whyBook.support.title',
      descKey: 'whyBook.support.desc',
      imageScale: 'scale-90',
    },
    {
      image: '/home/Calendar_perspective_matte_s 1.png',
      alt: 'Free Cancellation',
      titleKey: 'whyBook.freeCancellation.title',
      descKey: 'whyBook.freeCancellation.desc',
      imageScale: 'scale-75',
    },
    {
      image: '/home/credit card.png',
      alt: 'Secure Payment',
      titleKey: 'whyBook.securePayment.title',
      descKey: 'whyBook.securePayment.desc',
      imageScale: 'scale-125',
    },
  ];

  return (
    <section className="w-full bg-gradient-to-br from-[#F7871D] to-[#E06B10] py-10 md:py-14 pb-12 md:pb-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="text-center mb-10 md:mb-14">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
            {t('whyBook.title', 'Why Book With Gaith Tours?')}
          </h2>
          <p className="text-white/80 text-sm md:text-base mt-2">
            {t('whyBook.subtitle', 'Trusted by thousands of travelers across the Middle East')}
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-6 md:gap-6 mt-12 sm:mt-14 md:mt-20">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="flex flex-col items-center relative h-full"
            >
              {/* Floating image above card */}
              <div className="absolute -top-10 sm:-top-12 md:-top-14 left-1/2 -translate-x-1/2 z-10 w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28">
                <img
                  src={badge.image}
                  alt={badge.alt}
                  className={`w-full h-full object-contain drop-shadow-2xl ${badge.imageScale}`}
                  loading="lazy"
                />
              </div>
              {/* Card */}
              <div className="bg-[#D4943B]/60 border-2 border-[#F5C563] rounded-2xl sm:rounded-[1.25rem] md:rounded-[1.5rem] pt-12 sm:pt-14 md:pt-20 pb-4 sm:pb-6 md:pb-8 px-3 sm:px-4 md:px-6 text-center w-full h-full transition-all duration-300 hover:bg-[#D4943B]/75">
                <h3 className="text-white font-bold text-sm sm:text-base md:text-lg mb-1 sm:mb-2">
                  {t(badge.titleKey)}
                </h3>
                <p className="text-white/90 text-[11px] sm:text-xs md:text-sm leading-relaxed">
                  {t(badge.descKey)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
