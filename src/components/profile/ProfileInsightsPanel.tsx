/**
 * Profile Insights Panel Component
 * 
 * Displays AI-generated personalized career insights and recommendations
 * in an engaging format to inform, excite, and trigger user engagement.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Lightbulb, 
  Target, 
  TrendingUp, 
  Star, 
  Clock, 
  ArrowRight, 
  RefreshCw,
  Sparkles,
  Award,
  Zap,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { AIInsightsService, AIInsightsResponse, PersonalizedInsight, ActionableRecommendation } from '../../services/profile/aiInsightsService';
import { ProfileAnalytics } from '../../services/profile/profileAnalyticsService';

interface ProfileInsightsPanelProps {
  userId: string;
  analytics: ProfileAnalytics;
  userProfile?: any;
  className?: string;
}

const ProfileInsightsPanel: React.FC<ProfileInsightsPanelProps> = ({
  userId,
  analytics,
  userProfile,
  className = ""
}) => {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);
  const [expandedRecommendation, setExpandedRecommendation] = useState<number | null>(null);

  // Load AI insights with optional force refresh
  const loadInsights = async (forceRefresh = false) => {
    if (!userId || loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await AIInsightsService.generateComprehensiveInsights(
        userId,
        analytics,
        userProfile,
        forceRefresh
      );
      setInsights(response);
    } catch (err) {
      console.error('Error loading AI insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInsights();
  }, [userId]);

  // Get insight icon and color based on category
  const getInsightStyle = (category: string, significance: string) => {
    const styles = {
      strengths: { 
        icon: Star, 
        color: significance === 'high' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-yellow-25 border-yellow-100 text-yellow-700',
        iconColor: 'text-yellow-600'
      },
      growth_areas: { 
        icon: TrendingUp, 
        color: significance === 'high' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-green-25 border-green-100 text-green-700',
        iconColor: 'text-green-600'
      },
      opportunities: { 
        icon: Lightbulb, 
        color: significance === 'high' ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-purple-25 border-purple-100 text-purple-700',
        iconColor: 'text-purple-600'
      },
      recommendations: { 
        icon: Target, 
        color: significance === 'high' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-blue-25 border-blue-100 text-blue-700',
        iconColor: 'text-blue-600'
      }
    };
    return styles[category as keyof typeof styles] || styles.recommendations;
  };

  // Get recommendation priority styling
  const getRecommendationStyle = (priority: string) => {
    const styles = {
      critical: { color: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-800', icon: 'text-red-600' },
      high: { color: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-800', icon: 'text-orange-600' },
      medium: { color: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-800', icon: 'text-blue-600' },
      low: { color: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-800', icon: 'text-gray-600' }
    };
    return styles[priority as keyof typeof styles] || styles.medium;
  };

  if (loading) {
    return (
      <Card className={`${className} bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-purple-600" />
            Career Insights
          </CardTitle>
          <CardDescription>
            Generating your personalized career intelligence...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-700">Analyzing your career journey...</p>
              <p className="text-xs text-gray-500">This may take a few moments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} bg-gradient-to-br from-red-50 to-orange-50 border-red-200`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Unable to Load Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 space-y-4">
            <p className="text-sm text-red-700">{error}</p>
            <Button 
              onClick={loadInsights} 
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className={`${className} bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-gray-600" />
            Career Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm text-gray-600">No insights available yet. Start a conversation to unlock personalized guidance!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Insights Section */}
      <Card className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border-purple-200 overflow-hidden">
        <CardHeader className="relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full -translate-y-8 translate-x-8" />
          <CardTitle className="flex items-center gap-2 relative">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Your Career Intelligence
          </CardTitle>
          <CardDescription>
            Personalized insights based on your exploration journey
          </CardDescription>
        </CardHeader>
        <CardContent className="relative">

          <Button 
            onClick={() => loadInsights(true)} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Insights
          </Button>
        </CardContent>
      </Card>

      {/* Key Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personalized Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Key Insights
            </CardTitle>
            <CardDescription>
              AI-discovered patterns in your career journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.insights.slice(0, 4).map((insight, index) => {
                const style = getInsightStyle(insight.category, insight.significance);
                const IconComponent = style.icon;
                const isExpanded = expandedInsight === index;

                return (
                  <motion.div
                    key={index}
                    layout
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${style.color} hover:shadow-md`}
                    onClick={() => setExpandedInsight(isExpanded ? null : index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <IconComponent className={`h-5 w-5 ${style.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium truncate">{insight.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {insight.significance}
                            </Badge>
                            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-current/20"
                            >
                              <p className="text-sm opacity-90">{insight.description}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {insight.timeline}
                                </span>
                                {insight.actionable && (
                                  <span className="flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" />
                                    Actionable
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Actionable Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Next Steps
            </CardTitle>
            <CardDescription>
              Personalized recommendations for your career growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.recommendations.slice(0, 3).map((recommendation, index) => {
                const style = getRecommendationStyle(recommendation.priority);
                const isExpanded = expandedRecommendation === index;

                return (
                  <motion.div
                    key={index}
                    layout
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${style.color} hover:shadow-md`}
                    onClick={() => setExpandedRecommendation(isExpanded ? null : index)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <Award className={`h-5 w-5 ${style.icon}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium truncate">{recommendation.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge className={`text-xs ${style.badge}`}>
                              {recommendation.priority}
                            </Badge>
                            <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                        <p className="text-xs opacity-75 mt-1">{recommendation.timeToComplete}</p>
                        
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="mt-3 pt-3 border-t border-current/20"
                            >
                              <p className="text-sm opacity-90 mb-3">{recommendation.description}</p>
                              
                              <div className="space-y-2">
                                <h5 className="text-xs font-medium">Action Steps:</h5>
                                {recommendation.steps.map((step, stepIndex) => (
                                  <div key={stepIndex} className="flex items-start gap-2 text-xs">
                                    <span className="flex-shrink-0 w-4 h-4 bg-current/20 rounded-full flex items-center justify-center text-xs font-medium mt-0.5">
                                      {stepIndex + 1}
                                    </span>
                                    <span className="opacity-90">{step}</span>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 pt-2 border-t border-current/20">
                                <p className="text-xs font-medium mb-1">Success Metrics:</p>
                                <div className="flex flex-wrap gap-1">
                                  {recommendation.successMetrics.map((metric, metricIndex) => (
                                    <Badge key={metricIndex} variant="outline" className="text-xs">
                                      {metric}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Pattern Analysis */}
      {insights.progressAnalysis.overall_pattern && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Progress Pattern Analysis
            </CardTitle>
            <CardDescription>
              AI-identified patterns in your career development journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Overall Pattern */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-green-900">
                    Overall Pattern: {insights.progressAnalysis.overall_pattern.pattern_type.replace('_', ' ').toUpperCase()}
                  </h4>
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={insights.progressAnalysis.overall_pattern.confidence} 
                      className="w-16 h-2" 
                    />
                    <span className="text-xs text-green-700">
                      {insights.progressAnalysis.overall_pattern.confidence}% confident
                    </span>
                  </div>
                </div>
                <p className="text-sm text-green-800 mb-3">
                  {insights.progressAnalysis.overall_pattern.description}
                </p>
                
                {insights.progressAnalysis.overall_pattern.predictions.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-green-900">Predictions:</h5>
                    {insights.progressAnalysis.overall_pattern.predictions.map((prediction, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs text-green-800">
                        <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span>{prediction}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Skill and Interest Patterns */}
              {(insights.progressAnalysis.skill_patterns.length > 0 || insights.progressAnalysis.interest_patterns.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {insights.progressAnalysis.skill_patterns.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-900 mb-2">Skill Development Patterns</h4>
                      {insights.progressAnalysis.skill_patterns.slice(0, 2).map((pattern, index) => (
                        <div key={index} className="text-xs text-blue-800 mb-1">
                          <span className="font-medium">{pattern.pattern_type}:</span> {pattern.description}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {insights.progressAnalysis.interest_patterns.length > 0 && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="text-sm font-medium text-purple-900 mb-2">Interest Evolution Patterns</h4>
                      {insights.progressAnalysis.interest_patterns.slice(0, 2).map((pattern, index) => (
                        <div key={index} className="text-xs text-purple-800 mb-1">
                          <span className="font-medium">{pattern.pattern_type}:</span> {pattern.description}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement Call-to-Action */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-indigo-900 mb-2">
                Keep Building Your Career Story! 🚀
              </h3>
              <p className="text-sm text-indigo-700 mb-3">
                The more you explore and engage, the more personalized your insights become.
              </p>
              <div className="flex items-center gap-4 text-xs text-indigo-600">
                <span>✨ New insights refresh automatically</span>
                <span>📈 Progress tracked in real-time</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={() => window.location.href = '/chat'}
              >
                Continue Exploring
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileInsightsPanel;
