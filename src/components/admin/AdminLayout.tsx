import React, { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutGrid, 
  MessageSquare, 
  Users, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  Briefcase,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';

const AdminLayout: React.FC = () => {
  const { currentUser, userData, logout } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    console.log('AdminLayout - Current User:', currentUser);
    console.log('AdminLayout - User Data:', userData);
    
    if (currentUser && userData) {
      console.log('AdminLayout - Is Admin:', userData.role === 'admin');
    }
  }, [currentUser, userData]);

  // Check if user is admin
  if (!currentUser || !userData || userData.role !== 'admin') {
    console.log('AdminLayout - Access Denied - Redirecting to login');
    return <Navigate to="/login" />;
  }

  const sidebarItems = [
  { name: 'Dashboard', path: '/admin', icon: <LayoutGrid size={20} /> },
  { name: 'Users', path: '/admin/users', icon: <Users size={20} /> },
  { name: 'Conversations', path: '/admin/conversations', icon: <MessageSquare size={20} /> },
  { name: 'Career Cards', path: '/admin/career-cards', icon: <Briefcase size={20} /> },
  { name: 'Prompts', path: '/admin/prompts', icon: <FileText size={20} /> },
  { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={20} /> },
  { name: 'Settings', path: '/admin/settings', icon: <Settings size={20} /> },
];

  const isActive = (path: string) => {
    return location.pathname === path || 
           (path !== '/admin' && location.pathname.startsWith(path));
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Mobile sidebar toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-30">
        <button 
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          className="p-2 rounded-md bg-white dark:bg-gray-800 shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileSidebarOpen}
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <motion.nav 
        className={`fixed lg:static inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg z-30 transform ${
          isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } transition-transform duration-300 ease-in-out`}
        initial={{ width: isSidebarOpen ? 256 : 80 }}
        animate={{ width: isSidebarOpen ? 256 : 80 }}
        transition={{ duration: 0.3 }}
        aria-label="Admin navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
            {isSidebarOpen && (
              <span className="text-xl font-semibold text-gray-800 dark:text-white">
                Off-Script Admin
              </span>
            )}
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden lg:block p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isSidebarOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {/* Back to main site link */}
              <li className="mb-4 pb-4 border-b dark:border-gray-700">
                <Link
                  to="/"
                  className="flex items-center p-3 rounded-lg transition-colors text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700"
                >
                  <span className="flex-shrink-0"><Home size={20} /></span>
                  {isSidebarOpen && <span className="ml-3">Back to Site</span>}
                </Link>
              </li>
              
              {/* Admin navigation items */}
              {sidebarItems.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center p-3 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-primary-blue bg-opacity-10 text-primary-blue dark:text-primary-blue'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    onClick={(e) => {
                      if (location.pathname === item.path) {
                        e.preventDefault();
                      }
                      setIsMobileSidebarOpen(false);
                    }}
                    aria-label={`Navigate to ${item.name}`}
                    aria-current={isActive(item.path) ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {isSidebarOpen && <span className="ml-3">{item.name}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0 overflow-hidden">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600 dark:text-gray-300">
                    {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'A'}
                  </div>
                )}
              </div>
              {isSidebarOpen && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {userData.displayName || currentUser.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Admin</p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className={`flex items-center p-2 w-full rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                !isSidebarOpen && 'justify-center'
              }`}
            >
              <LogOut size={20} />
              {isSidebarOpen && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header bar */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="flex items-center justify-between p-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-white">Admin Panel</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {sidebarItems.find(item => isActive(item.path))?.name || 'Dashboard'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/" 
                className="flex items-center px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-sm"
              >
                <Home size={16} className="mr-1.5" />
                Back to Site
              </Link>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 