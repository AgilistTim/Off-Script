import React from 'react';
import { MessageCircle, Sparkles, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const DiscoverCareerPath: React.FC = () => {
  const navigate = useNavigate();

  const handleGetInsights = () => {
    // Navigate to the conversation interface
    navigate('/chat');
  };

  return (
    <section id="discover" className="py-section bg-gray-50">
      <div className="container text-center">
        
        {/* Main Heading */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary-black mb-6">
            Discover Your Career Path
          </h2>
          
          <p className="text-lg lg:text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
            AI-powered conversation that creates your personalized career profile in real-time
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          
          {/* Voice & Chat */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-primary-blue/30 transition-all duration-brand group">
            <div className="w-16 h-16 bg-primary-blue/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-blue/20 transition-colors duration-brand">
              <MessageCircle className="h-8 w-8 text-primary-blue" />
            </div>
            <h3 className="text-xl font-bold text-primary-black mb-3">
              Voice & Chat
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Natural conversation
            </p>
          </div>

          {/* AI Analysis */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-primary-lavender/50 transition-all duration-brand group">
            <div className="w-16 h-16 bg-primary-lavender/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-lavender/20 transition-colors duration-brand">
              <Sparkles className="h-8 w-8 text-primary-lavender" />
            </div>
            <h3 className="text-xl font-bold text-primary-black mb-3">
              AI Analysis
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Authentic insights
            </p>
          </div>

          {/* Career Matches */}
          <div className="bg-white p-8 rounded-2xl border border-gray-200 hover:border-primary-green/50 transition-all duration-brand group">
            <div className="w-16 h-16 bg-primary-green/10 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-primary-green/20 transition-colors duration-brand">
              <Brain className="h-8 w-8 text-primary-green" />
            </div>
            <h3 className="text-xl font-bold text-primary-black mb-3">
              Career Matches
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Personalized
              <br />
              recommendations
            </p>
          </div>
        </div>

        {/* Main CTA Button */}
        <div className="mb-8">
          <button
            onClick={handleGetInsights}
            className="bg-primary-blue hover:bg-primary-blue/90 text-white px-12 py-4 rounded-2xl text-lg font-semibold transition-all duration-brand transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Real Insights Now
          </button>
        </div>

        {/* Footer Text */}
        <p className="text-text-secondary text-base">
          No signup required • Get AI insights instantly
        </p>
      </div>
    </section>
  );
};

export default DiscoverCareerPath; 