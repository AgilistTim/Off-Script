import React from 'react';
import { MessageCircle, Sparkles, Brain } from 'lucide-react';
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
          <h2 className="text-4xl lg:text-6xl font-bold text-black mb-8 leading-tight">
            Discover Your Career Path
          </h2>
          
          <p className="text-xl lg:text-2xl text-text-secondary leading-relaxed max-w-3xl mx-auto mb-12">
            AI-powered conversation that creates your personalized career profile in real-time
          </p>

          {/* Prominent Main CTA */}
          <div className="mb-16">
            <button
              onClick={handleGetInsights}
              className="bg-blue-600 hover:bg-blue-700 text-white px-16 py-6 rounded-2xl text-xl font-bold transition-all duration-brand transform hover:scale-105 shadow-2xl hover:shadow-3xl inline-flex items-center space-x-3"
            >
              <span>Get Real Insights Now</span>
              <Sparkles className="h-6 w-6" />
            </button>
            <p className="text-text-secondary text-lg mt-4 font-medium">
              No signup required • Get AI insights instantly
            </p>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          
          {/* Voice & Chat */}
          <div className="bg-white p-10 rounded-3xl border-2 border-gray-100 hover:border-blue-300/30 transition-all duration-brand group hover:shadow-2xl">
            <div className="w-20 h-20 bg-blue-100/10 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-blue-100/20 transition-colors duration-brand group-hover:scale-110">
              <MessageCircle className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Voice & Chat
            </h3>
            <p className="text-text-secondary leading-relaxed text-lg">
              Natural conversation interface powered by advanced AI
            </p>
          </div>

          {/* AI Analysis */}
          <div className="bg-white p-10 rounded-3xl border-2 border-gray-100 hover:border-purple-300/50 transition-all duration-brand group hover:shadow-2xl">
            <div className="w-20 h-20 bg-purple-100/10 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-purple-100/20 transition-colors duration-brand group-hover:scale-110">
              <Sparkles className="h-10 w-10 text-purple-500" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              AI Analysis
            </h3>
            <p className="text-text-secondary leading-relaxed text-lg">
              Authentic insights from real UK job market data
            </p>
          </div>

          {/* Career Matches */}
          <div className="bg-white p-10 rounded-3xl border-2 border-gray-100 hover:border-green-300/50 transition-all duration-brand group hover:shadow-2xl">
            <div className="w-20 h-20 bg-green-100/10 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:bg-green-100/20 transition-colors duration-brand group-hover:scale-110">
              <Brain className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-black mb-4">
              Career Matches
            </h3>
            <p className="text-text-secondary leading-relaxed text-lg">
              Personalized recommendations based on your unique profile
            </p>
          </div>
        </div>

        {/* Secondary CTA */}
        <div className="mt-16">
          <button
            onClick={handleGetInsights}
            className="bg-black hover:bg-orange-500 text-white hover:text-black px-12 py-4 rounded-button text-lg font-semibold transition-all duration-brand transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Your Free Career Analysis →
          </button>
        </div>
      </div>
    </section>
  );
};

export default DiscoverCareerPath; 