import React from 'react';
import { motion } from 'framer-motion';
import { UserPlus, Star, TrendingUp, BookOpen, Target, ArrowRight } from 'lucide-react';

interface RegistrationPromptProps {
  onRegister: () => void;
  onDismiss: () => void;
}

export const RegistrationPrompt: React.FC<RegistrationPromptProps> = ({
  onRegister,
  onDismiss
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-blue-50 via-purple-50 to-blue-50 border border-blue-200 rounded-xl p-6 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Star className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Unlock Your Full Career Potential
            </h3>
            <p className="text-sm text-gray-600">
              Get detailed insights, save your progress, and build your career roadmap
            </p>
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          ×
        </button>
      </div>

      {/* Benefits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 text-sm">Advanced Career Analysis</h4>
            <p className="text-xs text-gray-600 mt-1">
              Get detailed conversation analysis with personality insights and market-aligned recommendations
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 text-sm">Personalized Career Dashboard</h4>
            <p className="text-xs text-gray-600 mt-1">
              Track your interests, save favorite careers, and monitor your exploration journey
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 text-sm">Learning Pathways</h4>
            <p className="text-xs text-gray-600 mt-1">
              Access curated courses, certifications, and step-by-step career transition guides
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800 text-sm">Progress Tracking</h4>
            <p className="text-xs text-gray-600 mt-1">
              Monitor your career exploration, set goals, and celebrate milestones
            </p>
          </div>
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-white/70 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">
              🎯 <span className="text-blue-600">Basic:</span> 3 career suggestions
            </p>
            <p className="text-sm font-medium text-gray-800">
              ⭐ <span className="text-purple-600">With Account:</span> Unlimited personalized career exploration
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Free account</p>
            <p className="text-lg font-bold text-green-600">£0</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onRegister}
          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          <span>Create Free Account</span>
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={onDismiss}
          className="px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors text-sm font-medium"
        >
          Continue as Guest
        </button>
      </div>

      {/* Trust Indicators */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>No spam, ever</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>1-click unsubscribe</span>
          </span>
          <span className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Your data stays private</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
}; 