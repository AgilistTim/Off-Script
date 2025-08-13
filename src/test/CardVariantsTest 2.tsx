import React from 'react';
import { DesignProvider } from '../context/DesignContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, ContextualCard } from '../components/ui/card';
import { Button } from '../components/ui/button';

// Test component to verify card variants work correctly
const CardVariantsTest: React.FC = () => {
  return (
    <div className="p-6 space-y-12 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center">Card Variants Test</h1>
      
      {/* Standard Card Variants */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Standard Card Variants</h2>
        
        {/* Legacy variant */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Legacy Variant (Preserved)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
                <CardDescription>This is the classic default card that existing code still uses.</CardDescription>
              </CardHeader>
              <CardContent>
                <p>All existing card usage continues to work without any changes.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dice.fm inspired variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dice.fm Inspired - Energetic Punk Styling</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="energetic">
              <CardHeader>
                <CardTitle>ENERGETIC CARD</CardTitle>
                <CardDescription>High-energy punk aesthetic with rotation!</CardDescription>
              </CardHeader>
              <CardContent>
                <p>This card has brutal shadows, bold borders, and glitch-inspired transforms. Perfect for CTAs!</p>
              </CardContent>
            </Card>
            
            <Card variant="punk">
              <CardHeader>
                <CardTitle>PUNK VIBES</CardTitle>
                <CardDescription>Raw, rebellious, DIY energy</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Rough edges, no rounded corners, authentic street-art feel with rotation effects.</p>
              </CardContent>
            </Card>
            
            <Card variant="fresh">
              <CardHeader>
                <CardTitle>Fresh Growth</CardTitle>
                <CardDescription>Green energy for new opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Scales on hover, perfect for highlighting new career paths and discoveries.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Calm.com inspired variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Calm.com Inspired - Serene Styling</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="calm">
              <CardHeader>
                <CardTitle>Calm Reflection</CardTitle>
                <CardDescription>Peaceful, mindful, breathing space</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Soft shadows, rounded corners, gentle breathing animation. Creates a sense of tranquility.</p>
              </CardContent>
            </Card>
            
            <Card variant="serene">
              <CardHeader>
                <CardTitle>Serene Wisdom</CardTitle>
                <CardDescription>Gentle guidance and support</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Ultra-soft styling with smooth transitions, perfect for contemplative content.</p>
              </CardContent>
            </Card>
            
            <Card variant="soft">
              <CardHeader>
                <CardTitle>Soft Touch</CardTitle>
                <CardDescription>Delicate, caring, supportive</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Backdrop blur, subtle colors, maximum gentleness for sensitive interactions.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Hybrid variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Hybrid Variants - Best of Both Worlds</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card variant="hybrid">
              <CardHeader>
                <CardTitle>Hybrid Excellence</CardTitle>
                <CardDescription>Balanced energy with calming undertones</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Gradient backgrounds, gentle floating animation, perfect blend of energetic and calm aesthetics.</p>
              </CardContent>
            </Card>
            
            <Card variant="balanced">
              <CardHeader>
                <CardTitle>Balanced Approach</CardTitle>
                <CardDescription>Equilibrium between all elements</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Clean gradients with smart border changes, ideal for main content areas.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Special gradient variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Special Gradient Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="sunset">
              <CardHeader>
                <CardTitle>Sunset Vibes</CardTitle>
                <CardDescription>Warm endings and reflections</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Perfect for end-of-session summaries, achievements, and warm conclusions.</p>
              </CardContent>
            </Card>
            
            <Card variant="ocean">
              <CardHeader>
                <CardTitle>Ocean Depths</CardTitle>
                <CardDescription>Deep exploration and vast possibilities</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Cool, calming gradients for exploration and discovery of new career depths.</p>
              </CardContent>
            </Card>
            
            <Card variant="nature">
              <CardHeader>
                <CardTitle>Natural Growth</CardTitle>
                <CardDescription>Organic career development</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Green-to-mint gradients representing natural, sustainable career growth.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Size and Elevation Variants */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">Size and Elevation Options</h2>
        
        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Size Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="hybrid" size="compact">
              <CardContent>Compact card with minimal padding</CardContent>
            </Card>
            <Card variant="hybrid" size="sm">
              <CardContent>Small card for tight spaces</CardContent>
            </Card>
            <Card variant="hybrid" size="default">
              <CardContent>Default size card with standard padding</CardContent>
            </Card>
            <Card variant="hybrid" size="lg">
              <CardContent>Large card with generous padding</CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-semibold">Elevation Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card variant="calm" elevation="flat">
              <CardContent>Flat - No shadow</CardContent>
            </Card>
            <Card variant="calm" elevation="low">
              <CardContent>Low elevation</CardContent>
            </Card>
            <Card variant="calm" elevation="medium">
              <CardContent>Medium elevation</CardContent>
            </Card>
            <Card variant="calm" elevation="high">
              <CardContent>High elevation</CardContent>
            </Card>
            <Card variant="energetic" elevation="brutal">
              <CardContent>BRUTAL shadow!</CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contextual Cards in Different Design Modes */}
      <section className="space-y-8">
        <h2 className="text-2xl font-semibold">Contextual Cards by Design Mode</h2>
        
        {/* Energetic/Dice Mode */}
        <DesignProvider mode={{ aesthetic: 'dice', energy: 'high', interaction: 'energetic' }}>
          <div className="p-6 border-2 border-red-500 rounded-lg bg-red-50">
            <h3 className="text-lg font-semibold mb-4">Dice.fm Mode (Energetic Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContextualCard purpose="interactive">
                <CardHeader>
                  <CardTitle>Interactive Card</CardTitle>
                </CardHeader>
                <CardContent>Automatically energetic for interactions!</CardContent>
              </ContextualCard>
              
              <ContextualCard purpose="highlight">
                <CardHeader>
                  <CardTitle>Highlight Card</CardTitle>
                </CardHeader>
                <CardContent>Punk styling to grab attention!</CardContent>
              </ContextualCard>
              
              <ContextualCard purpose="content" mood="neutral">
                <CardHeader>
                  <CardTitle>Content Card</CardTitle>
                </CardHeader>
                <CardContent>High-energy content presentation!</CardContent>
              </ContextualCard>
            </div>
          </div>
        </DesignProvider>

        {/* Calm Mode */}
        <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-blue-500 rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold mb-4">Calm.com Mode (Serene Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContextualCard purpose="data">
                <CardHeader>
                  <CardTitle>Data Card</CardTitle>
                </CardHeader>
                <CardContent>Clean, readable data presentation</CardContent>
              </ContextualCard>
              
              <ContextualCard purpose="content" mood="calm">
                <CardHeader>
                  <CardTitle>Calm Content</CardTitle>
                </CardHeader>
                <CardContent>Peaceful, breathing content space</CardContent>
              </ContextualCard>
              
              <ContextualCard purpose="navigation">
                <CardHeader>
                  <CardTitle>Navigation</CardTitle>
                </CardHeader>
                <CardContent>Balanced navigation element</CardContent>
              </ContextualCard>
            </div>
          </div>
        </DesignProvider>

        {/* Hybrid Mode */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-green-500 rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold mb-4">Hybrid Mode (Balanced Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ContextualCard purpose="content">
                <CardHeader>
                  <CardTitle>Adaptive Content</CardTitle>
                  <CardDescription>Automatically balanced styling</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>This card adapts to the hybrid context, providing the perfect balance of energy and calm.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="hybrid">Perfect Balance</Button>
                </CardFooter>
              </ContextualCard>
              
              <ContextualCard mood="warm" purpose="highlight">
                <CardHeader>
                  <CardTitle>Warm Highlight</CardTitle>
                  <CardDescription>Emphasized with warmth</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Even in hybrid mode, specific moods can override the context for targeted emotional impact.</p>
                </CardContent>
                <CardFooter>
                  <Button variant="warm">Warm Action</Button>
                </CardFooter>
              </ContextualCard>
            </div>
          </div>
        </DesignProvider>
      </section>

      {/* Animation Demo */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Animation Effects Demo</h2>
        <p className="text-gray-600">
          Hover over the cards to see different animation effects: rotations, scaling, floating, breathing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card variant="energetic">
            <CardContent>Hover for rotation + shadow change!</CardContent>
          </Card>
          <Card variant="calm">
            <CardContent>Breathing animation + glow on hover</CardContent>
          </Card>
          <Card variant="fresh">
            <CardContent>Scale transform on hover</CardContent>
          </Card>
          <Card variant="hybrid">
            <CardContent>Gentle floating + shadow shift</CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default CardVariantsTest;
