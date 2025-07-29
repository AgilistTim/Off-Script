import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { motion } from 'framer-motion';

const AuthLayout: React.FC = () => {
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
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 flex items-center justify-center transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        {/* Remove the constraining container and white background - let auth pages handle their own styling */}
        <Outlet />
      </motion.div>
    </div>
  );
};

export default AuthLayout;
