import React from 'react';
import { Brain, Target, PoundSterling, Users, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UKPathwaysSection: React.FC = () => {
  const navigate = useNavigate();

  const offScriptCards = [
    {
      id: 1,
      title: "UK-Specific AI Guidance",
      description: "Personalized career recommendations based on real UK job market data and regional opportunities.",
      icon: Brain,
      bgColor: "bg-primary-blue",
      textColor: "text-primary-black"
    },
    {
      id: 2,
      title: "10x Faster Entry",
      description: "Alternative pathways: months not years to become career-ready with real-world skills.",
      icon: Target,
      bgColor: "bg-primary-peach", 
      textColor: "text-primary-black"
    },
    {
      id: 3,
      title: "Real UK Salaries",
      description: "Verified salary data from actual UK professionals, not estimates or outdated figures.",
      icon: PoundSterling,
      bgColor: "bg-green-400",
      textColor: "text-primary-black"
    },
    {
      id: 4,
      title: "50K+ Success Stories",
      description: "Join thousands who've launched careers without university debt across the UK.",
      icon: Users,
      bgColor: "bg-purple-400",
      textColor: "text-primary-black"
    }
  ];

  return (
    <section className="py-section bg-gray-50" id="career-journey">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-6xl font-bold text-primary-black mb-8">
            Why Choose Off Script?
          </h2>
          <p className="text-xl text-text-secondary leading-relaxed max-w-4xl mx-auto">
            Explore proven UK pathways that help you land meaningful careers without university debt
          </p>
        </div>

        {/* Off Script Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {offScriptCards.map((card) => {
            const IconComponent = card.icon;
            return (
              <div 
                key={card.id}
                className={`${card.bgColor} rounded-3xl p-8 hover:scale-105 transition-all duration-brand shadow-lg hover:shadow-2xl cursor-pointer group`}
                onClick={() => navigate('/chat')}
              >
                {/* Icon */}
                <div className="mb-6">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <IconComponent className={`h-8 w-8 ${card.textColor}`} />
                  </div>
                </div>

                {/* Content */}
                <h3 className={`text-2xl font-bold ${card.textColor} mb-4 group-hover:scale-105 transition-transform duration-brand`}>
                  {card.title}
                </h3>
                <p className={`${card.textColor}/90 text-lg leading-relaxed`}>
                  {card.description}
                </p>

                {/* Hover Arrow */}
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-brand">
                  <ArrowRight className={`h-6 w-6 ${card.textColor} transform translate-x-0 group-hover:translate-x-2 transition-transform duration-brand`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Main CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/chat')}
            className="bg-primary-black hover:bg-primary-peach text-primary-white hover:text-primary-black px-12 py-4 rounded-button text-xl font-semibold transition-all duration-brand transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center space-x-3"
          >
            <span>Start Your Career Journey</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          <p className="text-text-secondary text-base mt-4">
            Get personalized UK career guidance powered by real market data
          </p>
        </div>
      </div>
    </section>
  );
};

export default UKPathwaysSection; 