import React from 'react';
import { useNavigate } from 'react-router-dom';

const SpeechBubbleTiles: React.FC = () => {
  const navigate = useNavigate();
  
  const tiles = [
    {
      id: 1,
      title: "SKIP UNIVERSITY DEBT: ALTERNATIVE PATHWAYS TO UK CAREERS",
      color: "peach" as const,
      action: () => navigate('/chat')
    },
    {
      id: 2,
      title: "AI-POWERED CAREER MATCHING: FIND YOUR PERFECT UK JOB PATH",
      color: "mint" as const,
      action: () => navigate('/chat')
    },
    {
      id: 3,
      title: "REAL UK SALARIES: VERIFIED DATA FROM ACTUAL PROFESSIONALS",
      color: "blue" as const,
      action: () => navigate('/chat')
    },
    {
      id: 4,
      title: "APPRENTICESHIPS & BOOTCAMPS: EARNING WHILE LEARNING IN 2025",
      color: "yellow" as const,
      action: () => navigate('/chat')
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'peach':
        return 'bg-primary-peach text-primary-black';
      case 'mint':
        return 'bg-primary-mint text-primary-black';
      case 'blue':
        return 'bg-primary-blue text-primary-black';
      case 'yellow':
        return 'bg-primary-yellow text-primary-black';
      default:
        return 'bg-primary-blue text-primary-black';
    }
  };

  return (
    <section id="career-journey" className="py-section bg-primary-white">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-bold text-primary-black mb-6">
            Start Your Career Journey
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            Explore proven UK pathways that help you land meaningful careers without university debt
          </p>
        </div>

        {/* Grid of Speech Bubble Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {tiles.map((tile) => (
            <div key={tile.id} className="relative group">
              {/* Custom Speech Bubble with proper Off Script styling */}
              <button
                onClick={tile.action}
                className={`
                  relative w-full p-8 lg:p-12 
                  ${getColorClasses(tile.color)}
                  transition-all duration-brand
                  group-hover:transform group-hover:scale-105
                  cursor-pointer
                  aspect-square
                  flex items-center justify-center
                  text-center
                  border-none
                  focus:outline-none focus:ring-4 focus:ring-primary-blue/20
                `}
              >
                {/* Diagonal lines - top */}
                <div className="absolute top-4 left-4 right-4">
                  <div className="h-1 bg-primary-black transform -rotate-12"></div>
                </div>
                
                {/* Diagonal lines - bottom */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="h-1 bg-primary-black transform -rotate-12"></div>
                </div>

                {/* Content */}
                <h3 className="text-promo-fluid font-bold italic leading-tight">
                  {tile.title}
                </h3>

                {/* Speech bubble pointer triangle */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                  <div 
                    className={`w-0 h-0 border-l-[20px] border-r-[20px] border-l-transparent border-r-transparent ${
                      tile.color === 'peach' 
                        ? 'border-t-[20px] border-t-primary-peach'
                        : tile.color === 'mint'
                        ? 'border-t-[20px] border-t-primary-mint'
                        : tile.color === 'yellow'
                        ? 'border-t-[20px] border-t-primary-yellow'
                        : 'border-t-[20px] border-t-primary-blue'
                    }`}
                  />
                </div>
              </button>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <button
            onClick={() => navigate('/chat')}
            className="bg-primary-black hover:bg-primary-peach text-primary-white hover:text-primary-black px-12 py-4 rounded-button text-lg font-semibold transition-all duration-brand transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Start Your AI Career Conversation →
          </button>
          <p className="text-text-secondary text-sm mt-4">
            No signup required • Get personalized guidance instantly
          </p>
        </div>
      </div>
    </section>
  );
};

export default SpeechBubbleTiles; 