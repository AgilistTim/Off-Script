import React, { useState } from 'react';
import { 
  BarChart2, 
  TrendingUp, 
  Users, 
  Video, 
  Calendar, 
  Clock 
} from 'lucide-react';

const AdminAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');

  // Sample data for charts
  const viewsData = {
    week: [120, 145, 132, 165, 189, 176, 203],
    month: [850, 920, 880, 1050, 1100, 980, 1150, 1220, 1180, 1300, 1250, 1400, 1350, 1420, 1380, 1450, 1500, 1550, 1600, 1650, 1700, 1750, 1800, 1850, 1900, 1950, 2000, 2050, 2100, 2150],
    quarter: [3500, 4200, 4800, 5100, 5600, 6200, 6800, 7500, 8200, 8800, 9500, 10200],
    year: [12000, 15000, 18000, 22000, 25000, 28000, 32000, 35000, 39000, 42000, 45000, 48000]
  };

  const usersData = {
    week: [5, 8, 6, 9, 12, 10, 14],
    month: [25, 28, 26, 32, 35, 30, 38, 40, 36, 42, 45, 48, 50, 52, 55, 58, 60, 62, 65, 68, 70, 72, 75, 78, 80, 82, 85, 88, 90, 92],
    quarter: [120, 145, 160, 175, 190, 210, 230, 250, 270, 290, 310, 330],
    year: [400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400, 1500]
  };

  const engagementData = {
    week: [65, 72, 68, 75, 82, 78, 85],
    month: [70, 72, 71, 73, 74, 72, 75, 76, 74, 77, 78, 76, 79, 80, 78, 81, 82, 80, 83, 84, 82, 85, 86, 84, 87, 88, 86, 89, 90, 88],
    quarter: [72, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84],
    year: [68, 70, 72, 74, 76, 78, 80, 82, 84, 86, 88, 90]
  };

  const renderChart = (data: number[], title: string, color: string) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{title}</h3>
          <span className={`text-${color}-500 flex items-center text-sm font-medium`}>
            <TrendingUp size={16} className="mr-1" />
            {Math.round((data[data.length - 1] - data[0]) / data[0] * 100)}%
          </span>
        </div>
        <div className="h-40 flex items-end space-x-1">
          {data.map((value, index) => {
            const height = range ? ((value - min) / range) * 100 : 50;
            return (
              <div 
                key={index} 
                className="flex-1 flex flex-col items-center"
              >
                <div 
                  className={`w-full bg-${color}-500 rounded-t`} 
                  style={{ height: `${Math.max(5, height)}%` }}
                ></div>
                {index % Math.max(1, Math.floor(data.length / 6)) === 0 && (
                  <span className="text-xs text-gray-500 mt-1">{index + 1}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Analytics Dashboard</h1>
        <div>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last 3 Months</option>
            <option value="year">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Total Views</span>
            <div className="bg-blue-500 p-2 rounded-lg text-white">
              <Video size={20} />
            </div>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">
              {viewsData[timeRange][viewsData[timeRange].length - 1].toLocaleString()}
            </span>
            <span className="text-sm text-green-500 flex items-center">
              ↑ 12.5%
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs. previous period</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Active Users</span>
            <div className="bg-green-500 p-2 rounded-lg text-white">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">
              {usersData[timeRange][usersData[timeRange].length - 1].toLocaleString()}
            </span>
            <span className="text-sm text-green-500 flex items-center">
              ↑ 8.3%
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs. previous period</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Engagement Rate</span>
            <div className="bg-purple-500 p-2 rounded-lg text-white">
              <BarChart2 size={20} />
            </div>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">
              {engagementData[timeRange][engagementData[timeRange].length - 1]}%
            </span>
            <span className="text-sm text-green-500 flex items-center">
              ↑ 3.2%
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs. previous period</span>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 dark:text-gray-400 font-medium">Avg. Session</span>
            <div className="bg-orange-500 p-2 rounded-lg text-white">
              <Clock size={20} />
            </div>
          </div>
          <div className="flex items-end space-x-2">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">
              8:24
            </span>
            <span className="text-sm text-green-500 flex items-center">
              ↑ 5.7%
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400">vs. previous period</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart(viewsData[timeRange], 'Video Views', 'blue')}
        {renderChart(usersData[timeRange], 'User Growth', 'green')}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderChart(engagementData[timeRange], 'Engagement Rate (%)', 'purple')}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Popular Categories</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Technology & Digital</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">35%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '35%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Creative & Media</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">28%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '28%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Business & Entrepreneurship</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">20%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '20%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Healthcare & Wellbeing</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">12%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '12%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skilled Trades</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">5%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '5%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics; 