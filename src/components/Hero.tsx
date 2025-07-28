import React from 'react';
import { ArrowRight, Sparkles, Target, Users, ChevronDown, Brain } from 'lucide-react';
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
    <section id="hero" className="relative bg-primary-white text-primary-black overflow-hidden min-h-screen flex items-center">
      {/* Off Script Hero Layout */}
      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[80vh]">
          
          {/* Left Column - CTA Content */}
          <div className="space-y-8 lg:space-y-12">
            {/* Date/Event Info */}
            <a 
              href="https://offscriptgen.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 bg-primary-blue/10 px-4 py-2 rounded-full hover:bg-primary-blue/20 transition-colors duration-brand group"
            >
              <Sparkles className="h-5 w-5 text-primary-blue group-hover:scale-110 transition-transform duration-brand" />
              <span className="text-primary-blue font-semibold text-sm uppercase tracking-wide">
                LDN / 24-25 JAN 2026
              </span>
            </a>
            
            {/* Main Headline */}
            <div className="space-y-8">
              <h1 className="text-h1 font-bold leading-none">
                FLIP THE
                <br />
                <span className="italic text-primary-blue">SCRIPT</span>
              </h1>
              
              <p className="text-2xl lg:text-3xl leading-relaxed max-w-lg font-semibold">
                Skip University Debt,
                <br />
                <strong>Land UK Jobs</strong>
              </p>

              <p className="text-lg lg:text-xl text-text-secondary leading-relaxed max-w-2xl">
                Discover alternative career pathways through AI-powered guidance, real UK salary data, 
                and verified industry insights. Your dream job doesn't require £35K+ student debt.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
              <Button 
                variant="black"
                size="lg"
                onClick={handleStartConversation}
                className="group text-xl px-8 py-4"
              >
                <span>Start Conversation</span>
                <ArrowRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
              </Button>
              
              <Button 
                variant="white"
                size="lg"
                onClick={() => scrollToSection('career-journey')}
                className="text-xl px-8 py-4"
              >
                Learn More
              </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-8 py-8 border-t border-gray-200">
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary-blue mb-2">92%</div>
                <div className="text-sm text-text-secondary">Employers prioritize skills over degrees</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary-peach mb-2">79%</div>
                <div className="text-sm text-text-secondary">Bootcamp employment rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl lg:text-4xl font-bold text-primary-green mb-2">13x</div>
                <div className="text-sm text-text-secondary">Cheaper than university</div>
              </div>
            </div>
          </div>
          
          {/* Right Column - Visual Content */}
          <div className="relative">
            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 lg:gap-10">
              
              {/* Card 1 - AI Guidance */}
              <div className="bg-primary-blue/5 p-8 lg:p-10 rounded-3xl border-2 border-primary-blue/20 hover:border-primary-blue/40 transition-all duration-brand group hover:shadow-2xl">
                <div className="w-16 h-16 bg-primary-blue rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-brand">
                  <Brain className="h-8 w-8 text-primary-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-primary-black">UK-Specific AI Guidance</h3>
                <p className="text-text-secondary leading-relaxed">
                  Personalized career recommendations based on real UK job market data and regional opportunities.
                </p>
              </div>

              {/* Card 2 - Fast Entry */}
              <div className="bg-primary-peach/5 p-8 lg:p-10 rounded-3xl border-2 border-primary-peach/20 hover:border-primary-peach/40 transition-all duration-brand group sm:mt-16 hover:shadow-2xl">
                <div className="w-16 h-16 bg-primary-peach rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-brand">
                  <Target className="h-8 w-8 text-primary-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-primary-black">10x Faster Entry</h3>
                <p className="text-text-secondary leading-relaxed">
                  Alternative pathways: months not years to become career-ready with real-world skills.
                </p>
              </div>

              {/* Card 3 - Real Salaries */}
              <div className="bg-primary-green/5 p-8 lg:p-10 rounded-3xl border-2 border-primary-green/20 hover:border-primary-green/40 transition-all duration-brand group hover:shadow-2xl">
                <div className="w-16 h-16 bg-primary-green rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-brand">
                  <span className="text-primary-black font-bold text-2xl">£</span>
                </div>
                <h3 className="text-2xl font-bold mb-4 text-primary-black">Real UK Salaries</h3>
                <p className="text-text-secondary leading-relaxed">
                  Verified salary data from actual UK professionals, not estimates or outdated figures.
                </p>
              </div>

              {/* Card 4 - Success Stories */}
              <div className="bg-primary-lavender/5 p-8 lg:p-10 rounded-3xl border-2 border-primary-lavender/20 hover:border-primary-lavender/40 transition-all duration-brand group sm:-mt-16 hover:shadow-2xl">
                <div className="w-16 h-16 bg-primary-lavender rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-brand">
                  <Users className="h-8 w-8 text-primary-black" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-primary-black">50K+ Success Stories</h3>
                <p className="text-text-secondary leading-relaxed">
                  Join thousands who've launched careers without university debt across the UK.
                </p>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-primary-yellow/30 rounded-full animate-bounce-slow hidden lg:block"></div>
            <div className="absolute -bottom-12 -left-8 w-20 h-20 bg-primary-mint/40 rounded-full animate-bounce-slow delay-1000 hidden lg:block"></div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <ChevronDown className="h-8 w-8 text-text-secondary cursor-pointer" onClick={() => scrollToSection('career-journey')} />
      </div>
    </section>
  );
};

export default Hero;