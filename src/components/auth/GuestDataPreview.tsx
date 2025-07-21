import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/card';
import { MessageSquare, Briefcase, User, PlayCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface GuestDataPreviewProps {
  className?: string;
}

export const GuestDataPreview: React.FC<GuestDataPreviewProps> = ({ className = '' }) => {
  const { hasGuestData, getGuestDataPreview } = useAuth();

  // Only show if there's guest data to preview
  if (!hasGuestData()) {
    return null;
  }

  const preview = getGuestDataPreview();
  const hasAnyData = preview.careerCards > 0 || 
                    preview.conversationMessages > 0 || 
                    preview.interests > 0 || 
                    preview.goals > 0 || 
                    preview.videosWatched > 0;

  if (!hasAnyData) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full ${className}`}
    >
      <Card className="p-6 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-200 shadow-lg">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
            </div>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-2 md:mb-3">
            Save Your Progress
          </h2>
          <p className="text-slate-600 text-sm md:text-base leading-relaxed">
            We found valuable data from your browsing session that we can save to your new account.
          </p>
        </div>

        {/* Data Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Career Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl p-4 md:p-6 text-center shadow-sm border border-slate-100"
          >
            <div className="flex justify-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 md:w-6 md:h-6 text-green-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-slate-800 mb-1 md:mb-2">
              {preview.careerCards}
            </div>
            <div className="text-slate-600 font-medium mb-1 text-sm md:text-base">
              Career Discoveries
            </div>
            <div className="text-xs md:text-sm text-slate-500">
              Personalized career suggestions
            </div>
          </motion.div>

          {/* Conversation Messages */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-4 md:p-6 text-center shadow-sm border border-slate-100"
          >
            <div className="flex justify-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-slate-800 mb-1 md:mb-2">
              {Math.ceil(preview.conversationMessages / 2)}
            </div>
            <div className="text-slate-600 font-medium mb-1 text-sm md:text-base">
              Conversation{Math.ceil(preview.conversationMessages / 2) === 1 ? '' : 's'}
            </div>
            <div className="text-xs md:text-sm text-slate-500">
              Your chat history with AI
            </div>
          </motion.div>

          {/* Profile Insights */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl p-4 md:p-6 text-center shadow-sm border border-slate-100"
          >
            <div className="flex justify-center mb-3 md:mb-4">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-slate-800 mb-1 md:mb-2">
              {preview.interests + preview.goals}
            </div>
            <div className="text-slate-600 font-medium mb-1 text-sm md:text-base">
              Profile Insights
            </div>
            <div className="text-xs md:text-sm text-slate-500">
              {preview.interests > 0 && preview.goals > 0 
                ? `${preview.interests} interests, ${preview.goals} goals`
                : preview.interests > 0 
                  ? `${preview.interests} interests identified`
                  : `${preview.goals} goals identified`
              }
            </div>
          </motion.div>
        </div>

        {/* Videos Watched (if any) */}
        {preview.videosWatched > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6 md:mb-8"
          >
            <div className="bg-white rounded-xl p-3 md:p-4 text-center shadow-sm border border-slate-100 max-w-xs mx-auto">
              <div className="flex justify-center mb-2 md:mb-3">
                <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <PlayCircle className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                </div>
              </div>
              <div className="text-lg md:text-xl font-bold text-slate-800 mb-1">
                {preview.videosWatched}
              </div>
              <div className="text-slate-600 text-xs md:text-sm">
                Video{preview.videosWatched === 1 ? '' : 's'} Watched
              </div>
            </div>
          </motion.div>
        )}

        {/* Confirmation Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-200"
        >
          <div className="flex items-center justify-center gap-2 md:gap-3">
            <div className="w-5 h-5 md:w-6 md:h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-blue-800 font-medium text-center text-sm md:text-base">
              All this data will be automatically saved to your new account
            </p>
          </div>
        </motion.div>
      </Card>
    </motion.div>
  );
};

export default GuestDataPreview; 