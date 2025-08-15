import React, { useState, useEffect } from 'react';
import { 
  Users, 
  MessageCircle, 
  Activity, 
  Calendar, 
  TrendingUp, 
  BarChart2,
  FileText,
  Zap
} from 'lucide-react';
import { getUserCount } from '../../services/userService';
import { elevenLabsAdminService } from '../../services/elevenLabsAdminService';

interface Stat {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

interface RecentActivity {
  user: string;
  userEmail?: string;
  action: string;
  target: string;
  time: string;
  conversationId?: string;
}

interface PopularCareer {
  title: string;
  count: number;
  category: string;
  trend: 'up' | 'down' | 'stable';
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [popularCareers, setPopularCareers] = useState<PopularCareer[]>([]);
  const [chartData, setChartData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('month');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Get days based on selected time range
        const daysPeriod = {
          today: 1,
          week: 7,
          month: 30,
          year: 365
        }[timeRange];
        
        // Fetch analytics data
        const [userCount, analytics] = await Promise.all([
          getUserCount(),
          elevenLabsAdminService.getConversationAnalytics(daysPeriod)
        ]);
        
        // Set stats with conversation analytics
        setStats([
          {
            title: 'Total Users',
            value: userCount,
            change: analytics.totalConversations > 0 ? Math.round((userCount / analytics.totalConversations) * 100) : 0,
            icon: <Users size={24} />,
            color: 'bg-blue-500'
          },
          {
            title: 'Conversations',
            value: analytics.totalConversations,
            change: analytics.dailyConversationCounts.length > 1 ? 
              Math.round(((analytics.dailyConversationCounts[analytics.dailyConversationCounts.length - 1]?.count || 0) - 
                         (analytics.dailyConversationCounts[analytics.dailyConversationCounts.length - 2]?.count || 0)) / 
                         Math.max(1, analytics.dailyConversationCounts[analytics.dailyConversationCounts.length - 2]?.count || 1) * 100) : 0,
            icon: <MessageCircle size={24} />,
            color: 'bg-green-500'
          },
          {
            title: 'Career Cards',
            value: analytics.careerCardMetrics.totalGenerated,
            change: analytics.careerCardMetrics.averagePerUser > 0 ? 
              Math.round(analytics.careerCardMetrics.averagePerUser * 10) : 0,
            icon: <FileText size={24} />,
            color: 'bg-purple-500'
          },
          {
            title: 'Active Users',
            value: analytics.activeUsers,
            change: userCount > 0 ? Math.round((analytics.activeUsers / userCount) * 100) : 0,
            icon: <Activity size={24} />,
            color: 'bg-orange-500'
          }
        ]);
        
        // Generate recent activities from most active users
        const activities: RecentActivity[] = analytics.mostActiveUsers.slice(0, 5).map((user, index) => ({
          user: user.userName || 'Unknown User',
          userEmail: user.userEmail,
          action: user.conversationCount > 5 ? 'had active conversation' : 'started conversation',
          target: `${user.conversationCount} conversations, ${user.messageCount} messages`,
          time: formatTimeAgo(user.lastActivity),
          conversationId: user.userId
        }));
        
        setRecentActivities(activities);
        
        // Mock popular careers data (would be replaced with real career card analytics)
        setPopularCareers([
          { title: 'Software Developer', count: 45, category: 'Technology', trend: 'up' },
          { title: 'Digital Marketing Specialist', count: 38, category: 'Marketing', trend: 'up' },
          { title: 'Data Analyst', count: 32, category: 'Technology', trend: 'stable' },
          { title: 'Healthcare Assistant', count: 28, category: 'Healthcare', trend: 'up' },
          { title: 'Project Manager', count: 24, category: 'Business', trend: 'down' }
        ]);
        
        setChartData(analytics.dailyConversationCounts);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, [timeRange]);

  // Helper function to format time ago
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Handle export of dashboard data
  const handleExportData = () => {
    const exportData = {
      timeRange,
      stats: stats.map(stat => ({
        title: stat.title,
        value: stat.value,
        change: stat.change
      })),
      recentActivities,
      popularCareers,
      chartData,
      exportedAt: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-dashboard-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'today' | 'week' | 'month' | 'year')}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button 
            onClick={() => handleExportData()}
            className="bg-primary-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors"
          >
            Export
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm animate-pulse">
              <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{stat.title}</span>
                <div className={`${stat.color} p-2 rounded-lg text-white`}>
                  {stat.icon}
                </div>
              </div>
              <div className="flex items-end space-x-2">
                <span className="text-3xl font-bold text-gray-800 dark:text-white">{stat.value}</span>
                <span className={`text-sm ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'} flex items-center`}>
                  {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">vs. last month</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h2>
            <button className="text-blue-500 text-sm hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3 py-2 border-b dark:border-gray-700 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                  {activity.user.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-white">
                    <span className="font-medium">{activity.user}</span> {activity.action}{' '}
                    <span className="font-medium">{activity.target}</span>
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Careers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Popular Careers</h2>
            <button className="text-blue-500 text-sm hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {popularCareers.map((career, index) => (
              <div key={index} className="flex items-center space-x-3 py-2 border-b dark:border-gray-700 last:border-0">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{career.title}</p>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center">
                      <TrendingUp size={12} className="mr-1" /> 
                      {career.count} cards generated
                    </span>
                    <span className="mx-2">•</span>
                    <span>{career.category}</span>
                    <span className="mx-2">•</span>
                    <span className={`flex items-center ${
                      career.trend === 'up' ? 'text-green-500' : 
                      career.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {career.trend === 'up' ? '↗' : career.trend === 'down' ? '↘' : '→'}
                      <span className="ml-1 capitalize">{career.trend}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Conversation Trends Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Conversation Trends</h2>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Daily Conversations</span>
            </div>
            <button className="text-blue-500 text-sm hover:underline">View Details</button>
          </div>
        </div>
        {chartData && chartData.length > 0 ? (
          <div className="h-64 relative">
            <div className="absolute inset-0 flex items-end justify-between px-4 pb-8">
              {chartData.slice(-7).map((dataPoint: any, index: number) => {
                const maxCount = Math.max(...chartData.map((d: any) => d.count));
                const height = maxCount > 0 ? (dataPoint.count / maxCount) * 200 : 10;
                
                return (
                  <div key={index} className="flex flex-col items-center space-y-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {dataPoint.count}
                    </div>
                    <div 
                      className="w-8 bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-md transition-all duration-300 hover:from-blue-600 hover:to-blue-400"
                      style={{ height: `${height}px` }}
                    ></div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 transform -rotate-45 origin-left">
                      {new Date(dataPoint.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-100 dark:bg-gray-700 rounded-b-lg"></div>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-center">
              <BarChart2 size={48} className="mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">
                {loading ? 'Loading conversation data...' : 'No conversation data available'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard; 