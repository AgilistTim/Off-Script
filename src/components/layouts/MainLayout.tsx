import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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
        <main>
          <Outlet />
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
      
      {/* Global Toast Notifications */}
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 3000, // Shorter duration - auto-dismiss after 3 seconds
          style: {
            background: '#ffffff',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            fontSize: '14px',
            maxWidth: '400px',
            marginTop: '80px', // Push down below header/navigation
            zIndex: 40, // Lower z-index to not interfere with navigation
          },
        }}
      />
    </div>
  );
};

export default MainLayout;
