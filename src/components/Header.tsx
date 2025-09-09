import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Search, MessageCircle, User, Shield, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { User as UserType } from '../models/User';
import { Button } from './ui/button';

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

  // Clean B&W logo color
  const getLogoColor = () => {
    return 'text-black';
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
      <header className="masthead fixed top-0 left-0 right-0 bg-white border-b-2 border-black z-40" id="masthead">
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
                    Off
                  </text>
                  <text 
                    x="30" 
                    y="28" 
                    fontFamily="Barlow Semi Condensed, sans-serif" 
                    fontSize="24" 
                    fontWeight="700" 
                    fontStyle="italic"
                    className="transition-all duration-brand"
                  >
                    Script
                  </text>
                </g>
                {/* Underline accent */}
                <line 
                  x1="0" 
                  y1="32" 
                  x2="90" 
                  y2="32" 
                  stroke="currentColor" 
                  strokeWidth="2"
                  className="transition-all duration-brand"
                />
              </svg>
            </div>
          </Link>

          {/* Desktop Navigation - Hidden until lg (1023px+) */}
          <nav className="hidden lg:flex space-x-4">
            <Button 
              asChild
              variant="primary"
            >
              <Link to="/chat">Chat</Link>
            </Button>
            {currentUser && (
              <Button 
                asChild
                variant="outline"
              >
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            )}
            {isAdmin && (
              <Button 
                asChild
                variant="accent"
              >
                <Link to="/admin" className="flex items-center">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Link>
              </Button>
            )}
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="p-2 transition-all duration-300 flex items-center rounded-full hover:bg-gray-100 text-black border-2 border-transparent hover:border-black"
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
                    className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-card py-2 z-50 border-2 border-black"
                  >
                    <Link 
                      to="/profile" 
                      className="block px-4 py-3 text-sm text-black hover:bg-gray-100 transition-all duration-300"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-black hover:bg-gray-100 transition-all duration-300"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="flex items-center"
              >
                <User className="h-4 w-4 mr-2" />
                Login
              </Button>
            )}
            
            {/* Mobile Menu Toggle - visible until lg */}
            <button
              className="lg:hidden p-2 transition-all duration-300 rounded-md text-black hover:bg-gray-100 border-2 border-transparent hover:border-black"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t-2 border-black">
          <div className="container">
            <div className="py-4 space-y-3">
              <Button 
                asChild
                variant="primary"
                className="w-full justify-start"
              >
                <Link 
                  to="/chat"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat
                </Link>
              </Button>
              {currentUser && (
                <Button 
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link 
                    to="/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                </Button>
              )}
              {isAdmin && (
                <Button 
                  asChild
                  variant="accent"
                  className="w-full justify-start"
                >
                  <Link 
                    to="/admin"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Admin
                  </Link>
                </Button>
              )}
              {currentUser && (
                <>
                  <Button 
                    asChild
                    variant="ghost"
                    className="w-full justify-start"
                  >
                    <Link 
                      to="/profile"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Profile
                    </Link>
                  </Button>
                  <Button 
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              )}
              {!currentUser && (
                <Button 
                  asChild
                  variant="outline"
                  className="w-full justify-start"
                >
                  <Link 
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;