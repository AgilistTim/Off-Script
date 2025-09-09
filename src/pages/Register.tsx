import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { GuestDataPreview } from '../components/auth/GuestDataPreview';
import { 
  User, 
  Mail, 
  Lock, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  Rocket,
  AlertCircle,
  Sparkles,
  Crown,
  Zap,
  CheckCircle,
  Star
} from 'lucide-react';

const Register: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const { signUp, hasGuestData } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }
    
    try {
      setError('');
      setLoading(true);
      
      // Use the new signUp format that returns migration results
      const { user, migrationResult } = await signUp(email, password, displayName);
      
      // Show migration feedback if data was transferred
      if (migrationResult) {
        const { dataTransferred } = migrationResult;
        let migrationMessage = `Welcome ${displayName}! `;
        
        if (dataTransferred.careerCards > 0) {
          migrationMessage += `Your ${dataTransferred.careerCards} career discoveries have been saved. `;
        }
        if (dataTransferred.conversationMessages > 0) {
          migrationMessage += `Your conversation history has been preserved. `;
        }
        if (dataTransferred.profileFields.length > 0) {
          migrationMessage += `Your profile interests and goals have been added. `;
        }
        
        // You could show this as a toast instead of console
        console.log('✅ Registration with migration completed:', migrationMessage);
      }
      
      // Navigate to dashboard and pass migration result to trigger data refresh
      navigate('/dashboard', { 
        state: { 
          migrationComplete: true,
          migrationResult,
          showWelcome: true
        }
      });
    } catch (err) {
      setError('Failed to create an account');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <Rocket className="w-4 h-4 sm:w-5 sm:h-5" />,
      title: "AI Career Guidance",
      description: "Get personalized career insights"
    },
    {
      icon: <Star className="w-4 h-4 sm:w-5 sm:h-5" />,
      title: "Smart Recommendations", 
      description: "Discover opportunities tailored to you"
    },
    {
      icon: <Crown className="w-4 h-4 sm:w-5 sm:h-5" />,
      title: "Progress Tracking",
      description: "Monitor your career development"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-black to-gray-900">
      {/* Floating background elements - hidden on mobile for performance */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none hidden sm:block">
        <motion.div
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{ 
            duration: 25, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute top-20 right-20 w-24 h-24 sm:w-36 sm:h-36 bg-gradient-to-br from-gray-600/30 to-gray-700/30 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            rotate: -360,
            scale: [1.1, 1, 1.1],
          }}
          transition={{ 
            duration: 30, 
            repeat: Infinity, 
            ease: "linear" 
          }}
          className="absolute bottom-32 left-20 w-32 h-32 sm:w-44 sm:h-44 bg-gradient-to-br from-gray-500/30 to-gray-600/30 rounded-full blur-xl"
        />
        <motion.div
          animate={{ 
            y: [-30, 30, -30],
            x: [-15, 15, -15],
          }}
          transition={{ 
            duration: 12, 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
          className="absolute top-1/3 right-1/4 w-20 h-20 sm:w-28 sm:h-28 bg-gradient-to-br from-gray-600/20 to-gray-700/20 rounded-full blur-lg"
        />
      </div>

      <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-2xl xl:max-w-4xl space-y-6 sm:space-y-8">
          {/* Guest Data Preview */}
          {hasGuestData() && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <GuestDataPreview className="mb-6 sm:mb-8" />
            </motion.div>
          )}
          
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-glow-blue">
              <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-street font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-600 via-gray-700 to-gray-800 mb-3 sm:mb-4 animate-glow-pulse">
              CREATE ACCOUNT
            </h1>
            <p className="text-base sm:text-lg text-white/70 px-4">
              {hasGuestData() 
                ? "Continue your career journey and save your progress" 
                : "Start your revolutionary career exploration"
              }
            </p>
          </motion.div>

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8 lg:p-10 xl:p-12 shadow-2xl border border-gray-600/20 bg-gradient-to-br from-black/90 to-gray-900/10 backdrop-blur-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-600/5 to-gray-700/5" />
            
            <div className="relative">
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="mb-6 p-4 bg-gradient-to-r from-gray-600/20 to-gray-700/20 border border-gray-500/50 rounded-xl backdrop-blur-sm"
                  >
                    <div className="flex items-center space-x-3">
                      <AlertCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      <p className="text-gray-300 font-bold text-sm sm:text-base">{error}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
                  <div className="space-y-2">
                    <label htmlFor="displayName" className="block text-xs sm:text-sm font-black text-gray-400 uppercase tracking-wider">
                      FULL NAME
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <User className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                      </div>
                      <input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="street-form-input w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base"
                        placeholder="Enter your full name"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-xs sm:text-sm font-black text-gray-400 uppercase tracking-wider">
                      EMAIL ADDRESS
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                        <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="street-form-input w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 text-sm sm:text-base"
                        placeholder="Enter your email"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-xs sm:text-sm font-black text-gray-400 uppercase tracking-wider">
                    PASSWORD
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                    </div>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="street-form-input w-full pl-10 sm:pl-12 pr-12 sm:pr-16 py-3 sm:py-4 text-sm sm:text-base"
                      placeholder="Create a strong password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-white/40 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-black text-gray-400 uppercase tracking-wider">
                    CONFIRM PASSWORD
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                      <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white/40" />
                    </div>
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="street-form-input w-full pl-10 sm:pl-12 pr-12 sm:pr-16 py-3 sm:py-4 text-sm sm:text-base"
                      placeholder="Confirm your password"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-white/40 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
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
                          <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          <span>CREATING ACCOUNT...</span>
                        </>
                      ) : (
                        <>
                          <Rocket className="w-5 h-5 sm:w-6 sm:h-6" />
                          <span>CREATE ACCOUNT</span>
                          <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
                        </>
                      )}
                    </div>
                  </motion.button>
                </div>
              </form>

              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-white/70 font-medium text-sm sm:text-base">
                  Already have an account?{' '}
                  <Link 
                    to="/auth/login" 
                    className="text-transparent bg-clip-text bg-gradient-to-r from-gray-600 to-gray-700 font-black hover:from-gray-600 hover:to-gray-700 transition-all duration-200"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>

          {/* Features Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-4 sm:gap-6 lg:gap-8"
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 + index * 0.1 }}
                className="relative overflow-hidden rounded-xl p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-black/60 to-gray-900/10 border border-gray-600/20 backdrop-blur-sm hover:border-gray-600/40 transition-all duration-200"
              >
                <div className="flex items-center space-x-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-electric-blue to-neon-pink rounded-lg flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-white/70 text-sm sm:text-base">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>

          {/* Additional decoration */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-2 text-white/40 font-medium text-xs sm:text-sm">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Secure • Innovative • Revolutionary</span>
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4" />
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Register;
