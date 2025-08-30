/**
 * Skills Assessment Radar Chart
 * 
 * Displays user's skill levels across different competency areas
 * using a radar/spider chart visualization.
 * 
 * Features:
 * - Multi-dimensional skill assessment
 * - Radar chart with branded styling
 * - Skill level indicators and descriptions
 * - Export-ready for PDF inclusion
 */

import React, { forwardRef } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Brain, Target, Zap } from 'lucide-react';

export interface SkillData {
  skill: string;
  level: number; // 0-100 scale
  category: 'technical' | 'soft' | 'domain' | 'other';
  description?: string;
  improvement?: string;
}

interface SkillsRadarChartProps {
  data: SkillData[];
  title?: string;
  description?: string;
  size?: number;
  showGrid?: boolean;
  maxValue?: number;
  className?: string;
}

// Skill level descriptions
const getSkillLevelDescription = (level: number): { label: string; color: string } => {
  if (level >= 80) return { label: 'Expert', color: 'text-green-600' };
  if (level >= 60) return { label: 'Proficient', color: 'text-blue-600' };
  if (level >= 40) return { label: 'Developing', color: 'text-yellow-600' };
  if (level >= 20) return { label: 'Beginner', color: 'text-orange-600' };
  return { label: 'Emerging', color: 'text-red-600' };
};

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as SkillData;
    const levelInfo = getSkillLevelDescription(data.level);
    
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg max-w-xs">
        <p className="font-semibold text-gray-900 dark:text-white mb-1">
          {data.skill}
        </p>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-medium ${levelInfo.color}`}>
            {levelInfo.label}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            ({data.level}/100)
          </span>
        </div>
        {data.description && (
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {data.description}
          </p>
        )}
        {data.improvement && (
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 {data.improvement}
          </p>
        )}
      </div>
    );
  }
  return null;
};

const SkillsRadarChart = forwardRef<HTMLDivElement, SkillsRadarChartProps>(({
  data,
  title = "Skills Assessment",
  description = "Current skill levels across key competency areas",
  size = 400,
  showGrid = true,
  maxValue = 100,
  className = ""
}, ref) => {
  // Process data for radar chart
  const radarData = data.map(skill => ({
    skill: skill.skill.length > 12 ? `${skill.skill.substring(0, 12)}...` : skill.skill,
    fullSkill: skill.skill,
    level: skill.level,
    category: skill.category,
    description: skill.description,
    improvement: skill.improvement
  }));

  // Calculate skill statistics
  const averageLevel = data.length > 0 ? data.reduce((sum, skill) => sum + skill.level, 0) / data.length : 0;
  const topSkill = data.reduce((max, skill) => skill.level > max.level ? skill : max, data[0] || { skill: 'N/A', level: 0 });
  const skillCounts = data.reduce((counts, skill) => {
    const levelInfo = getSkillLevelDescription(skill.level);
    counts[levelInfo.label] = (counts[levelInfo.label] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Ensure we have data to display
  if (!data.length) {
    return (
      <Card ref={ref} className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">
            No skills data available
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      ref={ref} 
      className={className}
      data-chart-title={title}
      data-chart-description={description}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-purple-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Skills overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Average
              </span>
            </div>
            <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
              {averageLevel.toFixed(0)}%
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Top Skill
              </span>
            </div>
            <div className="text-sm font-bold text-green-900 dark:text-green-100">
              {topSkill.skill.length > 10 ? `${topSkill.skill.substring(0, 10)}...` : topSkill.skill}
            </div>
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Total Skills
              </span>
            </div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {data.length}
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Proficient+
              </span>
            </div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
              {(skillCounts['Expert'] || 0) + (skillCounts['Proficient'] || 0)}
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="flex justify-center">
          <ResponsiveContainer width={size} height={size}>
            <RadarChart data={radarData}>
              {showGrid && (
                <PolarGrid 
                  stroke="#E5E7EB" 
                  strokeDasharray="2 2"
                />
              )}
              <PolarAngleAxis 
                dataKey="skill" 
                tick={{ fontSize: 12, fill: '#6B7280' }}
                className="text-xs"
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, maxValue]}
                tick={{ fontSize: 10, fill: '#9CA3AF' }}
                tickCount={5}
              />
              <Radar
                name="Skill Level"
                dataKey="level"
                stroke="#8B5CF6"
                fill="#8B5CF6"
                fillOpacity={0.2}
                strokeWidth={2}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
              />
              <Tooltip content={<CustomTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Skills breakdown by category */}
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Skills by Category
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Object.entries(
              data.reduce((categories, skill) => {
                if (!categories[skill.category]) {
                  categories[skill.category] = [];
                }
                categories[skill.category].push(skill);
                return categories;
              }, {} as Record<string, SkillData[]>)
            ).map(([category, skills]) => (
              <div key={category} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <h5 className="font-medium text-gray-900 dark:text-white mb-2 capitalize">
                  {category} Skills ({skills.length})
                </h5>
                <div className="space-y-1">
                  {skills.slice(0, 3).map((skill, index) => {
                    const levelInfo = getSkillLevelDescription(skill.level);
                    return (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {skill.skill.length > 15 ? `${skill.skill.substring(0, 15)}...` : skill.skill}
                        </span>
                        <span className={levelInfo.color}>
                          {skill.level}%
                        </span>
                      </div>
                    );
                  })}
                  {skills.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      +{skills.length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

SkillsRadarChart.displayName = 'SkillsRadarChart';

export default SkillsRadarChart;
