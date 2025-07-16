import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm, SubmitHandler } from 'react-hook-form';
import { X, Mail, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface RegistrationData {
  name: string;
  email: string;
  careerStage: 'exploring' | 'early_career' | 'mid_career' | 'senior_career' | 'transitioning';
  primaryGoal: 'find_direction' | 'skill_development' | 'career_change' | 'advancement' | 'entrepreneurship';
}

export interface RegistrationPromptProps {
  isVisible: boolean;
  onClose: () => void;
  onRegistrationComplete: (data: RegistrationData) => void;
  className?: string;
  trigger: 'insights' | 'messages' | 'engagement';
  triggerCount: number;
}

export const RegistrationPrompt: React.FC<RegistrationPromptProps> = ({
  isVisible,
  onClose,
  onRegistrationComplete,
  className = '',
  trigger,
  triggerCount
}) => {
  const { currentUser } = useAuth();
  const [step, setStep] = useState<'prompt' | 'form' | 'success'>('prompt');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
    reset
  } = useForm<RegistrationData>({
    mode: 'onChange',
    defaultValues: {
      name: currentUser?.displayName || '',
      email: currentUser?.email || '',
      careerStage: 'exploring',
      primaryGoal: 'find_direction'
    }
  });

  // Don't show if user is already logged in
  if (currentUser) {
    return null;
  }

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'insights':
        return `You've explored ${triggerCount} career insights`;
      case 'messages':
        return `We've had a great ${triggerCount}-message conversation`;
      case 'engagement':
        return `You seem really engaged with career exploration`;
      default:
        return 'You seem interested in career guidance';
    }
  };

  const onSubmit: SubmitHandler<RegistrationData> = async (data) => {
    setIsSubmitting(true);
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onRegistrationComplete(data);
      setStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
        reset();
        setStep('prompt');
      }, 3000);
      
    } catch (error) {
      console.error('Registration failed:', error);
      // Handle error gracefully
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartRegistration = () => {
    setStep('form');
  };

  const handleClose = () => {
    onClose();
    setStep('prompt');
    reset();
  };

  // Animation variants
  const promptVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      y: -20,
      transition: { duration: 0.2 }
    }
  };

  const formVariants = {
    hidden: { opacity: 0, x: 300 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30
      }
    },
    exit: { 
      opacity: 0, 
      x: -300,
      transition: { duration: 0.3 }
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleClose}
        >
          <motion.div
            variants={step === 'form' ? formVariants : promptVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`bg-white rounded-lg shadow-xl max-w-md w-full ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex justify-end p-2">
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {step === 'prompt' && (
              <div className="px-6 pb-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Ready to unlock your full career potential?
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {getTriggerMessage()}! Create a free account to save your progress and get personalized career guidance.
                  </p>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Save your conversation history</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Get personalized career recommendations</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Track your career development journey</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-700">Access exclusive career insights</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleStartRegistration}
                    className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>Get Started - It's Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                  
                  <button
                    onClick={handleClose}
                    className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
                  >
                    Continue without account
                  </button>
                </div>
              </div>
            )}

            {step === 'form' && (
              <div className="px-6 pb-6">
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">
                    Create Your Free Account
                  </h3>
                  <p className="text-gray-600 text-sm">
                    Tell us a bit about yourself to get personalized career guidance
                  </p>
                </div>

                {/* Progressive Registration Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Name field */}
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('name', { 
                          required: 'Name is required',
                          minLength: { value: 2, message: 'Name must be at least 2 characters' }
                        })}
                        type="text"
                        id="name"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your name"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                    )}
                  </div>

                  {/* Email field */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        {...register('email', { 
                          required: 'Email is required',
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Invalid email address'
                          }
                        })}
                        type="email"
                        id="email"
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Career Stage */}
                  <div>
                    <label htmlFor="careerStage" className="block text-sm font-medium text-gray-700 mb-1">
                      Where are you in your career?
                    </label>
                    <select
                      {...register('careerStage', { required: 'Please select your career stage' })}
                      id="careerStage"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="exploring">Exploring options</option>
                      <option value="early_career">Early career (0-3 years)</option>
                      <option value="mid_career">Mid career (4-10 years)</option>
                      <option value="senior_career">Senior career (10+ years)</option>
                      <option value="transitioning">Career transition</option>
                    </select>
                  </div>

                  {/* Primary Goal */}
                  <div>
                    <label htmlFor="primaryGoal" className="block text-sm font-medium text-gray-700 mb-1">
                      What's your main career goal?
                    </label>
                    <select
                      {...register('primaryGoal', { required: 'Please select your primary goal' })}
                      id="primaryGoal"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="find_direction">Find career direction</option>
                      <option value="skill_development">Develop new skills</option>
                      <option value="career_change">Change careers</option>
                      <option value="advancement">Career advancement</option>
                      <option value="entrepreneurship">Start my own business</option>
                    </select>
                  </div>

                  {/* Submit button */}
                  <div className="pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => setStep('prompt')}
                    className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors"
                  >
                    ← Back
                  </button>
                </form>
              </div>
            )}

            {step === 'success' && (
              <div className="px-6 pb-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <ArrowRight className="w-8 h-8 text-green-600 transform rotate-45" />
                  </motion.div>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Welcome aboard! 🎉
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Your account has been created successfully. We'll now save your conversation history and provide personalized career guidance.
                </p>
                <div className="text-xs text-gray-500">
                  Redirecting to your dashboard...
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}; 