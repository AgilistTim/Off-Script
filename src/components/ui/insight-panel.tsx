import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InsightCard, InsightCardProps } from './insight-card';
import { Button } from './button';

export interface InsightPanelProps {
  insights: InsightCardProps[];
  showRegistrationCTA?: boolean;
  onRegisterClick?: () => void;
  onInsightAction?: (insight: InsightCardProps) => void;
  title?: string;
  className?: string;
}

export function InsightPanel({
  insights,
  showRegistrationCTA = false,
  onRegisterClick,
  onInsightAction,
  title = "Career Insights",
  className = ""
}: InsightPanelProps) {
  const [expandedInsight, setExpandedInsight] = useState<number | null>(null);

  // Debug insights received
  useEffect(() => {
    console.log('🎯 INSIGHT PANEL: Received', insights.length, 'insights');
    console.log('📊 INSIGHT PANEL: Insights data:', insights.map(i => ({ title: i.title, type: i.type })));
    console.log('🚀 INSIGHT PANEL: Show registration CTA:', showRegistrationCTA);
  }, [insights, showRegistrationCTA]);

  const handleInsightClick = (insight: InsightCardProps, index: number) => {
    console.log('🔍 INSIGHT PANEL: Insight clicked:', insight.title);
    setExpandedInsight(expandedInsight === index ? null : index);
    onInsightAction?.(insight);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <span className="text-sm text-gray-500">
          {insights.length} insight{insights.length !== 1 ? 's' : ''} found
        </span>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {insights.map((insight, index) => (
            <motion.div
              key={index}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <InsightCard
                {...insight}
                onAction={() => handleInsightClick(insight, index)}
                isInteractive={true}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Registration CTA */}
      <AnimatePresence>
        {showRegistrationCTA && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg"
          >
            <div className="text-center space-y-3">
              <div className="text-2xl">🚀</div>
              <h4 className="font-semibold text-gray-900">
                Ready for Personalized Career Guidance?
              </h4>
              <p className="text-sm text-gray-700">
                Create a free account to get a personalized career roadmap, 
                save your insights, and unlock advanced tools.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button 
                  onClick={onRegisterClick}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Get My Career Roadmap
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {/* Continue without account */}}
                  className="text-gray-600"
                >
                  Continue Exploring
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Takes 30 seconds • No spam • Free forever
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress indicator when insights are being generated */}
      {insights.length === 0 && (
        <div className="text-center py-8">
          <div className="inline-flex items-center space-x-2 text-gray-500">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm">Analyzing your conversation for insights...</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default InsightPanel; 