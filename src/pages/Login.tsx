import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { auth } from '../services/firebase';
import { 
  Zap, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Crown,
  AlertCircle,
  Sparkles
} from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      
      // Use the new signIn format that returns migration results
      const { user, migrationResult } = await signIn(email, password);
      
      // Show migration feedback if data was transferred
      if (migrationResult) {
        const { dataTransferred } = migrationResult;
        let migrationMessage = 'Welcome back! ';
        
        if (dataTransferred.careerCards > 0) {
          migrationMessage += `Your ${dataTransferred.careerCards} career discoveries have been saved. `;
        }
        if (dataTransferred.conversationMessages > 0) {
          migrationMessage += `Your conversation history has been preserved. `;
        }
        
        // You could show this as a toast instead of console
        console.log('✅ Migration completed:', migrationMessage);
      }
      
      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      if (userData && userData.role === 'admin') {
        navigate('/admin/videos');
      } else {
        // Navigate to dashboard and pass migration result if present
        navigate('/dashboard', migrationResult ? { 
          state: { 
            migrationComplete: true,
            migrationResult,
            showWelcome: true
          }
        } : undefined);
      }
    } catch (err) {
      setError('Failed to sign in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-black via-primary-black to-electric-blue/10 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Floating background elements - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 20, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-20 left-20 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-electric-blue/20 to-neon-pink/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            rotate: -360,
            scale: [1.1, 1, 1.1],
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-20 right-20 w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-cyber-yellow/20 to-acid-green/20 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [-20, 20, -20],
            x: [-10, 10, -10],
          }}
          transition={{ 
            duration: 8, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/2 left-1/4 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-neon-pink/15 to-electric-blue/15 rounded-full blur-lg"
        />
      </div>

      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-electric-blue to-neon-pink rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow-blue">
            <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-primary-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-electric-blue via-neon-pink to-cyber-yellow mb-3 sm:mb-4 animate-glow-pulse">
            SIGN IN
          </h1>
          <p className="text-base sm:text-lg text-primary-white/70">
            Access your career command center
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-2xl border border-electric-blue/20 bg-gradient-to-br from-primary-black/90 to-electric-blue/10 backdrop-blur-lg"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-electric-blue/5 to-neon-pink/5" />
          
          <div className="relative">
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="mb-6 p-4 bg-gradient-to-r from-neon-pink/20 to-electric-blue/20 border border-neon-pink/50 rounded-xl backdrop-blur-sm"
                >
                  <div className="flex items-center space-x-3">
                    <AlertCircle className="w-5 h-5 text-neon-pink flex-shrink-0" />
                    <p className="text-neon-pink font-bold text-sm sm:text-base">{error}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-xs sm:text-sm font-black text-electric-blue uppercase tracking-wider">
                  EMAIL ADDRESS
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-primary-white/40" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="street-form-input w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="password" className="block text-xs sm:text-sm font-black text-electric-blue uppercase tracking-wider">
                  PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-primary-white/40" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="street-form-input w-full pl-10 sm:pl-12 pr-12 sm:pr-16 py-3 sm:py-4 text-sm sm:text-base"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-primary-white/40 hover:text-primary-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="pt-2 sm:pt-4">
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="street-button w-full py-3 sm:py-4 text-base sm:text-lg"
                >
                  <div className="flex items-center justify-center space-x-2 sm:space-x-3">
                    {loading ? (
                      <>
                        <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary-black/30 border-t-primary-black rounded-full animate-spin" />
                        <span>SIGNING IN...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                        <span>SIGN IN</span>
                        <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                      </>
                    )}
                  </div>
                </motion.button>
              </div>
            </form>
            
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-primary-white/70 font-medium text-sm sm:text-base">
                Don't have an account?{' '}
                <Link 
                  to="/auth/register" 
                  className="text-transparent bg-clip-text bg-gradient-to-r from-electric-blue to-neon-pink font-black hover:from-neon-pink hover:to-cyber-yellow transition-all duration-200"
                >
                  Create one here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>

        {/* Additional decoration */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="text-center mt-6 sm:mt-8"
        >
          <div className="flex items-center justify-center space-x-2 text-primary-white/40 font-medium text-xs sm:text-sm">
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Secure • Fast • Revolutionary</span>
            <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
