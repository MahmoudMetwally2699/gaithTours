import React from 'react';
import { MainSection } from '../components/MainSection';
import { InfographicSection } from '../components/InfographicSection';
import { SpecialPricingCard } from '../components/SpecialPricingCard';
import { SaudiDestinations } from '../components/SaudiDestinations';
import { ExploreDestinations } from '../components/ExploreDestinations';
import { BookingProcess } from '../components/BookingProcess';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <MainSection />
      <InfographicSection />
      <SpecialPricingCard />
      <SaudiDestinations />
      <ExploreDestinations />
      <BookingProcess />
    </div>
  );
};
