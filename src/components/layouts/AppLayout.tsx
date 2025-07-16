import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { MessageCircle, History, Settings, User } from 'lucide-react';
import { cn } from '../../lib/utils';

// Import our new views
import { ConversationView } from '../views/ConversationView';
import { DashboardView } from '../views/DashboardView';
import { AdminView } from '../views/AdminView';

interface AppLayoutProps {
  children?: React.ReactNode;
}

type ViewType = 'conversation' | 'dashboard' | 'admin';

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { currentUser, userData, logout } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('conversation');
  
  // Check if user is admin
  const isAdmin = currentUser?.email === 'admin@offscript.com' || 
                  userData?.role === 'admin';

  const views = [
    {
      id: 'conversation' as ViewType,
      label: 'Chat',
      icon: MessageCircle,
      component: ConversationView
    },
    {
      id: 'dashboard' as ViewType,
      label: 'History',
      icon: History,
      component: DashboardView
    }
  ];

  // Add admin view if user is admin
  if (isAdmin) {
    views.push({
      id: 'admin' as ViewType,
      label: 'Admin',
      icon: Settings,
      component: AdminView
    });
  }

  const CurrentViewComponent = views.find(v => v.id === currentView)?.component || ConversationView;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-purple-50 overflow-hidden">
      {/* Mobile-Only Design - No desktop fallbacks */}
      <div className="flex-1 flex flex-col">
        {/* Main Content Area - Full screen for conversation, with nav for others */}
        <AnimatePresence mode="wait">
          {currentView === 'conversation' ? (
            <motion.div
              key="conversation-fullscreen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="flex-1 relative"
            >
              <CurrentViewComponent />
              
              {/* Floating Navigation for Conversation View */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                <motion.div
                  initial={{ y: 100, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.3 }}
                  className="bg-white/90 backdrop-blur-lg rounded-full px-3 py-2 shadow-xl border border-white/20"
                >
                  <div className="flex items-center space-x-1">
                    {views.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => setCurrentView(view.id)}
                        className={cn(
                          "p-3 rounded-full transition-all duration-200",
                          currentView === view.id
                            ? "bg-blue-500 text-white shadow-lg"
                            : "text-gray-600 hover:bg-white/80 hover:text-blue-600"
                        )}
                      >
                        <view.icon className="w-5 h-5" />
                      </button>
                    ))}
                    
                    {/* User Menu */}
                    <div className="ml-2 border-l border-gray-200 pl-2">
                      <button
                        onClick={logout}
                        className="p-3 rounded-full text-gray-600 hover:bg-white/80 hover:text-red-600 transition-all duration-200"
                      >
                        <User className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`${currentView}-with-nav`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="flex-1 flex flex-col"
            >
              {/* Top Navigation for Dashboard/Admin Views */}
              <div className="bg-white shadow-sm border-b border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {views.find(v => v.id === currentView)?.label}
                    </h1>
                  </div>
                  
                  {/* Navigation Tabs */}
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    {views.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => setCurrentView(view.id)}
                        className={cn(
                          "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
                          currentView === view.id
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-600 hover:text-gray-900"
                        )}
                      >
                        <view.icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{view.label}</span>
                      </button>
                    ))}
                  </div>
                  
                  {/* User Menu */}
                  <button
                    onClick={logout}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-red-600 transition-all duration-200"
                  >
                    <User className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* View Content */}
              <div className="flex-1 overflow-hidden">
                <CurrentViewComponent />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}; 