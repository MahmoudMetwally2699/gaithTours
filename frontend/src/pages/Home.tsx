import React, { useState, useCallback } from 'react';
import { MainSection } from '../components/MainSection';
import { SuggestedHotels } from '../components/SuggestedHotels';
import { OffersBanner } from '../components/OffersBanner';
import { ForNewUsers } from '../components/ForNewUsers';
import { PopularProperties } from '../components/PopularProperties';
import { PopularCities } from '../components/PopularCities';
import { PopularCitiesWorldwide } from '../components/PopularCitiesWorldwide';
import { Preloader } from '../components/Preloader';

export const Home: React.FC = () => {
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Callback to be called when SuggestedHotels finishes loading
  const handleContentLoaded = useCallback(() => {
    setIsContentLoaded(true);
  }, []);

  return (
    <>
      <Preloader isLoading={!isContentLoaded} minDisplayTime={1800} />
      <div className="flex flex-col min-h-screen overflow-x-clip">
        <MainSection />
        <SuggestedHotels onLoaded={handleContentLoaded} />
        <OffersBanner />
        <ForNewUsers />
        <PopularProperties />
        <PopularCities />
        <PopularCitiesWorldwide />
      </div>
    </>
  );
};
