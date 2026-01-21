import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';


export const OffersBanner: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <section className="w-full max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
       <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 px-1">Offers</h3>

      {/* Wrapper for positioning the illustration outside the clipped banner */}
      <div className="relative">
        {/* Illustration on the right - positioned to overflow at top */}
        <img
          src="/new-design/Shipping 2 Streamline Manchester.svg"
          alt="Offers Illustration"
          className="absolute right-4 sm:right-8 md:right-16 -top-8 sm:-top-10 h-[140px] sm:h-[160px] w-auto object-contain pointer-events-none z-10"
        />

        {/* Banner with overflow-hidden to clip the circle */}
        <div className="bg-[#FCAE61] rounded-xl md:rounded-lg p-4 sm:p-5 md:p-6 relative overflow-hidden shadow-sm min-h-[100px] sm:min-h-[120px]">

          {/* Yellow semi-circle decorative element on bottom-left */}
          <div
            className="absolute -bottom-10 -left-10 w-24 h-24 sm:w-32 sm:h-32 rounded-full pointer-events-none"
            style={{ backgroundColor: '#F5C97A' }}
          />

          {/* Content */}
          <div className="flex flex-row items-center z-10 relative gap-3 sm:gap-4 md:gap-6">
            <button
              onClick={() => history.push('/register')}
              className="bg-[#FF385C] text-white font-bold py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg shadow-md hover:bg-[#ff1f48] transition-colors whitespace-nowrap text-sm sm:text-base flex-shrink-0"
            >
              Join now
            </button>

            <span className="text-white text-sm sm:text-base md:text-lg lg:text-xl font-bold leading-snug">
              Exclusive prices for Gaith Tours members
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
