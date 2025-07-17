import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CareerInsight, PersonalityPreference, CareerProfile } from '../../services/conversationAnalyzer';
import { Lightbulb, User, TrendingUp, Building, Sparkles, Clock, ArrowRight } from 'lucide-react';

interface InsightsPanelProps {
  careerProfile: CareerProfile;
  isVisible: boolean;
  onRegistrationPrompt?: () => void;
  className?: string;
}

interface InsightCardProps {
  insight: CareerInsight;
  index: number;
}

// Individual insight card component
const InsightCard: React.FC<InsightCardProps> = ({ insight, index }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'interest': return <Lightbulb className="w-4 h-4" />;
      case 'skill': return <Sparkles className="w-4 h-4" />;
      case 'pathway': return <TrendingUp className="w-4 h-4" />;
      case 'industry': return <Building className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'interest': return 'from-blue-500 to-blue-600';
      case 'skill': return 'from-green-500 to-green-600';
      case 'pathway': return 'from-purple-500 to-purple-600';
      case 'industry': return 'from-orange-500 to-orange-600';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  const confidenceWidth = `${Math.round(insight.confidence * 100)}%`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg bg-gradient-to-r ${getInsightColor(insight.type)} text-white flex-shrink-0`}>
          {getInsightIcon(insight.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 text-sm truncate">
            {insight.title}
          </h4>
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {insight.description}
          </p>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>Confidence</span>
              <span>{Math.round(insight.confidence * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <motion.div
                className={`h-1 rounded-full bg-gradient-to-r ${getInsightColor(insight.type)}`}
                initial={{ width: 0 }}
                animate={{ width: confidenceWidth }}
                transition={{ duration: 0.5, delay: index * 0.1 + 0.2 }}
              />
            </div>
          </div>
          {insight.relatedTerms.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {insight.relatedTerms.slice(0, 3).map((term, i) => (
                <span
                  key={i}
                  className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Personality preferences section
const PersonalitySection: React.FC<{ preferences: PersonalityPreference[] }> = ({ preferences }) => {
  if (preferences.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-900 text-sm flex items-center space-x-2">
        <User className="w-4 h-4" />
        <span>Work Style Preferences</span>
      </h3>
      <div className="space-y-2">
        {preferences.map((pref, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-50 rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-900 capitalize">
                {pref.category.replace('_', ' ')}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                pref.strength === 'strong' ? 'bg-green-100 text-green-800' :
                pref.strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {pref.strength}
              </span>
            </div>
            <p className="text-sm text-gray-700">{pref.preference}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Registration prompt section
const RegistrationPrompt: React.FC<{ 
  registrationReadiness: { score: number; reasons: string[] };
  onPrompt: () => void;
}> = ({ registrationReadiness, onPrompt }) => {
  if (registrationReadiness.score < 25) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 bg-blue-500 rounded-lg text-white flex-shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            Great insights discovered! 🎉
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            We've uncovered some valuable career insights about you. Create an account to save your progress and get personalized recommendations.
          </p>
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">
              Readiness Score: {registrationReadiness.score}%
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${registrationReadiness.score}%` }}
                transition={{ duration: 1 }}
              />
            </div>
          </div>
          <button
            onClick={onPrompt}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <span>Create Account & Save Progress</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <div className="mt-2 text-xs text-gray-500">
            Ready because: {registrationReadiness.reasons.join(', ')}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Summary section for periodic insights
const ConversationSummary: React.FC<{ summary?: string }> = ({ summary }) => {
  if (!summary) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200"
    >
      <h3 className="font-semibold text-gray-900 text-sm mb-2 flex items-center space-x-2">
        <Clock className="w-4 h-4" />
        <span>Your Career Journey So Far</span>
      </h3>
      <p className="text-sm text-gray-700">{summary}</p>
    </motion.div>
  );
};

// Main insights panel component
export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  careerProfile,
  isVisible,
  onRegistrationPrompt,
  className = ''
}) => {
  const [registrationReadiness, setRegistrationReadiness] = useState({ score: 0, reasons: [] as string[] });

  // Update registration readiness when profile changes
  useEffect(() => {
    const triggers = careerProfile.registrationTriggers;
    const reasons: string[] = [];
    let score = 0;

    if (triggers.timeThreshold) {
      score += 25;
      reasons.push('Meaningful conversation time');
    }
    if (triggers.insightThreshold) {
      score += 35;
      reasons.push('Rich career insights discovered');
    }
    if (triggers.engagementThreshold) {
      score += 25;
      reasons.push('Deep conversation engagement');
    }
    if (triggers.userInitiated) {
      score += 15;
      reasons.push('User expressed interest in next steps');
    }

    setRegistrationReadiness({ score, reasons });
  }, [careerProfile.registrationTriggers]);

  const allInsights = [
    ...careerProfile.interests,
    ...careerProfile.skills,
    ...careerProfile.suggestedPaths
  ].sort((a, b) => b.extractedAt.getTime() - a.extractedAt.getTime());

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`bg-white border-l border-gray-200 overflow-y-auto ${className}`}
    >
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 className="font-bold text-gray-900 text-lg flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            <span>Career Insights</span>
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Discovering your career potential in real-time
          </p>
          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            <span>{careerProfile.totalInsights} insights found</span>
            <span>•</span>
            <span>{careerProfile.interests.length} interests</span>
            <span>•</span>
            <span>{careerProfile.skills.length} skills</span>
          </div>
        </div>

        {/* Registration prompt */}
        <AnimatePresence>
          {registrationReadiness.score >= 50 && onRegistrationPrompt && (
            <RegistrationPrompt 
              registrationReadiness={registrationReadiness}
              onPrompt={onRegistrationPrompt}
            />
          )}
        </AnimatePresence>

        {/* Conversation summary */}
        {careerProfile.conversationSummary && (
          <ConversationSummary summary={careerProfile.conversationSummary} />
        )}

        {/* Personality preferences */}
        <PersonalitySection preferences={careerProfile.preferences} />

        {/* Career insights */}
        {allInsights.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 text-sm">Recent Discoveries</h3>
            <div className="space-y-3">
              <AnimatePresence>
                {allInsights.slice(0, 8).map((insight, index) => (
                  <InsightCard key={insight.id} insight={insight} index={index} />
                ))}
              </AnimatePresence>
            </div>
            {allInsights.length > 8 && (
              <p className="text-xs text-gray-500 text-center">
                And {allInsights.length - 8} more insights...
              </p>
            )}
          </div>
        )}

        {/* Empty state */}
        {careerProfile.totalInsights === 0 && (
          <div className="text-center py-8">
            <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Start Exploring Your Career
            </h3>
            <p className="text-xs text-gray-500">
              Share your interests and experiences to discover personalized career insights
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default InsightsPanel; 