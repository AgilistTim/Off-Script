import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import AlternativePathways from '../components/AlternativePathways';

const Home: React.FC = () => {
  const { currentUser } = useAuth();

  return (
    <div className="max-w-6xl mx-auto">
      <section className="py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
            Find Your Path, <span className="text-blue-600 dark:text-blue-400">Your Way</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto mb-8">
            OffScript helps you explore career options through engaging videos, AI-driven conversation, and personalized guidance.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/explore" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Explore Career Videos
            </Link>
            {currentUser ? (
              <Link to="/dashboard" className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/register" className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                Get Started
              </Link>
            )}
          </div>
        </motion.div>
      </section>
      
      <section className="py-12">
        <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-12">
          How OffScript Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              Watch & Discover
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Explore career paths through engaging videos from professionals who've been there.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              Chat & Reflect
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Our AI assistant helps you process what you've learned and discover what resonates with you.
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"
          >
            <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-3">
              Plan & Present
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Create shareable reports and presentations to discuss your career choices with confidence.
            </p>
          </motion.div>
        </div>
      </section>
      
      {/* Alternative Pathways Section */}
      <AlternativePathways />
      
      <section className="py-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6">
            Ready to Start Your Journey?
          </h2>
          
          {currentUser ? (
            <Link to="/explore" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Explore Career Videos
            </Link>
          ) : (
            <Link to="/register" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Sign Up Now
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;
