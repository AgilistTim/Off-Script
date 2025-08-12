import React from 'react';
import { DesignProvider } from '../context/DesignContext';
import { Speech, ContextualSpeech } from '../components/ui/button';

// Test component to verify speech bubble variants work correctly
const SpeechBubbleTest: React.FC = () => {
  return (
    <div className="p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold">Speech Bubble Variants Test</h1>
      
      {/* Standard Speech Bubble Variants */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Standard Speech Bubble Variants</h2>
        
        {/* Legacy variants - should still work */}
        <div className="space-y-4">
          <h3 className="font-semibold">Legacy Variants (Preserved)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Speech variant="blue" href="#" className="block">
              This is the classic blue speech bubble that's been with us from the beginning.
            </Speech>
            <Speech variant="peach" href="#" className="block">
              And here's the warm peach variant that users are familiar with.
            </Speech>
          </div>
        </div>

        {/* New hybrid variants */}
        <div className="space-y-4">
          <h3 className="font-semibold">New Hybrid Aesthetic Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Speech variant="energetic" href="#" className="block">
              ENERGETIC! This bubble has that dice.fm punk energy with glitch effects!
            </Speech>
            <Speech variant="calm" href="#" className="block">
              This calm bubble brings the serene, peaceful vibes from calm.com with gentle breathing.
            </Speech>
            <Speech variant="hybrid" href="#" className="block">
              The hybrid bubble blends both worlds - energetic yet balanced, perfect for OffScript.
            </Speech>
          </div>
        </div>

        {/* Additional color variants */}
        <div className="space-y-4">
          <h3 className="font-semibold">Additional Color Variants</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Speech variant="fresh" href="#" className="block">
              Fresh green vibes for growth, discovery, and new opportunities!
            </Speech>
            <Speech variant="warm" href="#" className="block">
              Warm peach tones that create connection and invite conversation.
            </Speech>
            <Speech variant="soft" href="#" className="block">
              Soft lavender for gentle, supportive, and caring interactions.
            </Speech>
          </div>
        </div>

        {/* Gradient variants */}
        <div className="space-y-4">
          <h3 className="font-semibold">Gradient Variants for Special Occasions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Speech variant="sunset" href="#" className="block">
              Sunset gradients for end-of-day reflections and warm closings.
            </Speech>
            <Speech variant="ocean" href="#" className="block">
              Ocean gradients for depth, exploration, and vast possibilities.
            </Speech>
            <Speech variant="nature" href="#" className="block">
              Nature gradients for organic growth and natural career paths.
            </Speech>
          </div>
        </div>
      </section>

      {/* Contextual Speech Bubbles in Different Design Modes */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">Contextual Speech Bubbles by Design Mode</h2>
        
        {/* Energetic/Dice Mode */}
        <DesignProvider mode={{ aesthetic: 'dice', energy: 'high', interaction: 'energetic' }}>
          <div className="p-6 border-2 border-red-500 rounded-lg bg-red-50">
            <h3 className="font-semibold mb-4">Dice.fm Mode (Energetic Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContextualSpeech mood="excited" href="#" className="block">
                EXCITED! This is high-energy, punk-inspired speech!
              </ContextualSpeech>
              <ContextualSpeech mood="neutral" href="#" className="block">
                Even neutral bubbles get energetic in this context!
              </ContextualSpeech>
              <ContextualSpeech mood="fresh" href="#" className="block">
                Fresh ideas with that energetic edge!
              </ContextualSpeech>
            </div>
          </div>
        </DesignProvider>

        {/* Calm Mode */}
        <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-blue-500 rounded-lg bg-blue-50">
            <h3 className="font-semibold mb-4">Calm.com Mode (Serene Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContextualSpeech mood="calm" href="#" className="block">
                Breathe deeply... this bubble radiates peace and tranquility.
              </ContextualSpeech>
              <ContextualSpeech mood="neutral" href="#" className="block">
                Neutral bubbles become soft and gentle in this serene context.
              </ContextualSpeech>
              <ContextualSpeech mood="warm" href="#" className="block">
                Warm, caring words that embrace and support you.
              </ContextualSpeech>
            </div>
          </div>
        </DesignProvider>

        {/* Hybrid Mode */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-green-500 rounded-lg bg-green-50">
            <h3 className="font-semibold mb-4">Hybrid Mode (Balanced Context)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <ContextualSpeech mood="excited" href="#" className="block">
                Balanced excitement - energetic but not overwhelming!
              </ContextualSpeech>
              <ContextualSpeech mood="neutral" href="#" className="block">
                Perfect balance between energy and calm in this hybrid bubble.
              </ContextualSpeech>
              <ContextualSpeech mood="calm" href="#" className="block">
                Calm moments within an energetic conversation flow.
              </ContextualSpeech>
            </div>
          </div>
        </DesignProvider>
      </section>

      {/* Animation Demo */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Animation Effects Demo</h2>
        <p className="text-sm text-gray-600">
          Watch the subtle animations: energetic bubbles have glitch effects, calm bubbles breathe, hybrid bubbles float gently.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Speech variant="energetic" href="#" className="block">
            Watch me glitch! Energetic animations bring that punk aesthetic to life.
          </Speech>
          <Speech variant="calm" href="#" className="block">
            I breathe slowly and peacefully, creating a sense of calm and mindfulness.
          </Speech>
          <Speech variant="hybrid" href="#" className="block">
            I float gently, combining the best of both energetic and calm animations.
          </Speech>
        </div>
      </section>

      {/* Triangle Pointer Test */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Triangle Pointer Color Matching</h2>
        <p className="text-sm text-gray-600">
          Verify that triangle pointers match their bubble background colors correctly.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Speech variant="energetic" href="#" className="block text-center">Yellow Triangle</Speech>
          <Speech variant="calm" href="#" className="block text-center">Mint Triangle</Speech>
          <Speech variant="fresh" href="#" className="block text-center">Green Triangle</Speech>
          <Speech variant="soft" href="#" className="block text-center">Lavender Triangle</Speech>
        </div>
      </section>
    </div>
  );
};

export default SpeechBubbleTest;
