import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, MessageCircle, User, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../models/User';

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
    // White on mobile home page, black elsewhere (as per design guide)
    return isHomePage ? 'text-primary-white lg:text-primary-black' : 'text-primary-black';
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
    <header className="masthead" id="masthead">
      <div className="container">
        <div className="flex justify-between items-center py-4 lg:py-6">
          
          {/* Off Script Logo */}
          <Link to="/" className="flex items-center group">
            <div className={`transition-all duration-brand ${getLogoColor()}`}>
              {/* Off Script SVG Logo - simplified version */}
              <svg 
                className="logo" 
                width="120" 
                height="40" 
                viewBox="0 0 120 40" 
                fill="currentColor" 
                xmlns="http://www.w3.org/2000/svg"
              >
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
                  x="0" 
                  y="28" 
                  fontFamily="Barlow Semi Condensed, sans-serif" 
                  fontSize="24" 
                  fontWeight="700" 
                  fontStyle="italic"
                  className="transition-all duration-brand"
                  dx="42"
                >
                  SCRIPT
                </text>
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
              className={`transition-colors duration-brand font-medium hover:text-primary-peach ${
                isHomePage ? 'text-primary-white' : 'text-primary-black hover:text-primary-blue'
              }`}
            >
              Chat
            </Link>
            {currentUser && (
              <Link 
                to="/dashboard"
                className={`transition-colors duration-brand font-medium hover:text-primary-peach ${
                  isHomePage ? 'text-primary-white' : 'text-primary-black hover:text-primary-blue'
                }`}
              >
                Dashboard
              </Link>
            )}
            {isAdmin && (
              <Link 
                to="/admin"
                className="text-red-500 hover:text-red-700 transition-colors duration-brand flex items-center font-medium"
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
                  className={`p-2 transition-colors duration-brand flex items-center rounded-full hover:bg-primary-black/10 ${
                    isHomePage ? 'text-primary-white hover:text-primary-peach' : 'text-primary-black hover:text-primary-blue'
                  }`}
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
                      className="block px-4 py-3 text-sm text-primary-black hover:bg-primary-blue/10 hover:text-primary-blue transition-colors duration-brand"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors duration-brand"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/login" 
                className={`flex items-center px-6 py-2 rounded-button transition-all duration-brand font-medium ${
                  isHomePage 
                    ? 'bg-primary-white text-primary-black hover:bg-primary-peach' 
                    : 'bg-primary-black text-primary-white hover:bg-primary-peach hover:text-primary-black'
                }`}
              >
                <User className="h-4 w-4 mr-2" />
                <span>Login</span>
              </Link>
            )}
            
            {/* Mobile Menu Toggle - visible until lg */}
            <button
              className={`lg:hidden p-2 transition-colors duration-brand rounded-md ${
                isHomePage ? 'text-primary-white hover:text-primary-peach' : 'text-primary-black hover:text-primary-blue'
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-primary-white/95 backdrop-blur-sm border-t border-gray-200">
          <div className="container">
            <div className="py-4 space-y-2">
              <Link 
                to="/chat"
                className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-blue/10 hover:text-primary-blue rounded-xl transition-all duration-brand font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Chat
              </Link>
              {currentUser && (
                <Link 
                  to="/dashboard"
                  className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-blue/10 hover:text-primary-blue rounded-xl transition-all duration-brand font-medium"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              {isAdmin && (
                <Link 
                  to="/admin"
                  className="block w-full text-left px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl flex items-center transition-all duration-brand font-medium"
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
                    className="block w-full text-left px-4 py-3 text-primary-black hover:bg-primary-blue/10 hover:text-primary-blue rounded-xl transition-all duration-brand font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-4 py-3 bg-red-500 text-primary-white hover:bg-red-600 rounded-xl flex items-center transition-all duration-brand font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </button>
                </>
              )}
              {!currentUser && (
                <Link 
                  to="/login"
                  className="block w-full text-left px-4 py-3 bg-primary-black text-primary-white hover:bg-primary-peach hover:text-primary-black rounded-xl flex items-center transition-all duration-brand font-medium"
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
  );
};

export default Header;