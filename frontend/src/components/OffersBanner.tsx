import React from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { PaperAirplaneIcon, GiftIcon } from '@heroicons/react/24/outline';

export const OffersBanner: React.FC = () => {
  const { t } = useTranslation();
  const history = useHistory();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       <h3 className="text-xl font-bold text-gray-800 mb-4">Offers</h3>
      <div className="bg-[#FCAE61] rounded-lg p-6 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-sm">

        {/* Decorative elements - trying to mimic the plane/gifts with icons if actual assets aren't available */}
        <div className="absolute right-10 top-2 opacity-20 pointer-events-none transform rotate-12">
            <PaperAirplaneIcon className="h-24 w-24 text-white" />
        </div>
        <div className="absolute right-32 bottom-2 opacity-20 pointer-events-none transform -rotate-12">
            <GiftIcon className="h-16 w-16 text-white" />
        </div>

        <div className="flex flex-col sm:flex-row items-center z-10 w-full sm:w-auto">
          <button
            onClick={() => history.push('/register')}
            className="bg-[#FF385C] text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-[#ff1f48] transition-colors mb-4 sm:mb-0 sm:mr-6 whitespace-nowrap"
          >
            Join now
          </button>

          <span className="text-white text-lg sm:text-xl font-bold text-center sm:text-left">
            Exclusive prices for Gaith Tours members
          </span>
        </div>

        {/* Right side illustration placeholder or empty space since we used absolute icons */}
        <div className="hidden sm:block w-32"></div>
      </div>
    </section>
  );
};
