import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, MessageCircle, User, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../models/User';
import { ContextualButton } from './ui/button';
import { DesignProvider } from '../context/DesignContext';

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, userData, logout } = useAuth();

  const isHomePage = location.pathname === '/';
  const isAdmin = userData?.role === 'admin';

  // Determine logo color based on page and device
  const getLogoColor = () => {
    return 'text-primary-black';
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      setIsProfileMenuOpen(false);
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const scrollToSection = (sectionId: string) => {
    if (isHomePage) {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
        setIsMenuOpen(false);
      }
    }
  };
  
  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current && 
        !profileMenuRef.current.contains(event.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <DesignProvider mode={{ aesthetic: 'hybrid', energy: 'medium', interaction: 'energetic' }}>
      <header className="masthead fixed top-0 left-0 right-0 bg-gradient-to-r from-primary-white/95 to-primary-mint/30 backdrop-blur-sm border-b border-primary-green/30 z-40" id="masthead">
        <div className="container">
          <div className="flex justify-between items-center py-4 lg:py-6">
          
          {/* Off Script Logo */}
          <Link to="/" className="flex items-center group">
            <div className={`transition-all duration-brand ${getLogoColor()}`}>
              {/* Off Script SVG Logo - simplified version */}
              <svg 
                className="logo" 
                width="140" 
                height="40" 
                viewBox="0 0 120 40" 
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <g>
                  <text 
                    x="0" 
                    y="28" 
                    fontFamily="Barlow Semi Condensed, sans-serif" 
                    fontSize="24" 
                    fontWeight="700"
                    className="transition-all duration-brand"
                  >
                    OFF
                  </text>
                  <text 
                    x="37" 
                    y="28" 
                    fontFamily="Barlow Semi Condensed, sans-serif" 
                    fontSize="24" 
                    fontWeight="700" 
                    fontStyle="italic"
                    className="transition-all duration-brand"
                  >
                    SCRIPT
                  </text>
                </g>
                {/* Underline accent */}
                <line 
                  x1="0" 
                  y1="32" 
                  x2="100" 
                  y2="32" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="transition-all duration-brand"
                />
              </svg>
            </div>
          </Link>

          {/* Desktop Navigation - Hidden until lg (1023px+) */}
          <nav className="hidden lg:flex space-x-8">
            <Link 
              to="/chat"
              className="transition-colors duration-brand font-medium text-primary-black hover:text-primary-green"
            >
              Chat
            </Link>
            {currentUser && (
              <Link 
                to="/dashboard"
                className="transition-colors duration-brand font-medium text-primary-black hover:text-primary-green"
              >
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link 
                to="/admin"
                className="text-primary-peach hover:text-primary-yellow transition-colors duration-brand flex items-center font-medium"
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="p-2 transition-colors duration-brand flex items-center rounded-full hover:bg-primary-green/10 text-primary-black hover:text-primary-green"
                >
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Profile" 
                      className="h-8 w-8 rounded-full border-2 border-current"
                    />
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </button>
                {isProfileMenuOpen && (
                  <div 
                    ref={profileMenuRef}
                    className="absolute right-0 mt-2 w-48 bg-primary-white rounded-2xl shadow-lg py-2 z-50 border border-gray-100"
                  >
                    <Link 
                      to="/profile" 
                      className="block px-4 py-3 text-sm text-primary-black hover:bg-primary-green/10 hover:text-primary-green transition-colors duration-brand"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-primary-peach hover:bg-primary-peach/10 transition-colors duration-brand"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <ContextualButton
                intent="secondary"
                onClick={() => navigate('/login')}
                className="flex items-center px-6 py-2"
              >
                <User className="h-4 w-4 mr-2" />
                <span>Login</span>
              </ContextualButton>
            )}
            
            {/* Mobile Menu Toggle - visible until lg */}
            <button
              className="lg:hidden p-2 transition-colors duration-brand rounded-md text-primary-black hover:text-primary-green"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-primary-black/95 backdrop-blur-sm border-t border-primary-green/30">
          <div className="container">
            <div className="py-4 space-y-2">
              <Link 
                to="/chat"
                className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-green/10 hover:text-primary-green rounded-xl transition-all duration-brand font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Chat
              </Link>
              {currentUser && (
                <Link 
                  to="/dashboard"
                  className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-green/10 hover:text-primary-green rounded-xl transition-all duration-brand font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin"
                  className="block w-full text-left px-4 py-3 text-primary-peach hover:bg-primary-peach/10 hover:text-primary-yellow rounded-xl flex items-center transition-all duration-brand font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Admin Panel
                </Link>
              )}
              {currentUser && (
                <>
                  <Link 
                    to="/profile"
                    className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-green/10 hover:text-primary-green rounded-xl transition-all duration-brand font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 bg-primary-peach text-primary-black hover:bg-primary-peach/80 rounded-xl flex items-center transition-all duration-brand font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              )}
              {!currentUser && (
                <Link 
                  to="/login"
                  className="block w-full text-left px-4 py-3 bg-primary-green text-primary-black hover:bg-primary-yellow hover:text-primary-black rounded-xl flex items-center transition-all duration-brand font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <User className="h-4 w-4 mr-2" />
                  Login
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
    </DesignProvider>
  );
};

export default Header;