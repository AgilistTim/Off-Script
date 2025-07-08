import React, { useState, useEffect, useRef } from 'react';
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
  Key
} from 'lucide-react';
import { getAllUsers, updateUserRole, deleteUser, sendPasswordResetEmail } from '../../services/userService';
import { User as UserType } from '../../models/User';
import { toast, Toaster } from 'react-hot-toast';

// Custom hook to determine if element is near bottom of viewport
const useIsNearBottom = (ref: React.RefObject<HTMLElement>, offset = 200) => {
  const [isNearBottom, setIsNearBottom] = useState(false);

  useEffect(() => {
    const checkPosition = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const bottomPosition = rect.bottom;
      const windowHeight = window.innerHeight;
      
      setIsNearBottom(bottomPosition + offset > windowHeight);
    };

    checkPosition();
    window.addEventListener('scroll', checkPosition);
    window.addEventListener('resize', checkPosition);
    
    return () => {
      window.removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
    };
  }, [ref, offset]);

  return isNearBottom;
};

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [resettingPassword, setResettingPassword] = useState<string | null>(null);

  // Roles for filtering
  const roles = ['user', 'admin', 'parent'];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const fetchedUsers = await getAllUsers();
        setUsers(fetchedUsers);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching users:', error);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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
    setCurrentUser(user);
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
          
          alert('User updated successfully');
        } else {
          // Handle creating new user if needed
          // This would require additional service functions
          alert('User creation not implemented');
        }
        
        setShowAddModal(false);
      } catch (error) {
        console.error('Error saving user:', error);
        alert('Failed to save user. Please try again.');
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

  // Create refs for dropdown buttons
  const dropdownRefs = useRef<{ [key: string]: React.RefObject<HTMLButtonElement> }>({});

  // Get or create a ref for a specific user
  const getDropdownRef = (userId: string) => {
    if (!dropdownRefs.current[userId]) {
      dropdownRefs.current[userId] = React.createRef<HTMLButtonElement>();
    }
    return dropdownRefs.current[userId];
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" />
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
                  Joined
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Login
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const dropdownRef = getDropdownRef(user.uid);
                  const isNearBottom = useIsNearBottom(dropdownRef, 250);
                  
                  return (
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
                        <div className="flex items-center">
                          <Calendar size={14} className="mr-1" />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(user.lastLogin)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <div className="relative">
                            <button
                              ref={dropdownRef}
                              onClick={() => setRoleDropdownOpen(roleDropdownOpen === user.uid ? null : user.uid)}
                              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Change Role"
                            >
                              <Shield size={18} />
                            </button>
                            {roleDropdownOpen === user.uid && (
                              <div 
                                className={`absolute ${isNearBottom ? 'bottom-full mb-2' : 'top-full mt-2'} right-auto left-0 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10`}
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
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
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
    </div>
  );
};

export default AdminUsers; 