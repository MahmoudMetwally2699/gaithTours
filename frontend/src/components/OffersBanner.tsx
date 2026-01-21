import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { PaperAirplaneIcon, GiftIcon } from '@heroicons/react/24/outline';

export const OffersBanner: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 md:py-8">
       <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-3 md:mb-4 px-1">Offers</h3>
      <div className="bg-[#FCAE61] rounded-xl md:rounded-lg p-4 sm:p-5 md:p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-sm">

        <div className="absolute right-6 sm:right-10 top-1 sm:top-2 opacity-20 pointer-events-none transform rotate-12">
            <PaperAirplaneIcon className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-white" />
        </div>
        <div className="absolute right-20 sm:right-32 bottom-1 sm:bottom-2 opacity-20 pointer-events-none transform -rotate-12">
            <GiftIcon className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 text-white" />
        </div>

        <div className="flex flex-col sm:flex-row items-center z-10 w-full sm:w-auto gap-3 sm:gap-4 md:gap-6">
          <button
            onClick={() => history.push('/register')}
            className="bg-[#FF385C] text-white font-bold py-2.5 sm:py-2 md:py-2 px-5 sm:px-6 rounded-lg shadow-md hover:bg-[#ff1f48] transition-colors whitespace-nowrap w-full sm:w-auto text-sm sm:text-base"
          >
            Join now
          </button>

          <span className="text-white text-base sm:text-lg md:text-xl font-bold text-center sm:text-left leading-snug">
            Exclusive prices for Gaith Tours members
          </span>
        </div>

        <div className="hidden sm:block w-20 md:w-32"></div>
      </div>
    </section>
  );
};
