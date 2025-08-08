import React from 'react';
import Header from './Header';
import Hero from './Hero';
import SpeechBubbleTiles from './SpeechBubbleTiles';
import UKPathwaysSection from './UKPathwaysSection';
import Footer from './Footer';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-gray to-primary-black text-primary-white">
      {/* Header with transparent overlay on hero */}
      <Header />
      
      {/* Hero Section */}
      <Hero />
      
      {/* Speech Bubble Tiles Section */}
      <SpeechBubbleTiles />
      
      {/* UK Alternative Career Pathways Section */}
      <UKPathwaysSection />
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage; 