import React from 'react';
import { MainSection } from '../components/MainSection';
import { InfographicSection } from '../components/InfographicSection';
import { SpecialPricingCard } from '../components/SpecialPricingCard';
import { ExploreDestinations } from '../components/ExploreDestinations';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <MainSection />
      <InfographicSection />
      <SpecialPricingCard />
      <ExploreDestinations />
    </div>
  );
};
