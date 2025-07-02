import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Test admin credentials
const TEST_EMAIL = 'admin@offscript.com';
const TEST_PASSWORD = 'admin123';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await signIn(email, password);
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
      const userData = userDoc.data();
      
      if (userData && userData.role === 'admin') {
        navigate('/admin/videos');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await signInWithGoogle();
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser?.uid || ''));
      const userData = userDoc.data();
      
      if (userData && userData.role === 'admin') {
        navigate('/admin/videos');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError('Failed to sign in with Google.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Test login function for admin user
  const handleTestAdminLogin = async () => {
    try {
      setError('');
      setLoading(true);
      
      // Try to sign in with the email and password
      try {
        await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      } catch (signInError) {
        // If sign in fails, show a more specific error
        console.error('Sign in error:', signInError);
        setError('Could not sign in with test account. The user might not exist or the password is incorrect.');
        setLoading(false);
        return;
      }
      
      // Navigate to admin videos page after successful login
      navigate('/admin/videos');
    } catch (err) {
      setError('Failed to sign in with test account. Contact administrator.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">Sign In</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
        <p className="font-bold">Test Admin Account</p>
        <p>Email: {TEST_EMAIL}</p>
        <p>Password: {TEST_PASSWORD}</p>
        <p className="mt-2">Use the green button below for quick access.</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>
      </form>
      
      <div className="mt-4 space-y-3">
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          Sign in with Google
        </button>
        
        {/* Test Admin Login Button */}
        <button
          onClick={handleTestAdminLogin}
          disabled={loading}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          Test Admin Login
        </button>
      </div>
      
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default Login;
