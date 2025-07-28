import React from 'react';
import { Speech } from './ui/button';

const SpeechBubbleTiles: React.FC = () => {
  const tiles = [
    {
      id: 1,
      title: "YOUR FIRST PITCH: HOW TO SELL AN IDEA",
      color: "peach" as const,
      link: "#"
    },
    {
      id: 2,
      title: "FUTURE-PROOFING YOUR DEGREE: WHAT TO STUDY & WHY IT MATTERS",
      color: "mint" as const,
      link: "#"
    },
    {
      id: 3,
      title: "CAREER CLARITY: HOW TO CHOOSE A FIELD",
      color: "blue" as const,
      link: "#"
    },
    {
      id: 4,
      title: "APPRENTICESHIPS 2.0: EARNING, LEARNING, AND LEVELLING UP",
      color: "yellow" as const,
      link: "#"
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

  const getSpeechVariant = (color: string) => {
    if (color === 'peach') return 'peach' as const;
    return 'blue' as const; // Use blue as default for all others since we only have blue/peach speech variants
  };

  return (
    <section className="py-section bg-primary-white">
      <div className="container">
        {/* Grid of Speech Bubble Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {tiles.map((tile) => (
            <div key={tile.id} className="relative group">
              {/* Custom Speech Bubble with proper Off Script styling */}
              <div className={`
                relative w-full p-8 lg:p-12 
                ${getColorClasses(tile.color)}
                transition-all duration-brand
                group-hover:transform group-hover:scale-105
                cursor-pointer
                aspect-square
                flex items-center justify-center
                text-center
              `}>
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
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SpeechBubbleTiles; 