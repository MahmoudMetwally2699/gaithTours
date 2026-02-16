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
import { WhyBookWithGaith } from '../components/WhyBookWithGaith';
import { HomeGuestReviews } from '../components/HomeGuestReviews';
import { DestinationGuides } from '../components/DestinationGuides';

export const Home: React.FC = () => {
  const [isContentLoaded, setIsContentLoaded] = useState(false);

  // Callback to be called when SuggestedHotels finishes loading
  const handleContentLoaded = useCallback(() => {
    setIsContentLoaded(true);
  }, []);

  return (
    <>
      <Preloader isLoading={!isContentLoaded} minDisplayTime={400} />
      <div className="flex flex-col min-h-screen overflow-x-clip">
        <MainSection />
        <ForNewUsers />
        <LazySection height="400px" skeleton="hotel-cards">
          <PopularProperties />
        </LazySection>
        <OffersBanner />
        <SuggestedHotels onLoaded={handleContentLoaded} />
        <LazySection height="200px" skeleton="simple">
          <WhyBookWithGaith />
        </LazySection>
        <LazySection height="350px" skeleton="city-cards">
          <PopularCities />
        </LazySection>
        <LazySection height="350px" skeleton="hotel-cards">
          <HomeGuestReviews />
        </LazySection>
        <LazySection height="400px" skeleton="city-cards">
          <DestinationGuides />
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
