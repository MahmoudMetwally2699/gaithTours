import React, { useState, useCallback } from 'react';
import { MainSection } from '../components/MainSection';
import { SuggestedHotels } from '../components/SuggestedHotels';
import { OffersBanner } from '../components/OffersBanner';
import { ForNewUsers } from '../components/ForNewUsers';
import { PopularProperties } from '../components/PopularProperties';
import { PopularCities } from '../components/PopularCities';
import { PopularCitiesWorldwide } from '../components/PopularCitiesWorldwide';
import { PaymentMethods } from '../components/PaymentMethods';
import { Preloader } from '../components/Preloader';
import { LazySection } from '../components/LazySection';

export const Home: React.FC = () => {
  const [suggestedLoaded, setSuggestedLoaded] = useState(false);
  const [popularLoaded, setPopularLoaded] = useState(false);

  const isContentLoaded = suggestedLoaded && popularLoaded;

  // Callbacks for each section
  const handleSuggestedLoaded = useCallback(() => {
    setSuggestedLoaded(true);
  }, []);

  const handlePopularLoaded = useCallback(() => {
    setPopularLoaded(true);
  }, []);

  return (
    <>
      <Preloader isLoading={!isContentLoaded} minDisplayTime={800} />
      <div className="flex flex-col min-h-screen overflow-x-clip">
        <MainSection />
        <ForNewUsers />
        <SuggestedHotels onLoaded={handleSuggestedLoaded} />
        <OffersBanner />
        <PopularProperties onLoaded={handlePopularLoaded} />
        <LazySection height="350px" skeleton="city-cards">
          <PopularCities />
        </LazySection>
        <LazySection height="350px" skeleton="city-cards">
          <PopularCitiesWorldwide />
        </LazySection>
        <LazySection height="300px" skeleton="simple">
          <PaymentMethods />
        </LazySection>
      </div>
    </>
  );
};
