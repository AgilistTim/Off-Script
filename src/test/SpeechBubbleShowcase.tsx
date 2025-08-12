import React from 'react';
import { DesignProvider } from '../context/DesignContext';
import { SpeechBubble, ContextualSpeechBubble } from '../components/ui/speech-bubble';

// Test component to showcase the new speech bubble components
const SpeechBubbleShowcase: React.FC = () => {
  return (
    <div className="p-6 space-y-12 bg-gradient-organic min-h-screen">
      <h1 className="text-3xl font-bold text-center text-primary-black">Speech Bubble Showcase</h1>
      
      {/* Conversation Example */}
      <section className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl font-semibold text-primary-black">Sample Conversation</h2>
        
        <div className="space-y-4">
          {/* Assistant message */}
          <div className="flex justify-start">
            <SpeechBubble variant="assistant" size="default">
              Hello! I'm here to help you explore career opportunities. What kind of work interests you?
            </SpeechBubble>
          </div>
          
          {/* User message */}
          <div className="flex justify-end">
            <SpeechBubble variant="user" size="default" isUser={true}>
              I'm interested in tech, but I'm not sure if I need a computer science degree.
            </SpeechBubble>
          </div>
          
          {/* Assistant energetic response */}
          <div className="flex justify-start">
            <SpeechBubble variant="assistant-energetic" size="lg">
              Great question! You definitely don't need a CS degree to break into tech. Let me show you some alternative pathways that could get you there faster and cheaper!
            </SpeechBubble>
          </div>
          
          {/* User excited response */}
          <div className="flex justify-end">
            <SpeechBubble variant="user-energetic" size="default" isUser={true}>
              Really? That sounds amazing! Tell me more!
            </SpeechBubble>
          </div>
          
          {/* Assistant calm, informative response */}
          <div className="flex justify-start">
            <SpeechBubble variant="assistant-calm" size="lg">
              Absolutely. Bootcamps typically cost £8K and take 3-6 months, compared to £35K+ and 3-4 years for university. Many bootcamp graduates get hired within 6 months of completing their program.
            </SpeechBubble>
          </div>
        </div>
      </section>

      {/* All Variants Showcase */}
      <section className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-2xl font-semibold text-primary-black text-center">All Speech Bubble Variants</h2>
        
        {/* User variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary-black">User Messages (Right-aligned)</h3>
          <div className="space-y-3">
            <div className="flex justify-end">
              <SpeechBubble variant="user" isUser={true}>Standard user message</SpeechBubble>
            </div>
            <div className="flex justify-end">
              <SpeechBubble variant="user-energetic" isUser={true}>Energetic user message with bold styling!</SpeechBubble>
            </div>
            <div className="flex justify-end">
              <SpeechBubble variant="user-calm" isUser={true}>Calm, thoughtful user message</SpeechBubble>
            </div>
          </div>
        </div>

        {/* Assistant variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary-black">Assistant Messages (Left-aligned)</h3>
          <div className="space-y-3">
            <div className="flex justify-start">
              <SpeechBubble variant="assistant">Standard assistant response</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant-energetic">Energetic assistant response with excitement!</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant-calm">Calm, supportive assistant response</SpeechBubble>
            </div>
          </div>
        </div>

        {/* Special variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary-black">Special Variants</h3>
          <div className="space-y-3">
            <div className="flex justify-center">
              <SpeechBubble variant="system">System message - centered and neutral</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="warm">Warm, caring message tone</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="fresh">Fresh, energetic message with green vibes</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="soft">Soft, gentle message with lavender tones</SpeechBubble>
            </div>
          </div>
        </div>

        {/* Size variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary-black">Size Variants</h3>
          <div className="space-y-3">
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" size="sm">Small speech bubble</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" size="default">Default size speech bubble</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" size="lg">Large speech bubble with more content space</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" size="xl">Extra large speech bubble for longer conversations and detailed explanations</SpeechBubble>
            </div>
          </div>
        </div>

        {/* Animation variants */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-primary-black">Animation Effects</h3>
          <div className="space-y-3">
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" animation="fadeIn">Fade in animation</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" animation="slideIn">Slide in animation</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" animation="bounceIn">Bounce in animation</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant-calm" animation="breathe">Breathing animation (calm)</SpeechBubble>
            </div>
            <div className="flex justify-start">
              <SpeechBubble variant="assistant" animation="float">Gentle floating animation</SpeechBubble>
            </div>
          </div>
        </div>
      </section>

      {/* Contextual Speech Bubbles in Different Design Modes */}
      <section className="max-w-6xl mx-auto space-y-8">
        <h2 className="text-2xl font-semibold text-primary-black text-center">Contextual Speech Bubbles</h2>
        
        {/* Energetic Context */}
        <DesignProvider mode={{ aesthetic: 'dice', energy: 'high', interaction: 'energetic' }}>
          <div className="p-6 border-2 border-red-500 rounded-lg bg-red-50">
            <h3 className="text-lg font-semibold mb-4">Dice.fm Mode (Energetic Context)</h3>
            <div className="space-y-3">
              <div className="flex justify-start">
                <ContextualSpeechBubble mood="neutral">
                  In energetic context, I automatically get energetic styling!
                </ContextualSpeechBubble>
              </div>
              <div className="flex justify-end">
                <ContextualSpeechBubble mood="neutral" isUser={true}>
                  Me too! User messages get energetic variants in this context.
                </ContextualSpeechBubble>
              </div>
            </div>
          </div>
        </DesignProvider>

        {/* Calm Context */}
        <DesignProvider mode={{ aesthetic: 'calm', energy: 'low', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-blue-500 rounded-lg bg-blue-50">
            <h3 className="text-lg font-semibold mb-4">Calm.com Mode (Serene Context)</h3>
            <div className="space-y-3">
              <div className="flex justify-start">
                <ContextualSpeechBubble mood="neutral">
                  In calm context, I automatically get gentle, serene styling.
                </ContextualSpeechBubble>
              </div>
              <div className="flex justify-end">
                <ContextualSpeechBubble mood="neutral" isUser={true}>
                  The conversation feels more peaceful and thoughtful here.
                </ContextualSpeechBubble>
              </div>
            </div>
          </div>
        </DesignProvider>

        {/* Hybrid Context */}
        <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'gentle' }}>
          <div className="p-6 border-2 border-green-500 rounded-lg bg-green-50">
            <h3 className="text-lg font-semibold mb-4">Hybrid Mode (Balanced Context)</h3>
            <div className="space-y-3">
              <div className="flex justify-start">
                <ContextualSpeechBubble mood="neutral">
                  In hybrid context, I get balanced styling that works for all moods.
                </ContextualSpeechBubble>
              </div>
              <div className="flex justify-end">
                <ContextualSpeechBubble mood="energetic" isUser={true}>
                  But I can still override with specific moods like energetic!
                </ContextualSpeechBubble>
              </div>
              <div className="flex justify-start">
                <ContextualSpeechBubble mood="calm">
                  Or I can be specifically calm when the conversation calls for it.
                </ContextualSpeechBubble>
              </div>
            </div>
          </div>
        </DesignProvider>
      </section>

      {/* Usage Guidelines */}
      <section className="max-w-4xl mx-auto space-y-4">
        <h2 className="text-2xl font-semibold text-primary-black text-center">Usage Guidelines</h2>
        <div className="bg-primary-white/60 backdrop-blur-sm rounded-2xl p-6 border border-primary-black/10">
          <ul className="space-y-3 text-primary-black">
            <li><strong>Basic Usage:</strong> Use `SpeechBubble` for direct control over styling</li>
            <li><strong>Context-Aware:</strong> Use `ContextualSpeechBubble` to automatically adapt to design context</li>
            <li><strong>User vs Assistant:</strong> Set `isUser={true}` for user messages, defaults to assistant styling</li>
            <li><strong>Moods:</strong> Use mood props ('energetic', 'calm', 'neutral', 'warm', 'fresh') to override context</li>
            <li><strong>Animations:</strong> Choose from fadeIn, slideIn, bounceIn, breathe, float, or none</li>
            <li><strong>Tails:</strong> Speech bubble tails automatically match the variant colors and position</li>
          </ul>
        </div>
      </section>
    </div>
  );
};

export default SpeechBubbleShowcase;
