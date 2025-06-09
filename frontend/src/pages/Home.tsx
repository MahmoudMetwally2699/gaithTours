import React from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { OurMissionModern } from '../components/OurMissionModern';
import { WhyChooseUsModern } from '../components/WhyChooseUsFixed';
import { OurServicesSimple } from '../components/OurServicesSimple';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <HeroSlider />
      <OurMissionModern />
      <WhyChooseUsModern />
      <OurServicesSimple />
    </div>
  );
};
