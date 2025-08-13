import React from 'react';
import { DesignProvider } from '../context/DesignContext';
import { Button, ContextualButton } from '../components/ui/button';

// Test component to verify button variants work correctly
const ButtonVariantsTest: React.FC = () => {
  return (
    <div className="p-6 space-y-8 bg-gray-50">
      <h1 className="text-2xl font-bold">Button Variants Test</h1>
      
      {/* Standard Button Variants */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Standard Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          {/* Legacy variants - should still work */}
          <Button variant="black">Black (Legacy)</Button>
          <Button variant="white">White (Legacy)</Button>
          <Button variant="default">Default (Legacy)</Button>
          
          {/* New hybrid variants */}
          <Button variant="energetic">Energetic</Button>
          <Button variant="calm">Calm</Button>
          <Button variant="hybrid">Hybrid</Button>
          <Button variant="fresh">Fresh</Button>
          <Button variant="warm">Warm</Button>
          <Button variant="soft">Soft</Button>
        </div>
      </section>

      {/* Contextual Buttons in Different Design Modes */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Contextual Buttons by Design Mode</h2>
        
        {/* Energetic/Dice Mode */}
        <DesignProvider mode={{ aesthetic: 'dice', energy: 'high', interaction: 'energetic' }}>
          <div className="p-4 border-2 border-red-500 rounded-lg bg-red-50">
            <h3 className="font-semibold mb-3">Dice.fm Mode (Energetic)</h3>
            <div className="flex flex-wrap gap-3">
              <ContextualButton intent="cta">CTA Button</ContextualButton>
              <ContextualButton intent="primary">Primary Button</ContextualButton>
              <ContextualButton intent="secondary">Secondary Button</ContextualButton>
              <ContextualButton intent="navigation">Navigation Button</ContextualButton>
              <ContextualButton intent="form">Form Button</ContextualButton>
            </div>
          </div>
        </DesignProvider>

        {/* Calm Mode */}
        <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
          <div className="p-4 border-2 border-blue-500 rounded-lg bg-blue-50">
            <h3 className="font-semibold mb-3">Calm.com Mode (Serene)</h3>
            <div className="flex flex-wrap gap-3">
              <ContextualButton intent="cta">CTA Button</ContextualButton>
              <ContextualButton intent="primary">Primary Button</ContextualButton>
              <ContextualButton intent="secondary">Secondary Button</ContextualButton>
              <ContextualButton intent="navigation">Navigation Button</ContextualButton>
              <ContextualButton intent="form">Form Button</ContextualButton>
            </div>
          </div>
        </DesignProvider>

        {/* Hybrid Mode */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <div className="p-4 border-2 border-green-500 rounded-lg bg-green-50">
            <h3 className="font-semibold mb-3">Hybrid Mode (Balanced)</h3>
            <div className="flex flex-wrap gap-3">
              <ContextualButton intent="cta">CTA Button</ContextualButton>
              <ContextualButton intent="primary">Primary Button</ContextualButton>
              <ContextualButton intent="secondary">Secondary Button</ContextualButton>
              <ContextualButton intent="navigation">Navigation Button</ContextualButton>
              <ContextualButton intent="form">Form Button</ContextualButton>
            </div>
          </div>
        </DesignProvider>
      </section>

      {/* Size Variations */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Size Variations with New Aesthetics</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="w-16 text-sm">Small:</span>
            <Button variant="energetic" size="sm">Energetic Small</Button>
            <Button variant="calm" size="sm">Calm Small</Button>
            <Button variant="hybrid" size="sm">Hybrid Small</Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-16 text-sm">Default:</span>
            <Button variant="energetic">Energetic Default</Button>
            <Button variant="calm">Calm Default</Button>
            <Button variant="hybrid">Hybrid Default</Button>
          </div>
          <div className="flex items-center gap-4">
            <span className="w-16 text-sm">Large:</span>
            <Button variant="energetic" size="lg">Energetic Large</Button>
            <Button variant="calm" size="lg">Calm Large</Button>
            <Button variant="hybrid" size="lg">Hybrid Large</Button>
          </div>
        </div>
      </section>

      {/* Hover States Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Hover Effects Demo</h2>
        <p className="text-sm text-gray-600">Hover over the buttons to see transition effects</p>
        <div className="flex flex-wrap gap-4">
          <Button variant="energetic">Hover for Glitch Effect</Button>
          <Button variant="calm">Hover for Smooth Transition</Button>
          <Button variant="hybrid">Hover for Transform Effect</Button>
          <Button variant="fresh">Hover for Color Change</Button>
        </div>
      </section>
    </div>
  );
};

export default ButtonVariantsTest;
