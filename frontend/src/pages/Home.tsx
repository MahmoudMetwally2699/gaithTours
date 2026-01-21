import React from 'react';
import { MainSection } from '../components/MainSection';
import { SuggestedHotels } from '../components/SuggestedHotels';
import { OffersBanner } from '../components/OffersBanner';
import { PopularProperties } from '../components/PopularProperties';
import { PopularCities } from '../components/PopularCities';
import { PopularCitiesWorldwide } from '../components/PopularCitiesWorldwide';

export const Home: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen overflow-x-clip">
      <MainSection />
      <SuggestedHotels />
      <OffersBanner />
      <PopularProperties />
      <PopularCities />
      <PopularCitiesWorldwide />
    </div>
  );
};
