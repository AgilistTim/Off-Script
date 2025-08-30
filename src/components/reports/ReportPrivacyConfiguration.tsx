/**
 * Report Privacy Configuration Component
 * 
 * Provides accordion-based privacy controls allowing users to configure
 * data inclusion levels for each section of their report.
 * 
 * Features:
 * - Accordion UI for organized data sections
 * - Radio button controls for privacy levels (exclude/summary/detailed)
 * - Visual indicators for privacy level selection
 * - Branded styling with OffScript color palette
 */

import React from 'react';
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '../ui/accordion';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  User, 
  MessageSquare, 
  Target, 
  TrendingUp, 
  Brain, 
  Award,
  Clock,
  BarChart3,
  Eye,
  EyeOff,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  PrivacyConfiguration, 
  PrivacyLevel, 
  ReportType,
  isPrivacyLevel 
} from '../../types/reports';

interface ReportPrivacyConfigurationProps {
  configuration: PrivacyConfiguration;
  onConfigurationChange: (section: string, level: PrivacyLevel) => void;
  reportType: ReportType;
  className?: string;
}

// Data section definitions with metadata
const DATA_SECTIONS = [
  {
    key: 'profileData',
    title: 'Profile Information',
    description: 'Basic profile details, contact information, and account preferences',
    icon: User,
    examples: ['Name', 'Age range', 'Location', 'Education level', 'Contact preferences']
  },
  {
    key: 'conversationHistory',
    title: 'Conversation History',
    description: 'Chat sessions, AI interactions, and discussion topics',
    icon: MessageSquare,
    examples: ['Chat summaries', 'Key discussion topics', 'Conversation frequency', 'Session duration']
  },
  {
    key: 'careerCards',
    title: 'Career Exploration',
    description: 'Career recommendations, pathway exploration, and interest assessment',
    icon: Target,
    examples: ['Career suggestions', 'Interest areas', 'Skill assessments', 'Pathway recommendations']
  },
  {
    key: 'engagementMetrics',
    title: 'Platform Engagement',
    description: 'Usage patterns, activity levels, and learning progress',
    icon: TrendingUp,
    examples: ['Time spent on platform', 'Feature usage', 'Learning milestones', 'Progress tracking']
  },
  {
    key: 'insights',
    title: 'AI Insights',
    description: 'Personalized analysis, trend identification, and recommendations',
    icon: Brain,
    examples: ['Personality insights', 'Career fit analysis', 'Learning patterns', 'Growth recommendations']
  },
  {
    key: 'achievements',
    title: 'Achievements & Milestones',
    description: 'Completed goals, learning milestones, and progress markers',
    icon: Award,
    examples: ['Completed assessments', 'Learning badges', 'Goal achievements', 'Milestone tracking']
  }
] as const;

// Privacy level definitions
const PRIVACY_LEVELS: Array<{
  value: PrivacyLevel;
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
}> = [
  {
    value: 'exclude',
    label: 'Exclude',
    description: 'Completely exclude this data from the report',
    icon: EyeOff,
    color: 'text-red-600 dark:text-red-400'
  },
  {
    value: 'summary',
    label: 'Summary',
    description: 'Include high-level overview without specific details',
    icon: FileText,
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    value: 'detailed',
    label: 'Detailed',
    description: 'Include comprehensive data and specific insights',
    icon: Eye,
    color: 'text-green-600 dark:text-green-400'
  }
];

// Report type specific recommendations
const getRecommendedLevel = (section: string, reportType: ReportType): PrivacyLevel => {
  const recommendations: Record<ReportType, Record<string, PrivacyLevel>> = {
    parent: {
      profileData: 'summary',
      conversationHistory: 'summary',
      careerCards: 'detailed',
      engagementMetrics: 'summary',
      insights: 'detailed',
      achievements: 'detailed'
    },
    counselor: {
      profileData: 'detailed',
      conversationHistory: 'detailed',
      careerCards: 'detailed',
      engagementMetrics: 'detailed',
      insights: 'detailed',
      achievements: 'detailed'
    },
    mentor: {
      profileData: 'summary',
      conversationHistory: 'summary',
      careerCards: 'detailed',
      engagementMetrics: 'summary',
      insights: 'detailed',
      achievements: 'detailed'
    },
    employer: {
      profileData: 'summary',
      conversationHistory: 'exclude',
      careerCards: 'detailed',
      engagementMetrics: 'summary',
      insights: 'summary',
      achievements: 'detailed'
    }
  };
  
  return recommendations[reportType][section] || 'summary';
};

const ReportPrivacyConfiguration: React.FC<ReportPrivacyConfigurationProps> = ({
  configuration,
  onConfigurationChange,
  reportType,
  className
}) => {
  // Get privacy level badge color
  const getPrivacyBadgeVariant = (level: PrivacyLevel) => {
    switch (level) {
      case 'exclude': return 'destructive';
      case 'summary': return 'secondary';
      case 'detailed': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Privacy & Data Controls
        </CardTitle>
        <CardDescription>
          Configure what information to include in your {reportType} report. 
          You can exclude sensitive data, include summaries, or provide detailed information for each section.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Privacy level legend */}
        <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          {PRIVACY_LEVELS.map((level) => {
            const Icon = level.icon;
            return (
              <div key={level.value} className="flex items-center gap-2 text-sm">
                <Icon className={cn("h-4 w-4", level.color)} />
                <span className="font-medium">{level.label}</span>
              </div>
            );
          })}
        </div>

        {/* Data sections accordion */}
        <Accordion type="multiple" defaultValue={DATA_SECTIONS.map(s => s.key)} className="space-y-2">
          {DATA_SECTIONS.map((section) => {
            const Icon = section.icon;
            const currentLevel = configuration.sections[section.key] || 'summary';
            const recommendedLevel = getRecommendedLevel(section.key, reportType);
            const isRecommended = currentLevel === recommendedLevel;

            return (
              <AccordionItem 
                key={section.key} 
                value={section.key}
                className="border rounded-lg"
              >
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center justify-between w-full mr-4">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <div className="text-left">
                        <h4 className="font-medium">{section.title}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {section.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isRecommended && (
                        <Badge variant="outline" className="text-xs">
                          Recommended
                        </Badge>
                      )}
                      <Badge variant={getPrivacyBadgeVariant(currentLevel)}>
                        {currentLevel}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-4">
                    {/* Examples of data in this section */}
                    <div>
                      <h5 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                        This section includes:
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {section.examples.map((example, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {example}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Privacy level selection */}
                    <div>
                      <h5 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                        Privacy Level:
                      </h5>
                      <RadioGroup
                        value={currentLevel}
                        onValueChange={(value) => {
                          if (isPrivacyLevel(value)) {
                            onConfigurationChange(section.key, value);
                          }
                        }}
                        className="space-y-3"
                      >
                        {PRIVACY_LEVELS.map((level) => {
                          const Icon = level.icon;
                          const isSelected = currentLevel === level.value;
                          const isRecommendedLevel = level.value === recommendedLevel;
                          
                          return (
                            <div key={level.value} className="flex items-start space-x-3">
                              <RadioGroupItem 
                                value={level.value} 
                                id={`${section.key}-${level.value}`}
                                className={cn(
                                  "mt-1",
                                  isSelected && level.color
                                )}
                              />
                              <label 
                                htmlFor={`${section.key}-${level.value}`}
                                className="flex-1 cursor-pointer"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Icon className={cn("h-4 w-4", level.color)} />
                                  <span className="font-medium text-sm">
                                    {level.label}
                                  </span>
                                  {isRecommendedLevel && (
                                    <Badge variant="outline" className="text-xs">
                                      Suggested for {reportType}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {level.description}
                                </p>
                              </label>
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        {/* Summary overview */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Privacy Summary
          </h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            {PRIVACY_LEVELS.map((level) => {
              const count = Object.values(configuration.sections).filter(v => v === level.value).length;
              return (
                <div key={level.value} className="text-center">
                  <div className="font-bold text-lg text-blue-900 dark:text-blue-100">
                    {count}
                  </div>
                  <div className="text-blue-700 dark:text-blue-300">
                    {level.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportPrivacyConfiguration;
