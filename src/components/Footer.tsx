import React from 'react';
import { Mail, Phone, Twitter, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="sitebase" id="sitebase">
      <div className="container">
        
        {/* Main Footer Content */}
        <div className="flex flex-wrap justify-between items-start gap-8 lg:gap-12 mb-8">
          
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center cursor-pointer group" onClick={() => scrollToSection('hero')}>
              {/* Off Script Logo */}
              <svg 
                className="logo" 
                width="125" 
                height="42" 
                viewBox="0 0 125 42" 
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <text 
                  x="0" 
                  y="28" 
                  fontFamily="Barlow Semi Condensed, sans-serif" 
                  fontSize="24" 
                  fontWeight="700"
                  className="text-black"
                >
                  OFF
                </text>
                <text 
                  x="42" 
                  y="28" 
                  fontFamily="Barlow Semi Condensed, sans-serif" 
                  fontSize="24" 
                  fontWeight="700" 
                  fontStyle="italic"
                  className="text-black"
                >
                  SCRIPT
                </text>
                {/* Underline accent */}
                <line 
                  x1="0" 
                  y1="32" 
                  x2="105" 
                  y2="32" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="text-black"
                />
              </svg>
            </div>
            
            <p className="text-text-secondary max-w-xs leading-relaxed">
              Skip University Debt, Land UK Jobs. 
              AI-powered career guidance for alternative pathways.
            </p>

            {/* Social Links */}
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 lg:gap-12">
            
            {/* Explore Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-black">Explore</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => scrollToSection('explore')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Career Sectors
                </button>
                <button 
                  onClick={() => scrollToSection('videos')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Video Library
                </button>
                <button 
                  onClick={() => scrollToSection('courses')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Courses
                </button>
              </div>
            </div>

            {/* Resources Section */}
            <div className="space-y-4">
              <h3 className="font-bold text-black">Resources</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => scrollToSection('hero')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Career Guide
                </button>
                <button 
                  onClick={() => scrollToSection('hero')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Salary Data
                </button>
                <button 
                  onClick={() => scrollToSection('hero')} 
                  className="block text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  Success Stories
                </button>
              </div>
            </div>

            {/* Contact Section */}
            <div className="space-y-4 col-span-2 md:col-span-1">
              <h3 className="font-bold text-black">Contact</h3>
              <div className="space-y-3">
                <a 
                  href="mailto:hello@offscript.com" 
                  className="flex items-center text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  hello@offscript.com
                </a>
                <a 
                  href="tel:+44123456789" 
                  className="flex items-center text-text-secondary hover:text-primary-peach transition-colors duration-brand"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  +44 123 456 789
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-wrap justify-between items-center gap-4">
            
            {/* Copyright */}
            <div className="text-text-secondary text-sm">
              © 2025 OffScript. All rights reserved.
            </div>

            {/* Legal Links */}
            <div className="flex items-center space-x-6 text-sm">
              <button 
                onClick={() => scrollToSection('hero')} 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => scrollToSection('hero')} 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                Terms of Service
              </button>
              <button 
                onClick={() => scrollToSection('hero')} 
                className="text-text-secondary hover:text-primary-peach transition-colors duration-brand"
              >
                Cookie Policy
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;