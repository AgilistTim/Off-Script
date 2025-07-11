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
    <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <Link to="/" className="flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-2 rounded-lg">
              <MessageCircle className="h-6 w-6 text-white" />
            </div>
            <span className="ml-3 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              OffScript
            </span>
          </Link>

          <nav className="hidden md:flex space-x-8">
            <Link 
              to="/explore"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              Explore Careers
            </Link>
            <Link 
              to="/chat"
              className="text-gray-700 hover:text-blue-600 transition-colors"
            >
              AI Chat
            </Link>
            {currentUser && (
              <Link 
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
            )}
            {isHomePage && (
              <button 
                onClick={() => scrollToSection('pathways')}
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Alt Pathways
              </button>
            )}
            {isAdmin && (
              <Link 
                to="/admin"
                className="text-red-600 hover:text-red-800 transition-colors flex items-center"
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center space-x-4">
            <Link to="/explore" className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Search className="h-5 w-5" />
            </Link>
            {currentUser ? (
              <div className="relative">
                <button 
                  ref={profileButtonRef}
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex items-center"
                >
                  {currentUser.photoURL ? (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Profile" 
                      className="h-6 w-6 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </button>
                {isProfileMenuOpen && (
                  <div 
                    ref={profileMenuRef}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10"
                  >
                    <Link 
                      to="/profile" 
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors">
                <User className="h-4 w-4 mr-1" />
                <span className="text-sm">Login</span>
              </Link>
            )}
            <button
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link 
              to="/explore"
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              Explore Careers
            </Link>
            <Link 
              to="/chat"
              className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              onClick={() => setIsMenuOpen(false)}
            >
              AI Chat
            </Link>
            {currentUser && (
              <Link 
                to="/dashboard"
                className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Dashboard
              </Link>
            )}
            {isHomePage && (
              <button 
                onClick={() => scrollToSection('pathways')}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
              >
                Alt Pathways
              </button>
            )}
            {isAdmin && (
              <Link 
                to="/admin"
                className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <Shield className="h-4 w-4 mr-1" />
                Admin Panel
              </Link>
            )}
            {currentUser && (
              <>
                <Link 
                  to="/profile"
                  className="block w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Profile
                </Link>
                <button 
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="block w-full text-left px-3 py-2 bg-red-500 text-white hover:bg-red-600 rounded-md flex items-center"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </>
            )}
            {!currentUser && (
              <Link 
                to="/login"
                className="block w-full text-left px-3 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-md flex items-center"
                onClick={() => setIsMenuOpen(false)}
              >
                <User className="h-4 w-4 mr-2" />
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;