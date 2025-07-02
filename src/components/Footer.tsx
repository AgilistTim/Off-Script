import React from 'react';
import { MessageCircle, Mail, Phone, MapPin, Github, Twitter, Linkedin, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top section with logo and links */}
        <div className="flex flex-wrap justify-between items-start gap-4 pb-4">
          {/* Brand */}
          <div className="w-full sm:w-auto mb-4 sm:mb-0">
            <div className="flex items-center mb-2 cursor-pointer" onClick={() => scrollToSection('hero')}>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 rounded-lg">
                <MessageCircle className="h-5 w-5 text-white" />
              </div>
              <span className="ml-2 text-lg font-bold">PathFinder</span>
            </div>
            <div className="flex space-x-3 mt-2">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Github className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links - Combined Explore and Resources */}
          <div className="flex flex-wrap gap-8">
            {/* Explore */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Explore</h3>
              <ul className="space-y-1 text-xs">
                <li><button onClick={() => scrollToSection('explore')} className="text-gray-400 hover:text-white transition-colors">Career Sectors</button></li>
                <li><button onClick={() => scrollToSection('videos')} className="text-gray-400 hover:text-white transition-colors">Video Library</button></li>
                <li><button onClick={() => scrollToSection('courses')} className="text-gray-400 hover:text-white transition-colors">Course Recommendations</button></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Resources</h3>
              <ul className="space-y-1 text-xs">
                <li><button onClick={() => scrollToSection('explore')} className="text-gray-400 hover:text-white transition-colors">Career Assessment</button></li>
                <li><button onClick={() => scrollToSection('videos')} className="text-gray-400 hover:text-white transition-colors">Salary Data</button></li>
                <li><button onClick={() => scrollToSection('courses')} className="text-gray-400 hover:text-white transition-colors">Industry Reports</button></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Contact</h3>
              <ul className="space-y-1 text-xs">
                <li className="flex items-center">
                  <Mail className="h-3 w-3 text-gray-400 mr-1" />
                  <a href="mailto:hello@pathfinder.com" className="text-gray-400 hover:text-white transition-colors">hello@pathfinder.com</a>
                </li>
                <li className="flex items-center">
                  <Phone className="h-3 w-3 text-gray-400 mr-1" />
                  <a href="tel:+15551234567" className="text-gray-400 hover:text-white transition-colors">+1 (555) 123-4567</a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom section with copyright */}
        <div className="border-t border-gray-800 pt-4 mt-2">
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="text-gray-400 text-xs">
              © 2025 PathFinder. All rights reserved.
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <button onClick={() => scrollToSection('hero')} className="text-gray-400 hover:text-white transition-colors">Privacy</button>
              <button onClick={() => scrollToSection('hero')} className="text-gray-400 hover:text-white transition-colors">Terms</button>
              <button onClick={() => scrollToSection('hero')} className="text-gray-400 hover:text-white transition-colors">Cookies</button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;