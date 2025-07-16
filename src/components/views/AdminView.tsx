import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { 
  Users, 
  MessageSquare, 
  TrendingUp, 
  Settings,
  Shield,
  AlertTriangle,
  BarChart3,
  Activity,
  Calendar,
  Download
} from 'lucide-react';
import { cn } from '../../lib/utils';

// Import UI components
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface AdminViewProps {
  className?: string;
}

interface AdminMetrics {
  totalUsers: number;
  activeUsers: number;
  totalConversations: number;
  averageSessionTime: number;
  topPersonaTypes: Array<{ type: string; count: number; percentage: number }>;
  userGrowth: number;
  engagementRate: number;
  reportedIssues: number;
}

interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  registrationDate: Date;
  lastActive: Date;
  conversationCount: number;
  personaType: string;
  status: 'active' | 'inactive' | 'suspended';
}

export const AdminView: React.FC<AdminViewProps> = ({ className }) => {
  const { currentUser } = useAuth();
  const [selectedTab, setSelectedTab] = useState<'overview' | 'users' | 'content' | 'analytics'>('overview');
  const [adminMetrics, setAdminMetrics] = useState<AdminMetrics | null>(null);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data for demonstration
  useEffect(() => {
    const mockMetrics: AdminMetrics = {
      totalUsers: 1247,
      activeUsers: 892,
      totalConversations: 3891,
      averageSessionTime: 8.4,
      topPersonaTypes: [
        { type: 'curious_achiever', count: 498, percentage: 40 },
        { type: 'overwhelmed_explorer', count: 374, percentage: 30 },
        { type: 'skeptical_pragmatist', count: 375, percentage: 30 }
      ],
      userGrowth: 23.5,
      engagementRate: 74.3,
      reportedIssues: 3
    };

    const mockUsers: UserSummary[] = [
      {
        id: '1',
        email: 'alex.chen@example.com',
        displayName: 'Alex Chen',
        registrationDate: new Date(2025, 0, 10),
        lastActive: new Date(2025, 0, 15),
        conversationCount: 12,
        personaType: 'curious_achiever',
        status: 'active'
      },
      {
        id: '2',
        email: 'maya.patel@example.com',
        displayName: 'Maya Patel',
        registrationDate: new Date(2025, 0, 8),
        lastActive: new Date(2025, 0, 14),
        conversationCount: 8,
        personaType: 'overwhelmed_explorer',
        status: 'active'
      },
      {
        id: '3',
        email: 'jordan.kim@example.com',
        displayName: 'Jordan Kim',
        registrationDate: new Date(2025, 0, 5),
        lastActive: new Date(2025, 0, 12),
        conversationCount: 15,
        personaType: 'skeptical_pragmatist',
        status: 'active'
      }
    ];

    setAdminMetrics(mockMetrics);
    setUsers(mockUsers);
  }, []);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPersonaColor = (personaType: string) => {
    switch (personaType) {
      case 'curious_achiever': return 'bg-green-100 text-green-700';
      case 'skeptical_pragmatist': return 'bg-blue-100 text-blue-700';
      case 'overwhelmed_explorer': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700';
      case 'inactive': return 'bg-yellow-100 text-yellow-700';
      case 'suspended': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      {adminMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminMetrics.totalUsers.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+{adminMetrics.userGrowth}% this month</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{adminMetrics.activeUsers.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">{((adminMetrics.activeUsers / adminMetrics.totalUsers) * 100).toFixed(1)}% of total</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Conversations</p>
                <p className="text-2xl font-bold text-gray-900">{adminMetrics.totalConversations.toLocaleString()}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-purple-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">Avg {adminMetrics.averageSessionTime}m session</span>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{adminMetrics.engagementRate}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              {adminMetrics.reportedIssues > 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-500 mr-1" />
                  <span className="text-amber-600">{adminMetrics.reportedIssues} issues</span>
                </>
              ) : (
                <span className="text-green-600">No issues reported</span>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Persona Distribution */}
      {adminMetrics && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Persona Distribution
          </h3>
          <div className="space-y-4">
            {adminMetrics.topPersonaTypes.map((persona) => (
              <div key={persona.type} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={cn("px-3 py-1 rounded-full text-sm font-medium", getPersonaColor(persona.type))}>
                    {persona.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </div>
                  <span className="text-gray-600">{persona.count} users</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${persona.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {persona.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      {/* Search and Actions */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-4"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button size="sm">
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getPersonaColor(user.personaType))}>
                      {user.personaType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.conversationCount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn("px-2 py-1 text-xs font-medium rounded-full", getStatusColor(user.status))}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  return (
    <div className={cn("h-full bg-gray-50 overflow-auto", className)}>
      <div className="p-4 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Shield className="w-6 h-6 mr-2" />
            Admin Dashboard
          </h1>
          <div className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleString()}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'content', label: 'Content', icon: MessageSquare },
              { id: 'analytics', label: 'Analytics', icon: TrendingUp }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={cn(
                  "flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200",
                  selectedTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === 'overview' && renderOverview()}
          {selectedTab === 'users' && renderUsers()}
          {selectedTab === 'content' && (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Content Moderation</h3>
              <p className="text-gray-500">Content moderation tools will be available here.</p>
            </Card>
          )}
          {selectedTab === 'analytics' && (
            <Card className="p-8 text-center">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics</h3>
              <p className="text-gray-500">Detailed analytics and reporting tools will be available here.</p>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}; 