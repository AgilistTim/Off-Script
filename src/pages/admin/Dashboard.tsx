import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Video, 
  Eye, 
  Calendar, 
  TrendingUp, 
  BarChart2 
} from 'lucide-react';
import { getUserCount } from '../../services/userService';
import { getVideoCount, getVideoViewCount } from '../../services/videoService';

interface Stat {
  title: string;
  value: string | number;
  change: number;
  icon: React.ReactNode;
  color: string;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        
        // Fetch actual data from Firestore
        const userCount = await getUserCount();
        const videoCount = await getVideoCount();
        const viewCount = await getVideoViewCount();
        
        // Set stats with real data
        setStats([
          {
            title: 'Total Users',
            value: userCount,
            change: 12.5,
            icon: <Users size={24} />,
            color: 'bg-blue-500'
          },
          {
            title: 'Total Videos',
            value: videoCount,
            change: 8.2,
            icon: <Video size={24} />,
            color: 'bg-green-500'
          },
          {
            title: 'Total Views',
            value: viewCount,
            change: 15.3,
            icon: <Eye size={24} />,
            color: 'bg-purple-500'
          },
          {
            title: 'Active This Week',
            value: Math.round(userCount * 0.65),
            change: -3.8,
            icon: <Calendar size={24} />,
            color: 'bg-orange-500'
          }
        ]);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setLoading(false);
      }
    };
    
    fetchStats();
  }, []);

  const recentActivities = [
    {
      user: 'John Smith',
      action: 'watched',
      target: 'How I Became a Software Developer Without a Degree',
      time: '2 hours ago'
    },
    {
      user: 'Emma Johnson',
      action: 'completed',
      target: 'My Path to Becoming a Renewable Energy Technician',
      time: '3 hours ago'
    },
    {
      user: 'Michael Brown',
      action: 'joined',
      target: 'the platform',
      time: '5 hours ago'
    },
    {
      user: 'Sarah Davis',
      action: 'updated profile',
      target: 'preferences',
      time: '6 hours ago'
    },
    {
      user: 'David Wilson',
      action: 'responded to',
      target: 'reflection prompt on Healthcare video',
      time: '8 hours ago'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Admin Dashboard</h1>
        <div className="flex space-x-2">
          <select 
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md px-3 py-2 text-sm"
            defaultValue="month"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
          <button className="bg-primary-blue text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600 transition-colors">
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

        {/* Popular Videos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Popular Videos</h2>
            <button className="text-blue-500 text-sm hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-3 py-2 border-b dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                <img src="https://img.youtube.com/vi/rqX8PFcOpxA/mqdefault.jpg" alt="Video thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white">How I Became a Software Developer Without a Degree</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center"><Eye size={12} className="mr-1" /> 45K views</span>
                  <span className="mx-2">•</span>
                  <span>Technology</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 py-2 border-b dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                <img src="https://img.youtube.com/vi/j3TeLsaKzAM/mqdefault.jpg" alt="Video thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Starting My Own Digital Marketing Business</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center"><Eye size={12} className="mr-1" /> 52K views</span>
                  <span className="mx-2">•</span>
                  <span>Creative</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 py-2 border-b dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                <img src="https://img.youtube.com/vi/KAU7ZzgDVK4/mqdefault.jpg" alt="Video thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white">How I Broke Into the Finance Industry</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center"><Eye size={12} className="mr-1" /> 43K views</span>
                  <span className="mx-2">•</span>
                  <span>Business</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3 py-2 border-b dark:border-gray-700">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                <img src="https://img.youtube.com/vi/xC-c7E5PK0Y/mqdefault.jpg" alt="Video thumbnail" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white">From Retail to Healthcare: My Career Change Story</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center"><Eye size={12} className="mr-1" /> 37K views</span>
                  <span className="mx-2">•</span>
                  <span>Healthcare</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Chart Placeholder */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white">User Engagement</h2>
          <div className="flex space-x-2">
            <button className="text-sm px-3 py-1 rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">Daily</button>
            <button className="text-sm px-3 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Weekly</button>
            <button className="text-sm px-3 py-1 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">Monthly</button>
          </div>
        </div>
        <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <BarChart2 size={48} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400">Analytics charts will be implemented here</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 