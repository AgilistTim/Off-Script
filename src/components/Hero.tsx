import React from 'react';
import { ArrowRight, Sparkles, Target, Users, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { useNavigate } from 'react-router-dom';

const Hero: React.FC = () => {
  const navigate = useNavigate();

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartConversation = () => {
    // Navigate to the app conversation interface
    navigate('/chat');
  };

  return (
    <section id="hero" className="relative bg-primary-white text-primary-black overflow-hidden">
      {/* Off Script Hero Layout */}
      <div className="container offscript-hero py-hero-padding lg:py-hero-padding-lg">
        
        {/* Left Column - CTA Content */}
        <div className="space-y-8 lg:space-y-12">
          {/* Date/Event Info */}
          <div className="inline-flex items-center space-x-2 bg-primary-blue/10 px-4 py-2 rounded-full">
            <Sparkles className="h-5 w-5 text-primary-blue" />
            <span className="text-primary-blue font-semibold text-sm uppercase tracking-wide">
              LDN / 24-25 JAN 2026
            </span>
          </div>
          
          {/* Main Headline */}
          <div className="space-y-6">
            <h1 className="text-h1 font-bold leading-none">
              FLIP THE
              <br />
              <span className="italic text-primary-blue">SCRIPT</span>
            </h1>
            
            <p className="text-xl lg:text-2xl leading-relaxed max-w-lg">
              Skip University Debt,
              <br />
              <strong>Land UK Jobs</strong>
            </p>

            <p className="text-base lg:text-lg text-text-secondary leading-relaxed max-w-2xl">
              Discover alternative career pathways through AI-powered guidance, real UK salary data, 
              and verified industry insights. Your dream job doesn't require £35K+ student debt.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
            <Button 
              variant="black"
              size="compact"
              onClick={handleStartConversation}
              className="group"
            >
              <span>Start Conversation</span>
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            
            <Button 
              variant="white"
              size="compact"
              onClick={() => scrollToSection('discover')}
            >
              Learn More
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 py-8 border-t border-gray-200">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-primary-blue">92%</div>
              <div className="text-sm text-text-secondary">Employers prioritize skills over degrees</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-primary-peach">79%</div>
              <div className="text-sm text-text-secondary">Bootcamp employment rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-primary-green">13x</div>
              <div className="text-sm text-text-secondary">Cheaper than university</div>
            </div>
          </div>
        </div>
        
        {/* Right Column - Visual Content */}
        <div className="relative">
          {/* Feature Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
            
            {/* Card 1 - AI Guidance */}
            <div className="bg-primary-blue/10 p-8 rounded-2xl border-2 border-primary-blue/20 hover:border-primary-blue/40 transition-all duration-brand group">
              <div className="w-12 h-12 bg-primary-blue rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-brand">
                <span className="text-primary-white font-bold text-lg">AI</span>
              </div>
              <h3 className="text-xl font-bold mb-3">UK-Specific AI Guidance</h3>
              <p className="text-text-secondary leading-relaxed">
                Personalized career recommendations based on real UK job market data and regional opportunities.
              </p>
            </div>

            {/* Card 2 - Fast Entry */}
            <div className="bg-primary-peach/10 p-8 rounded-2xl border-2 border-primary-peach/20 hover:border-primary-peach/40 transition-all duration-brand group sm:mt-12">
              <div className="w-12 h-12 bg-primary-peach rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-brand">
                <Target className="h-6 w-6 text-primary-black" />
              </div>
              <h3 className="text-xl font-bold mb-3">10x Faster Entry</h3>
              <p className="text-text-secondary leading-relaxed">
                Alternative pathways: months not years to become career-ready with real-world skills.
              </p>
            </div>

            {/* Card 3 - Real Salaries */}
            <div className="bg-primary-green/10 p-8 rounded-2xl border-2 border-primary-green/20 hover:border-primary-green/40 transition-all duration-brand group">
              <div className="w-12 h-12 bg-primary-green rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-brand">
                <span className="text-primary-black font-bold text-lg">£</span>
              </div>
              <h3 className="text-xl font-bold mb-3">Real UK Salaries</h3>
              <p className="text-text-secondary leading-relaxed">
                Verified salary data from actual UK professionals, not estimates or outdated figures.
              </p>
            </div>

            {/* Card 4 - Success Stories */}
            <div className="bg-primary-lavender/10 p-8 rounded-2xl border-2 border-primary-lavender/20 hover:border-primary-lavender/40 transition-all duration-brand group sm:-mt-12">
              <div className="w-12 h-12 bg-primary-lavender rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-brand">
                <Users className="h-6 w-6 text-primary-black" />
              </div>
              <h3 className="text-xl font-bold mb-3">50K+ Success Stories</h3>
              <p className="text-text-secondary leading-relaxed">
                Join thousands who've launched careers without university debt across the UK.
              </p>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-yellow rounded-full opacity-50 animate-bounce-slow hidden lg:block"></div>
          <div className="absolute -bottom-8 -left-4 w-16 h-16 bg-primary-mint rounded-full opacity-60 animate-bounce-slow delay-1000 hidden lg:block"></div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-6 w-6 text-text-secondary" />
      </div>
    </section>
  );
};

export default Hero;