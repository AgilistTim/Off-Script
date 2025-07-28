import React from 'react';
import Header from './Header';
import Hero from './Hero';
import SpeechBubbleTiles from './SpeechBubbleTiles';
import UKPathwaysSection from './UKPathwaysSection';
import DiscoverCareerPath from './DiscoverCareerPath';
import Footer from './Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-primary-white">
      {/* Header with transparent overlay on hero */}
      <Header />
      
      {/* Hero Section */}
      <Hero />
      
      {/* Speech Bubble Tiles Section */}
      <SpeechBubbleTiles />
      
      {/* UK Alternative Career Pathways Section */}
      <UKPathwaysSection />
      
      {/* Discover Your Career Path Section */}
      <DiscoverCareerPath />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage; 