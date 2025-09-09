/**
 * Career Interest Distribution Pie Chart
 * 
 * Displays user's career interest areas as an interactive pie chart
 * with OffScript brand colors and export capabilities.
 * 
 * Features:
 * - Responsive design with proper sizing
 * - Brand color palette integration
 * - Interactive tooltips and labels
 * - Export-ready for PDF inclusion
 */

import React, { forwardRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';

// OffScript brand colors for chart segments
const BRAND_COLORS = [
  '#f0ff8c', // Yellow
  '#fdc0a8', // Peach
  '#81f08c', // Green
  '#cfceff', // Lavender
  '#d8fdf0', // Mint
  '#4f46e5', // Indigo (fallback)
  '#7c3aed', // Violet (fallback)
  '#dc2626'  // Red (fallback)
];

export interface CareerInterestData {
  name: string;
  value: number;
  percentage: number;
  description?: string;
}

interface CareerInterestPieChartProps {
  data: CareerInterestData[];
  title?: string;
  description?: string;
  width?: number;
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  className?: string;
}

// Custom tooltip component
const CustomTooltip: React.FC<any> = ({ 
  active, 
  payload, 
  label 
}) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CareerInterestData;
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-gray-900 dark:text-white">
          {data.name}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Discussions: {data.value}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Percentage: {data.percentage.toFixed(1)}%
        </p>
        {data.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {data.description}
          </p>
        )}
      </div>
    );
  }
  return null;
};

// Custom label function for pie segments
const renderCustomLabel = (entry: any) => {
  if (entry.percent < 5) return ''; // Don't show labels for small segments
  const percentage = entry.percent;
  return `${entry.name} (${percentage.toFixed(0)}%)`;
};

const CareerInterestPieChart = forwardRef<HTMLDivElement, CareerInterestPieChartProps>(({
  data,
  title = "Career Interest Distribution",
  description = "Breakdown of career areas explored in conversations",
  width,
  height = 400,
  showLegend = true,
  showLabels = true,
  className = ""
}, ref) => {
  // Sort data by value for consistent display
  const sortedData = [...data].sort((a, b) => b.value - a.value);

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
            No career interest data available
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
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-green-400"></div>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={sortedData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={showLabels ? renderCustomLabel : false}
              outerRadius={Math.min(height * 0.35, 120)}
              fill="#8884d8"
              dataKey="value"
              strokeWidth={2}
              stroke="#ffffff"
            >
              {sortedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={BRAND_COLORS[index % BRAND_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontSize: '14px'
                }}
                iconType="circle"
              />
            )}
          </PieChart>
        </ResponsiveContainer>

        {/* Summary statistics */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {sortedData.length}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Interest Areas
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {sortedData.reduce((sum, item) => sum + item.value, 0)}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Total Discussions
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {sortedData[0]?.name || 'N/A'}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Top Interest
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {sortedData[0]?.percentage.toFixed(0) || '0'}%
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              Primary Focus
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CareerInterestPieChart.displayName = 'CareerInterestPieChart';

export default CareerInterestPieChart;
