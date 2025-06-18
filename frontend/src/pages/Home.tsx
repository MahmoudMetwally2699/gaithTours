import React from 'react';
import { MainSection } from '../components/MainSection';
import { InfographicSection } from '../components/InfographicSection';
import { WhyChooseUsModern } from '../components/WhyChooseUsFixed';
import { OurServicesSimple } from '../components/OurServicesSimple';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <MainSection />
      <InfographicSection />
      <WhyChooseUsModern />
      <OurServicesSimple />
    </div>
  );
};
