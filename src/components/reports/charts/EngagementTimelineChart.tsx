/**
 * Engagement Timeline Chart
 * 
 * Displays user's platform engagement over time using a line chart
 * with activity metrics and trend analysis.
 * 
 * Features:
 * - Time-based engagement tracking
 * - Multiple metric visualization
 * - Trend analysis with gradients
 * - Export-ready for PDF inclusion
 */

import React, { forwardRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { TrendingUp, Clock, MessageSquare } from 'lucide-react';

export interface EngagementTimelineData {
  date: string;
  sessions: number;
  messages: number;
  duration: number; // in minutes
  careerCards: number;
  formattedDate?: string;
}

interface EngagementTimelineChartProps {
  data: EngagementTimelineData[];
  title?: string;
  description?: string;
  height?: number;
  showArea?: boolean;
  timeframe?: 'week' | 'month' | 'quarter' | 'year';
  className?: string;
}

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as EngagementTimelineData;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white mb-2">
          {data.formattedDate || label}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Sessions: {data.sessions}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Messages: {data.messages}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Duration: {data.duration}m
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              Career Cards: {data.careerCards}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Calculate engagement trend
const calculateTrend = (data: EngagementTimelineData[]): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
  if (data.length < 2) return { direction: 'stable', percentage: 0 };
  
  const recent = data.slice(-7); // Last 7 data points
  const earlier = data.slice(-14, -7); // Previous 7 data points
  
  if (recent.length === 0 || earlier.length === 0) return { direction: 'stable', percentage: 0 };
  
  const recentAvg = recent.reduce((sum, d) => sum + d.sessions, 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, d) => sum + d.sessions, 0) / earlier.length;
  
  if (earlierAvg === 0) return { direction: 'stable', percentage: 0 };
  
  const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
  const direction = change > 5 ? 'up' : change < -5 ? 'down' : 'stable';
  
  return { direction, percentage: Math.abs(change) };
};

const EngagementTimelineChart = forwardRef<HTMLDivElement, EngagementTimelineChartProps>(({
  data,
  title = "Engagement Timeline",
  description = "Platform activity and engagement over time",
  height = 400,
  showArea = true,
  timeframe = 'month',
  className = ""
}, ref) => {
  // Sort data by date
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Calculate engagement statistics
  const totalSessions = sortedData.reduce((sum, d) => sum + d.sessions, 0);
  const totalMessages = sortedData.reduce((sum, d) => sum + d.messages, 0);
  const totalDuration = sortedData.reduce((sum, d) => sum + d.duration, 0);
  const avgSessionLength = totalSessions > 0 ? (totalDuration / totalSessions) : 0;
  
  const trend = calculateTrend(sortedData);

  // Ensure we have data to display
  if (!sortedData.length) {
    return (
      <Card ref={ref} className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500 dark:text-gray-400">
            No engagement data available
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
          <TrendingUp className="w-5 h-5 text-blue-600" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        {/* Engagement statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Sessions
              </span>
            </div>
            <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
              {totalSessions}
            </div>
          </div>
          
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Messages
              </span>
            </div>
            <div className="text-xl font-bold text-green-900 dark:text-green-100">
              {totalMessages}
            </div>
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Avg Session
              </span>
            </div>
            <div className="text-xl font-bold text-yellow-900 dark:text-yellow-100">
              {avgSessionLength.toFixed(0)}m
            </div>
          </div>
          
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className={`w-4 h-4 ${
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }`} />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Trend
              </span>
            </div>
            <div className={`text-xl font-bold ${
              trend.direction === 'up' ? 'text-green-600' : 
              trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {trend.direction === 'stable' ? 'Stable' : `${trend.percentage.toFixed(0)}%`}
            </div>
          </div>
        </div>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          {showArea ? (
            <AreaChart data={sortedData}>
              <defs>
                <linearGradient id="sessionsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="messagesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
              />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="sessions"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#sessionsGradient)"
                name="Sessions"
              />
              <Area
                type="monotone"
                dataKey="messages"
                stroke="#10B981"
                fillOpacity={1}
                fill="url(#messagesGradient)"
                name="Messages"
              />
            </AreaChart>
          ) : (
            <LineChart data={sortedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280"
                fontSize={12}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  });
                }}
              />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="#3B82F6"
                strokeWidth={3}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                name="Sessions"
              />
              <Line
                type="monotone"
                dataKey="messages"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                name="Messages"
              />
              <Line
                type="monotone"
                dataKey="duration"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                name="Duration (min)"
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
});

EngagementTimelineChart.displayName = 'EngagementTimelineChart';

export default EngagementTimelineChart;
