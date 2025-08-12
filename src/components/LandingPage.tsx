import React from 'react';
import Header from './Header';
import Hero from './Hero';
import SpeechBubbleTiles from './SpeechBubbleTiles';
import UKPathwaysSection from './UKPathwaysSection';
import Footer from './Footer';
import { DesignProvider } from '../context/DesignContext';

const LandingPage: React.FC = () => {
  return (
    <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
      <div className="min-h-screen bg-gradient-organic text-primary-black">
        {/* Header with transparent overlay on hero */}
        <Header />
        
        {/* Hero Section - Energetic Context for CTAs */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'high', interaction: 'energetic' }}>
          <Hero />
        </DesignProvider>
        
        {/* Speech Bubble Tiles Section - Balanced Context */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <SpeechBubbleTiles />
        </DesignProvider>
        
        {/* UK Alternative Career Pathways Section - Calm Context for Reading */}
        <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
          <UKPathwaysSection />
        </DesignProvider>
        
        {/* Footer - Balanced Context */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <Footer />
        </DesignProvider>
      </div>
    </DesignProvider>
  );
};

export default LandingPage; 