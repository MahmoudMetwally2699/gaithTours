import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { useDirection } from '../hooks/useDirection';


export const OffersBanner: React.FC = () => {
  const { t } = useTranslation('home');
  const history = useHistory();
  const { isRTL } = useDirection();

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
       <h3 className={`text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 px-1 ${isRTL ? 'text-right' : 'text-left'}`}>{t('offers.title')}</h3>

      {/* Wrapper for positioning the illustration outside the clipped banner */}
      <div className="relative">
        {/* Illustration - on the right in LTR, left in RTL */}
        <img
          src="/new-design/Shipping 2 Streamline Manchester.svg"
          alt="Offers Illustration"
          className={`absolute ${isRTL ? 'left-2 sm:left-8 md:left-16' : 'right-2 sm:right-8 md:right-16'} -top-4 sm:-top-10 h-[80px] sm:h-[140px] md:h-[160px] w-auto object-contain pointer-events-none z-10`}
        />

        {/* Banner with overflow-hidden to clip the circle */}
        <div className="bg-[#FCAE61] rounded-xl md:rounded-lg p-4 sm:p-5 md:p-6 relative overflow-hidden shadow-sm min-h-[80px] sm:min-h-[120px]">

          {/* Yellow semi-circle decorative element - on bottom-left in LTR, bottom-right in RTL */}
          <div
            className={`absolute -bottom-10 ${isRTL ? '-right-10' : '-left-10'} w-24 h-24 sm:w-32 sm:h-32 rounded-full pointer-events-none`}
            style={{ backgroundColor: '#F5C97A' }}
          />

          {/* Content - limit width on mobile to avoid illustration overlap */}
          <div className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center ${isRTL ? 'justify-end' : 'justify-start'} z-10 relative gap-3 sm:gap-4 md:gap-6 ${isRTL ? 'pl-16 sm:pl-32 md:pl-40' : 'pr-16 sm:pr-32 md:pr-40'}`}>
            <button
              onClick={() => history.push('/register')}
              className="bg-[#FF385C] text-white font-bold py-2 sm:py-2.5 px-3 sm:px-6 rounded-lg shadow-md hover:bg-[#ff1f48] transition-colors whitespace-nowrap text-xs sm:text-base flex-shrink-0"
            >
              {t('offers.joinNow')}
            </button>

            <span className={`text-white text-xs sm:text-base md:text-lg lg:text-xl font-bold leading-snug ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('offers.exclusivePrices')}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
