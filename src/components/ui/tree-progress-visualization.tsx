/**
 * TreeProgressVisualization - Customer-facing tree growth visualization for onboarding progress
 * 
 * Visual metaphor: seed → sapling → tree → branches → buds → fruits
 * Represents the journey from career exploration to actionable achievements
 * Uses positive, growth-oriented language that empowers users
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Award, Target, Heart, Lightbulb } from 'lucide-react';
import { Badge } from './badge';
import { Card, CardContent } from './card';

export interface TreeProgressStage {
  internal: 'seed' | 'sprouting' | 'sapling' | 'young_tree' | 'branching' | 'budding' | 'fruiting';
  customerLabel: string;
  encouragingMessage: string;
  subtitle: string;
  visualTheme: 'curious-exploration' | 'broad-growth' | 'focused-development' | 'confident-action';
}

export interface CareerOpportunity {
  id: string;
  title: string;
  strength: number; // 0-1, represents branch thickness/prominence
  actionSteps: ActionableBud[];
  discovered: boolean;
}

export interface ActionableBud {
  id: string;
  action: string;
  type: 'skill' | 'education' | 'networking' | 'experience';
  readiness: number; // 0-1, how ready to bloom into achievement
  completed: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  type: 'milestone' | 'insight' | 'connection' | 'skill_gained';
  completedAt: string;
  celebrated: boolean;
}

export interface TreeProgressData {
  stage: TreeProgressStage;
  opportunities: CareerOpportunity[];
  actionSteps: ActionableBud[];
  achievements: Achievement[];
  strengthAreas: string[];
  nextEncouragingAction?: string;
}

interface TreeProgressVisualizationProps {
  data: TreeProgressData;
  compact?: boolean;
  interactive?: boolean;
  onOpportunityClick?: (opportunity: CareerOpportunity) => void;
  onActionStepClick?: (actionStep: ActionableBud) => void;
  onAchievementClick?: (achievement: Achievement) => void;
}

// Customer-facing stage definitions with positive framing
const getCustomerFacingStage = (internalStage: string): TreeProgressStage => {
  const stageMapping: Record<string, TreeProgressStage> = {
    'seed': {
      internal: 'seed',
      customerLabel: 'Starting Your Journey',
      encouragingMessage: 'Every great career begins with curiosity - you\'re in the perfect place to discover what excites you!',
      subtitle: 'Planting seeds of possibility',
      visualTheme: 'curious-exploration'
    },
    'sprouting': {
      internal: 'sprouting',
      customerLabel: 'Growing Understanding',
      encouragingMessage: 'Great! We\'re building your foundation and learning what makes you unique.',
      subtitle: 'Your potential is taking root',
      visualTheme: 'curious-exploration'
    },
    'sapling': {
      internal: 'sapling',
      customerLabel: 'Exploring Possibilities',
      encouragingMessage: 'You\'re thoughtfully discovering areas that match your interests and values.',
      subtitle: 'Branching out with confidence',
      visualTheme: 'broad-growth'
    },
    'young_tree': {
      internal: 'young_tree',
      customerLabel: 'Building Your Vision',
      encouragingMessage: 'You\'re developing clarity about your strengths and direction - excellent progress!',
      subtitle: 'Growing stronger every day',
      visualTheme: 'broad-growth'
    },
    'branching': {
      internal: 'branching',
      customerLabel: 'Discovering Opportunities',
      encouragingMessage: 'Look at all these exciting possibilities opening up for you!',
      subtitle: 'Multiple paths await your exploration',
      visualTheme: 'focused-development'
    },
    'budding': {
      internal: 'budding',
      customerLabel: 'Preparing for Action',
      encouragingMessage: 'You\'re ready to make things happen - your next steps are crystal clear!',
      subtitle: 'Action opportunities blooming',
      visualTheme: 'focused-development'
    },
    'fruiting': {
      internal: 'fruiting',
      customerLabel: 'Achieving Your Goals',
      encouragingMessage: 'Amazing progress! You\'re turning insights into real achievements!',
      subtitle: 'Celebrating your growth and success',
      visualTheme: 'confident-action'
    }
  };
  
  return stageMapping[internalStage] || stageMapping.seed;
};

export const TreeProgressVisualization: React.FC<TreeProgressVisualizationProps> = ({
  data,
  compact = false,
  interactive = true,
  onOpportunityClick,
  onActionStepClick,
  onAchievementClick
}) => {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [celebratingAchievement, setCelebratingAchievement] = useState<string | null>(null);

  // Celebrate new achievements
  useEffect(() => {
    const newAchievements = data.achievements.filter(a => !a.celebrated);
    if (newAchievements.length > 0) {
      // Trigger celebration animation for first new achievement
      setCelebratingAchievement(newAchievements[0].id);
      setTimeout(() => setCelebratingAchievement(null), 3000);
    }
  }, [data.achievements]);

  const treeHeight = compact ? 200 : 300;
  const treeWidth = compact ? 250 : 350;

  // SVG Tree Generation based on stage and data
  const renderTree = () => {
    const stage = data.stage;
    const centerX = treeWidth / 2;
    const baseY = treeHeight - 20;

    return (
      <svg
        width={treeWidth}
        height={treeHeight}
        viewBox={`0 0 ${treeWidth} ${treeHeight}`}
        className="transition-all duration-1000 ease-in-out"
      >
        {/* Background subtle gradient */}
        <defs>
          <radialGradient id="bg-gradient" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="rgba(134, 239, 172, 0.1)" />
            <stop offset="100%" stopColor="rgba(34, 197, 94, 0.05)" />
          </radialGradient>
          
          {/* Tree element gradients */}
          <linearGradient id="trunk-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          
          <linearGradient id="branch-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
        </defs>

        {/* Background */}
        <rect width="100%" height="100%" fill="url(#bg-gradient)" />

        {/* Ground line */}
        <motion.line
          x1={20}
          y1={baseY}
          x2={treeWidth - 20}
          y2={baseY}
          stroke="#D1D5DB"
          strokeWidth={2}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />

        {/* Seed Stage */}
        {stage.internal === 'seed' && (
          <motion.g
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
          >
            <circle
              cx={centerX}
              cy={baseY - 10}
              r={8}
              fill="#8B5CF6"
              className="drop-shadow-sm"
            />
            <motion.circle
              cx={centerX}
              cy={baseY - 10}
              r={12}
              fill="none"
              stroke="#A78BFA"
              strokeWidth={2}
              strokeOpacity={0.5}
              animate={{ r: [8, 16, 8], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.g>
        )}

        {/* Sprouting Stage */}
        {(stage.internal === 'sprouting' || stage.internal === 'sapling') && (
          <motion.g
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            {/* Small sprout */}
            <motion.path
              d={`M ${centerX} ${baseY} Q ${centerX - 5} ${baseY - 15} ${centerX} ${baseY - 25} Q ${centerX + 5} ${baseY - 35} ${centerX} ${baseY - 40}`}
              stroke="url(#trunk-gradient)"
              strokeWidth={3}
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.5 }}
            />
            
            {/* Small leaves */}
            {stage.internal === 'sapling' && (
              <>
                <motion.ellipse
                  cx={centerX - 8}
                  cy={baseY - 30}
                  rx={6}
                  ry={3}
                  fill="#10B981"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1 }}
                />
                <motion.ellipse
                  cx={centerX + 8}
                  cy={baseY - 25}
                  rx={6}
                  ry={3}
                  fill="#10B981"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                />
              </>
            )}
          </motion.g>
        )}

        {/* Young Tree and beyond */}
        {['young_tree', 'branching', 'budding', 'fruiting'].includes(stage.internal) && (
          <motion.g
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, type: "spring" }}
          >
            {/* Main trunk */}
            <motion.rect
              x={centerX - 6}
              y={baseY - 80}
              width={12}
              height={80}
              fill="url(#trunk-gradient)"
              rx={6}
              initial={{ height: 0 }}
              animate={{ height: 80 }}
              transition={{ duration: 1, delay: 0.5 }}
            />

            {/* Branches for opportunities */}
            {data.opportunities.map((opportunity, index) => {
              const branchY = baseY - 60 + (index * 15);
              const branchLength = 40 + (opportunity.strength * 30);
              const isLeft = index % 2 === 0;
              const branchEndX = centerX + (isLeft ? -branchLength : branchLength);

              return (
                <motion.g key={opportunity.id}>
                  {/* Branch line */}
                  <motion.line
                    x1={centerX}
                    y1={branchY}
                    x2={branchEndX}
                    y2={branchY - 10}
                    stroke="url(#branch-gradient)"
                    strokeWidth={Math.max(2, opportunity.strength * 6)}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: opportunity.discovered ? 1 : 0 }}
                    transition={{ duration: 0.8, delay: 1 + index * 0.2 }}
                    className={interactive ? "cursor-pointer" : ""}
                    onClick={() => interactive && onOpportunityClick?.(opportunity)}
                    onMouseEnter={() => interactive && setHoveredElement(opportunity.id)}
                    onMouseLeave={() => setHoveredElement(null)}
                  />

                  {/* Buds for action steps */}
                  {opportunity.actionSteps.map((actionStep, budIndex) => {
                    const budX = branchEndX - (isLeft ? -10 : 10) * budIndex;
                    const budY = branchY - 15 - budIndex * 5;

                    return (
                      <motion.circle
                        key={actionStep.id}
                        cx={budX}
                        cy={budY}
                        r={3 + actionStep.readiness * 2}
                        fill={actionStep.completed ? "#F59E0B" : "#84CC16"}
                        initial={{ scale: 0 }}
                        animate={{ scale: actionStep.readiness }}
                        transition={{ duration: 0.5, delay: 1.5 + index * 0.2 + budIndex * 0.1 }}
                        className={interactive ? "cursor-pointer hover:scale-110" : ""}
                        onClick={() => interactive && onActionStepClick?.(actionStep)}
                        onMouseEnter={() => interactive && setHoveredElement(actionStep.id)}
                        onMouseLeave={() => setHoveredElement(null)}
                      />
                    );
                  })}

                  {/* Branch label on hover */}
                  <AnimatePresence>
                    {hoveredElement === opportunity.id && (
                      <motion.g
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <rect
                          x={branchEndX - (opportunity.title.length * 3)}
                          y={branchY - 25}
                          width={opportunity.title.length * 6}
                          height={20}
                          fill="rgba(0,0,0,0.8)"
                          rx={4}
                        />
                        <text
                          x={branchEndX}
                          y={branchY - 10}
                          textAnchor="middle"
                          fill="white"
                          fontSize={10}
                          fontWeight="bold"
                        >
                          {opportunity.title}
                        </text>
                      </motion.g>
                    )}
                  </AnimatePresence>
                </motion.g>
              );
            })}

            {/* Achievements as fruits */}
            {data.achievements.map((achievement, index) => {
              const fruitX = centerX + (Math.sin(index * 0.8) * 60);
              const fruitY = baseY - 100 + (Math.cos(index * 0.8) * 20);

              return (
                <motion.g key={achievement.id}>
                  <motion.circle
                    cx={fruitX}
                    cy={fruitY}
                    r={6}
                    fill="#EF4444"
                    initial={{ scale: 0, y: fruitY - 50 }}
                    animate={{ 
                      scale: achievement.celebrated ? [1, 1.3, 1] : 1,
                      y: fruitY
                    }}
                    transition={{ 
                      duration: achievement.celebrated ? 0.5 : 0.8,
                      delay: 2 + index * 0.3,
                      type: "spring"
                    }}
                    className={interactive ? "cursor-pointer" : ""}
                    onClick={() => interactive && onAchievementClick?.(achievement)}
                    onMouseEnter={() => interactive && setHoveredElement(achievement.id)}
                    onMouseLeave={() => setHoveredElement(null)}
                  />
                  
                  {/* Achievement celebration */}
                  {celebratingAchievement === achievement.id && (
                    <motion.g>
                      {[...Array(6)].map((_, sparkleIndex) => (
                        <motion.circle
                          key={sparkleIndex}
                          cx={fruitX}
                          cy={fruitY}
                          r={2}
                          fill="#F59E0B"
                          initial={{ scale: 0, opacity: 1 }}
                          animate={{
                            scale: [0, 1, 0],
                            opacity: [1, 1, 0],
                            x: Math.cos(sparkleIndex * 60) * 20,
                            y: Math.sin(sparkleIndex * 60) * 20
                          }}
                          transition={{ duration: 1, delay: sparkleIndex * 0.1 }}
                        />
                      ))}
                    </motion.g>
                  )}
                </motion.g>
              );
            })}
          </motion.g>
        )}

        {/* Gentle swaying animation */}
        <motion.g
          animate={{ rotate: [-0.5, 0.5, -0.5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: `${centerX}px ${baseY}px` }}
        >
          {/* This would contain elements that should sway */}
        </motion.g>
      </svg>
    );
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200 shadow-lg">
      <CardContent className="p-6">
        {/* Stage header with encouraging message */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5 text-purple-600" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900">
              {data.stage.customerLabel}
            </h3>
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Star className="w-5 h-5 text-yellow-500" />
            </motion.div>
          </div>
          <p className="text-sm text-gray-600 mb-2">{data.stage.subtitle}</p>
          <p className="text-sm text-purple-700 font-medium bg-purple-50 rounded-lg p-3">
            {data.stage.encouragingMessage}
          </p>
        </div>

        {/* Tree visualization */}
        <div className="flex justify-center mb-6">
          {renderTree()}
        </div>

        {/* Progress summary */}
        {!compact && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <Target className="w-6 h-6 text-blue-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-blue-700">
                {data.opportunities.filter(o => o.discovered).length}
              </div>
              <div className="text-xs text-blue-600">Opportunities</div>
            </div>
            
            <div className="bg-green-50 rounded-lg p-3">
              <Lightbulb className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-green-700">
                {data.actionSteps.filter(a => a.readiness > 0.5).length}
              </div>
              <div className="text-xs text-green-600">Ready Actions</div>
            </div>
            
            <div className="bg-yellow-50 rounded-lg p-3">
              <Award className="w-6 h-6 text-yellow-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-yellow-700">
                {data.achievements.length}
              </div>
              <div className="text-xs text-yellow-600">Achievements</div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-3">
              <Heart className="w-6 h-6 text-purple-600 mx-auto mb-1" />
              <div className="text-lg font-bold text-purple-700">
                {data.strengthAreas.length}
              </div>
              <div className="text-xs text-purple-600">Strengths</div>
            </div>
          </div>
        )}

        {/* Next encouraging action */}
        {data.nextEncouragingAction && (
          <motion.div
            className="mt-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg p-4 border border-purple-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <Sparkles className="w-4 h-4 text-purple-600" />
              </motion.div>
              <span className="text-sm font-medium text-purple-800">
                Next Step: {data.nextEncouragingAction}
              </span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};