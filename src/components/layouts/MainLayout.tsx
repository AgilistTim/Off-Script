import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import Header from '../Header';
import Footer from '../Footer';

const MainLayout: React.FC = () => {
  const { isDarkMode } = useAppStore();

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <Header />
      
      {/* Main content */}
      <div className="flex-1">
        {/* Page content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MainLayout;
