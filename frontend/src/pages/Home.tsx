import React from 'react';
import { MainSection } from '../components/MainSection';
import { OurMissionModern } from '../components/OurMissionModern';
import { WhyChooseUsModern } from '../components/WhyChooseUsFixed';
import { OurServicesSimple } from '../components/OurServicesSimple';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <MainSection />
      <OurMissionModern />
      <WhyChooseUsModern />
      <OurServicesSimple />
    </div>
  );
};
