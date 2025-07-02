import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Moon, Sun } from 'lucide-react';
import Header from '../Header';
import Footer from '../Footer';
import { Link } from 'react-router-dom';

const MainLayout: React.FC = () => {
  const { sidebarOpen, toggleSidebar, isDarkMode, setDarkMode } = useAppStore();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <AnimatePresence mode="wait">
          {(sidebarOpen || !isMobile) && (
            <motion.aside
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`fixed md:static z-30 h-full w-64 bg-white dark:bg-gray-800 shadow-lg`}
            >
              <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                <h1 className="text-xl font-bold text-blue-600 dark:text-blue-400">OffScript</h1>
                {isMobile && (
                  <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                    <X size={20} className="text-gray-500 dark:text-gray-400" />
                  </button>
                )}
              </div>
              
              <nav className="p-4">
                <ul className="space-y-2">
                  <li>
                    <Link to="/" className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                      Home
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link to="/videos" className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                      Video Exploration
                    </Link>
                  </li>
                  <li>
                    <Link to="/chat" className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                      AI Chat
                    </Link>
                  </li>
                  <li>
                    <Link to="/profile" className="block p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200">
                      Profile
                    </Link>
                  </li>
                </ul>
              </nav>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {/* Mobile sidebar toggle */}
          {isMobile && (
            <div className="p-4">
              <button onClick={toggleSidebar} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                <Menu size={20} className="text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}
          
          {/* Page content */}
          <main className="p-4">
            <Outlet />
          </main>
        </div>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
