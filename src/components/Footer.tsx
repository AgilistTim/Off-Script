import React from 'react';
import { MessageCircle, Mail, Phone, Twitter, Linkedin, Github } from 'lucide-react';

const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* Compact footer layout */}
        <div className="flex flex-wrap justify-between items-center gap-4">
          {/* Brand */}
          <div className="flex items-center cursor-pointer" onClick={() => scrollToSection('hero')}>
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-1.5 rounded-lg">
              <MessageCircle className="h-4 w-4 text-white" />
            </div>
            <span className="ml-2 text-sm font-bold">OffScript</span>
            <div className="hidden sm:flex space-x-3 ml-4">
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-3 w-3" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="h-3 w-3" />
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <Github className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Combined Links */}
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex gap-3">
              <button onClick={() => scrollToSection('explore')} className="text-gray-400 hover:text-white transition-colors">Career Sectors</button>
              <button onClick={() => scrollToSection('videos')} className="text-gray-400 hover:text-white transition-colors">Video Library</button>
              <button onClick={() => scrollToSection('courses')} className="text-gray-400 hover:text-white transition-colors">Courses</button>
            </div>
            
            <div className="flex items-center gap-3">
              <a href="mailto:hello@offscript.com" className="text-gray-400 hover:text-white transition-colors flex items-center">
                <Mail className="h-3 w-3 text-gray-400 mr-1" />
                hello@offscript.com
              </a>
              <a href="tel:+15551234567" className="text-gray-400 hover:text-white transition-colors flex items-center">
                <Phone className="h-3 w-3 text-gray-400 mr-1" />
                +1 (555) 123-4567
              </a>
            </div>
          </div>
        </div>

        {/* Bottom section with copyright */}
        <div className="border-t border-gray-800 pt-3 mt-2">
          <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
            <div className="text-gray-400">
              © 2025 OffScript. All rights reserved.
            </div>
            <div className="flex items-center space-x-4">
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