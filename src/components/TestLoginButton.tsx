import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

// Test admin credentials - use the ones we just created
const TEST_EMAIL = 'admin@offscript.com';
const TEST_PASSWORD = 'admin123';

const TestLoginButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleTestLogin = async () => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      // Navigate to admin videos page
      window.location.href = '/admin';
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to log in with test account. See console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleTestLogin}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-md shadow-lg hover:bg-green-700 transition-colors flex items-center"
      >
        {loading ? 'Logging in...' : 'Test Admin Login'}
      </button>
    </div>
  );
};

export default TestLoginButton; 