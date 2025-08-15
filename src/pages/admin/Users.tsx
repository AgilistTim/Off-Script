import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  X, 
  Check, 
  Shield, 
  User,
  Mail,
  Calendar,
  RefreshCw,
  Key,
  MessageCircle,
  Activity,
  Download,
  FileText,
  Headphones
} from 'lucide-react';
import { getAllUsers, updateUserRole, deleteUser, sendPasswordResetEmail } from '../../services/userService';
import { User as UserType } from '../../models/User';
import { toast, Toaster } from 'react-hot-toast';
import { elevenLabsAdminService } from '../../services/elevenLabsAdminService';

// Enhanced user type with conversation data
interface EnhancedUser extends UserType {
  conversationCount: number;
  messageCount: number;
  lastActivity: Date | null;
  careerCardsGenerated: number;
  engagementScore?: number;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<EnhancedUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showUserDetailModal, setShowUserDetailModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<EnhancedUser | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [exportingUser, setExportingUser] = useState<string | null>(null);

  // Roles for filtering
  const roles = ['user', 'admin', 'parent'];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await getAllUsers();
        
        // Enhance users with conversation data
        const enhancedUsers: EnhancedUser[] = await Promise.all(
          fetchedUsers.map(async (user) => {
            try {
              const conversationData = await elevenLabsAdminService.getUserConversationData(user.uid);
              
              // Calculate engagement score based on activity
              const engagementScore = Math.min(100, Math.round(
                (conversationData.conversationCount * 10) + 
                (conversationData.messageCount * 2) + 
                (conversationData.careerCardsGenerated * 15)
              ));

              return {
                ...user,
                conversationCount: conversationData.conversationCount,
                messageCount: conversationData.messageCount,
                lastActivity: conversationData.lastActivity,
                careerCardsGenerated: conversationData.careerCardsGenerated,
                engagementScore
              };
            } catch (convError) {
              console.warn(`Failed to get conversation data for user ${user.uid}:`, convError);
              return {
                ...user,
                conversationCount: 0,
                messageCount: 0,
                lastActivity: null,
                careerCardsGenerated: 0,
                engagementScore: 0
              };
            }
          })
        );

        setUsers(enhancedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Handle opening dropdown with position detection
  const handleOpenDropdown = (userId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    // If already open, close it
    if (roleDropdownOpen === userId) {
      setRoleDropdownOpen(null);
      return;
    }
    
    // Check if button is in the bottom part of the screen
    const buttonRect = event.currentTarget.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const isNearBottom = buttonRect.bottom + 150 > windowHeight; // 150px buffer for dropdown
    
    setDropdownPosition(isNearBottom ? 'top' : 'bottom');
    setRoleDropdownOpen(userId);
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
      (user.email?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    const matchesRole = selectedRole ? user.role === selectedRole : true;
    return matchesSearch && matchesRole;
  });

  // Handle edit user
  const handleEditUser = (user: UserType) => {
    // Convert UserType to EnhancedUser for editing
    const enhancedUser: EnhancedUser = {
      ...user,
      conversationCount: 0,
      messageCount: 0,
      lastActivity: null,
      careerCardsGenerated: 0,
      engagementScore: 0
    };
    setCurrentUser(enhancedUser);
    setIsEditing(true);
    setShowAddModal(true);
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await deleteUser(userId);
        setUsers(users.filter(user => user.uid !== userId));
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Failed to delete user. Please try again.');
      }
    }
  };

  // Handle change user role
  const handleChangeRole = async (userId: string, newRole: 'user' | 'admin' | 'parent') => {
    try {
      await updateUserRole(userId, newRole);
      setUsers(users.map(user => 
        user.uid === userId ? { ...user, role: newRole } : user
      ));
      setRoleDropdownOpen(null); // Close dropdown after successful change
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role. Please try again.');
    }
  };

  // Handle password reset
  const handlePasswordReset = async (userId: string, email: string | null) => {
    if (!email) {
      toast.error('User does not have an email address');
      return;
    }
    
    try {
      setResettingPassword(userId);
      await sendPasswordResetEmail(email);
      toast.success('Password reset email sent successfully');
    } catch (error) {
      console.error('Error sending password reset email:', error);
      toast.error('Failed to send password reset email');
    } finally {
      setResettingPassword(null);
    }
  };

  // Handle view user details
  const handleViewUserDetails = (user: EnhancedUser) => {
    setCurrentUser(user);
    setShowUserDetailModal(true);
  };

  // Handle export user data
  const handleExportUserData = async (userId: string, userName: string) => {
    try {
      setExportingUser(userId);
      const exportData = await elevenLabsAdminService.exportUserConversationData(userId);
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `user-data-${userName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('User data exported successfully');
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error('Failed to export user data');
    } finally {
      setExportingUser(null);
    }
  };

  // Format date
  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // User form component
  const UserForm = () => {
    const [formData, setFormData] = useState<Partial<UserType>>(
      currentUser || {
        displayName: '',
        email: '',
        role: 'user',
        preferences: {
          theme: 'system',
          notifications: true,
          emailUpdates: true
        }
      }
    );
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      
      if (name.includes('.')) {
        const [parent, child] = name.split('.');
        setFormData({
          ...formData,
          [parent]: {
            ...(formData[parent as keyof typeof formData] as Record<string, unknown> || {}),
            [child]: value
          }
        });
      } else {
        setFormData({
          ...formData,
          [name]: value
        });
      }
    };

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      
      try {
        if (isEditing && currentUser) {
          // If editing, update the user including their role
          if (formData.role !== currentUser.role) {
            await updateUserRole(currentUser.uid, formData.role as 'user' | 'admin' | 'parent');
          }
          
          // Update other user data if needed
          // This would require additional service functions to update other user fields
          
          // Update local state
          setUsers(users.map(user => 
            user.uid === currentUser.uid ? { ...user, ...formData } : user
          ));
          
          toast.success('User updated successfully');
        } else {
          // Handle creating new user if needed
          // This would require additional service functions
          toast.error('User creation not implemented');
        }
        
        setShowAddModal(false);
      } catch (error) {
        console.error('Error saving user:', error);
        toast.error('Failed to save user. Please try again.');
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name
          </label>
          <input
            type="text"
            name="displayName"
            value={formData.displayName || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role
          </label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            required
          >
            {roles.map(role => (
              <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Theme Preference
            </label>
            <select
              name="preferences.theme"
              value={formData.preferences?.theme || 'system'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="flex items-center space-x-4 mt-8">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                name="preferences.notifications"
                checked={formData.preferences?.notifications || false}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      notifications: e.target.checked
                    }
                  });
                }}
                className="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Notifications
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="emailUpdates"
                name="preferences.emailUpdates"
                checked={formData.preferences?.emailUpdates || false}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      emailUpdates: e.target.checked
                    }
                  });
                }}
                className="h-4 w-4 text-primary-blue focus:ring-primary-blue border-gray-300 rounded"
              />
              <label htmlFor="emailUpdates" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                Email Updates
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={() => setShowAddModal(false)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600"
            disabled={submitting}
          >
            {submitting ? 'Saving...' : isEditing ? 'Update User' : 'Add User'}
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
      
      {/* Header and controls */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">User Management</h1>
        <button
          onClick={() => {
            setCurrentUser(null);
            setIsEditing(false);
            setShowAddModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-blue text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          <Plus size={18} className="mr-2" />
          Add New User
        </button>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <div className="relative md:w-64">
          <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white appearance-none"
          >
            <option value="">All Roles</option>
            {roles.map(role => (
              <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* User table */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Conversations
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Engagement
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Activity
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          {user.photoURL ? (
                            <img src={user.photoURL} alt={user.displayName || ''} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                              <User size={20} />
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName || 'No Name'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <Mail size={12} className="mr-1" /> {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.role === 'admin' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 flex items-center">
                            <Shield size={12} className="mr-1" /> Admin
                          </span>
                        ) : user.role === 'parent' ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Parent
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            User
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <MessageCircle size={14} className="mr-1" />
                          <span className="font-medium">{user.conversationCount}</span>
                          <span className="mx-1">•</span>
                          <span>{user.messageCount} msgs</span>
                        </div>
                        <div className="flex items-center">
                          <FileText size={14} className="mr-1" />
                          <span>{user.careerCardsGenerated} cards</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Activity size={14} className="mr-1" />
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                (user.engagementScore || 0) >= 75 ? 'bg-green-500' :
                                (user.engagementScore || 0) >= 50 ? 'bg-yellow-500' :
                                (user.engagementScore || 0) >= 25 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(100, user.engagementScore || 0)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs">{user.engagementScore || 0}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar size={14} className="mr-1" />
                        {user.lastActivity ? formatDate(user.lastActivity) : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewUserDetails(user)}
                          className="text-indigo-500 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                          title="View Details"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleExportUserData(user.uid, user.displayName || user.email || 'user')}
                          className="text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          title="Export Data"
                          disabled={exportingUser === user.uid}
                        >
                          {exportingUser === user.uid ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Download size={18} />
                          )}
                        </button>
                        <div className="relative">
                          <button
                            onClick={(e) => handleOpenDropdown(user.uid, e)}
                            className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Change Role"
                          >
                            <Shield size={18} />
                          </button>
                          {roleDropdownOpen === user.uid && (
                            <div 
                              className={`absolute ${dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} right-auto left-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10`}
                            >
                              <div className="py-1">
                                {roles.map(role => (
                                  <button
                                    key={role}
                                    onClick={() => handleChangeRole(user.uid, role as 'user' | 'admin' | 'parent')}
                                    className={`block w-full text-left px-4 py-2 text-sm ${
                                      user.role === role 
                                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' 
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                    disabled={user.role === role}
                                  >
                                    {role.charAt(0).toUpperCase() + role.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => handlePasswordReset(user.uid, user.email)}
                          className="text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title="Reset Password"
                          disabled={resettingPassword === user.uid}
                        >
                          {resettingPassword === user.uid ? (
                            <RefreshCw size={18} className="animate-spin" />
                          ) : (
                            <Key size={18} />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.uid)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                    No users found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                {isEditing ? 'Edit User' : 'Add New User'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <UserForm />
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showUserDetailModal && currentUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                User Details: {currentUser.displayName || currentUser.email}
              </h2>
              <button
                onClick={() => setShowUserDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">User Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                    <div className="flex items-center">
                      <User size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">Name:</span>
                      <span className="ml-2">{currentUser.displayName || 'Not set'}</span>
                    </div>
                    <div className="flex items-center">
                      <Mail size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">Email:</span>
                      <span className="ml-2">{currentUser.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Shield size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">Role:</span>
                      <span className="ml-2 capitalize">{currentUser.role}</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">Joined:</span>
                      <span className="ml-2">{formatDate(currentUser.createdAt)}</span>
                    </div>
                    <div className="flex items-center">
                      <Activity size={16} className="mr-2 text-gray-500" />
                      <span className="font-medium">Last Login:</span>
                      <span className="ml-2">{formatDate(currentUser.lastLogin)}</span>
                    </div>
                  </div>
                </div>

                {/* Engagement Metrics */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-800 dark:text-white">Engagement Metrics</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MessageCircle size={16} className="mr-2 text-blue-500" />
                        <span className="font-medium">Conversations</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">{currentUser.conversationCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText size={16} className="mr-2 text-green-500" />
                        <span className="font-medium">Messages</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">{currentUser.messageCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <FileText size={16} className="mr-2 text-purple-500" />
                        <span className="font-medium">Career Cards</span>
                      </div>
                      <span className="text-2xl font-bold text-purple-600">{currentUser.careerCardsGenerated}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Engagement Score</span>
                        <span className="text-sm text-gray-500">{currentUser.engagementScore || 0}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full transition-all duration-300 ${
                            (currentUser.engagementScore || 0) >= 75 ? 'bg-green-500' :
                            (currentUser.engagementScore || 0) >= 50 ? 'bg-yellow-500' :
                            (currentUser.engagementScore || 0) >= 25 ? 'bg-orange-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(100, currentUser.engagementScore || 0)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex items-center">
                        <Calendar size={16} className="mr-2 text-gray-500" />
                        <span className="font-medium">Last Activity:</span>
                        <span className="ml-2">{currentUser.lastActivity ? formatDate(currentUser.lastActivity) : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => handleExportUserData(currentUser.uid, currentUser.displayName || currentUser.email || 'user')}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  disabled={exportingUser === currentUser.uid}
                >
                  {exportingUser === currentUser.uid ? (
                    <RefreshCw size={16} className="mr-2 animate-spin" />
                  ) : (
                    <Download size={16} className="mr-2" />
                  )}
                  Export Data
                </button>
                <button
                  onClick={() => setShowUserDetailModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers; 