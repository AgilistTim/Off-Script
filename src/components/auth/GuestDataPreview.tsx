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
      <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-blue-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Save Your Progress
            </h3>
            <p className="text-sm text-gray-600">
              We found valuable data from your browsing session that we can save to your new account.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Career Cards */}
          {preview.careerCards > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {preview.careerCards} Career {preview.careerCards === 1 ? 'Discovery' : 'Discoveries'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Personalized career suggestions
                </p>
              </div>
            </motion.div>
          )}

          {/* Conversation Messages */}
          {preview.conversationMessages > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {Math.floor(preview.conversationMessages / 2)} Conversation{Math.floor(preview.conversationMessages / 2) === 1 ? '' : 's'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Your chat history with AI
                </p>
              </div>
            </motion.div>
          )}

          {/* Profile Insights */}
          {(preview.interests > 0 || preview.goals > 0) && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  Profile Insights
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {preview.interests > 0 && `${preview.interests} interests`}
                  {preview.interests > 0 && preview.goals > 0 && ', '}
                  {preview.goals > 0 && `${preview.goals} goals`}
                </p>
              </div>
            </motion.div>
          )}

          {/* Video Progress */}
          {preview.videosWatched > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-100"
            >
              <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                <PlayCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {preview.videosWatched} Video{preview.videosWatched === 1 ? '' : 's'} Watched
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Your viewing progress
                </p>
              </div>
            </motion.div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700 text-center">
            ✅ All this data will be automatically saved to your new account
          </p>
        </div>
      </Card>
    </motion.div>
  );
};

export default GuestDataPreview; 