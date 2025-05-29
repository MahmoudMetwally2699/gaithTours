import React from 'react';
import { HeroSlider } from '../components/HeroSlider';
import { HolidayPackages } from '../components/HolidayPackages';
import { FeaturedHotels } from '../components/FeaturedHotels';
import { WhyChooseUs } from '../components/WhyChooseUs';

export const Home: React.FC = () => {
  return (
    <div className="min-h-screen">
      <HeroSlider />
      <HolidayPackages />
      <FeaturedHotels />
      <WhyChooseUs />
    </div>
  );
};
