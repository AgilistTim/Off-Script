/**
 * CompactProgressIndicator - Space-efficient progress visualization for career insights panel
 * 
 * Designed for limited space in mobile/desktop career insights sidebars
 * Shows stage progression with minimal visual footprint
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Target, Lightbulb, Award, ChevronRight } from 'lucide-react';
import { Badge } from './badge';

export interface CompactProgressData {
  stage: {
    customerLabel: string;
    encouragingMessage: string;
    progress: number; // 0-1
  };
  stats: {
    opportunities: number;
    readyActions: number;
    achievements: number;
    strengths: number;
  };
  nextAction?: string;
}

interface CompactProgressIndicatorProps {
  data: CompactProgressData;
  onClick?: () => void;
}

export const CompactProgressIndicator: React.FC<CompactProgressIndicatorProps> = ({
  data,
  onClick
}) => {
  const progressPercentage = Math.round(data.stage.progress * 100);

  return (
    <motion.div
      className={`bg-gradient-to-br from-green-50 to-purple-50 border border-green-200 rounded-lg p-3 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stage Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="w-4 h-4 text-purple-600" />
          </motion.div>
          <span className="text-sm font-bold text-gray-900 truncate">
            {data.stage.customerLabel}
          </span>
        </div>
        {onClick && (
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">Progress</span>
          <span className="text-xs font-medium text-purple-700">{progressPercentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <motion.div
            className="bg-gradient-to-r from-purple-500 to-green-500 h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Compact Stats Grid */}
      <div className="grid grid-cols-4 gap-1 mb-2">
        <div className="text-center">
          <Target className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-blue-700">{data.stats.opportunities}</div>
          <div className="text-xs text-blue-600 leading-none">Opps</div>
        </div>
        
        <div className="text-center">
          <Lightbulb className="w-3 h-3 text-green-600 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-green-700">{data.stats.readyActions}</div>
          <div className="text-xs text-green-600 leading-none">Ready</div>
        </div>
        
        <div className="text-center">
          <Award className="w-3 h-3 text-yellow-600 mx-auto mb-0.5" />
          <div className="text-xs font-bold text-yellow-700">{data.stats.achievements}</div>
          <div className="text-xs text-yellow-600 leading-none">Achvd</div>
        </div>
        
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ❤️
          </motion.div>
          <div className="text-xs font-bold text-purple-700">{data.stats.strengths}</div>
          <div className="text-xs text-purple-600 leading-none">Strengths</div>
        </div>
      </div>

      {/* Next Action (if space allows) */}
      {data.nextAction && (
        <div className="bg-purple-50 rounded-md px-2 py-1 border border-purple-200">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-purple-600 flex-shrink-0" />
            <span className="text-xs text-purple-800 truncate">
              {data.nextAction}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Ultra-compact version for very tight spaces
 */
export const MiniProgressIndicator: React.FC<CompactProgressIndicatorProps> = ({
  data,
  onClick
}) => {
  const progressPercentage = Math.round(data.stage.progress * 100);

  return (
    <motion.div
      className={`bg-gradient-to-r from-purple-100 to-green-100 border border-purple-200 rounded-md p-2 ${
        onClick ? 'cursor-pointer hover:bg-opacity-80 transition-colors' : ''
      }`}
      onClick={onClick}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Single line with stage and progress */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-600" />
          <span className="text-xs font-medium text-gray-900 truncate">
            {data.stage.customerLabel}
          </span>
        </div>
        <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
          {progressPercentage}%
        </Badge>
      </div>

      {/* Inline stats */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-blue-700">
          <Target className="w-3 h-3 inline mr-0.5" />{data.stats.opportunities}
        </span>
        <span className="text-green-700">
          <Lightbulb className="w-3 h-3 inline mr-0.5" />{data.stats.readyActions}
        </span>
        <span className="text-yellow-700">
          <Award className="w-3 h-3 inline mr-0.5" />{data.stats.achievements}
        </span>
      </div>
    </motion.div>
  );
};