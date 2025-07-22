import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { useAuth } from './context/AuthContext';

// Layout components
const MainLayout = lazy(() => import('./components/layouts/MainLayout'));
const AuthLayout = lazy(() => import('./components/layouts/AuthLayout'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));

// Core pages for simplified architecture
const EngagementPage = lazy(() => import('./pages/Engagement'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Auth pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

// Admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminVideos = lazy(() => import('./pages/admin/Videos'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));

// Legacy pages (will be deprecated)
const NotFound = lazy(() => import('./pages/NotFound'));
const StyleGuide = lazy(() => import('./components/StyleGuide'));
const Profile = lazy(() => import('./pages/Profile'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

// Admin route wrapper
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, userData, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!currentUser || !userData || userData.role !== 'admin') {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
};

// Public route wrapper (redirects if already authenticated)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (currentUser) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Create and export the router with simplified 3-page architecture
export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <MainLayout />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <EngagementPage /> // Main landing page with voice/chat + insights
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        )
      },
      // Legacy route redirects
      {
        path: 'chat',
        element: <Navigate to="/" replace />
      },
      {
        path: 'explore',
        element: <Navigate to="/" replace />
      },
      {
        path: 'videos/:videoId',
        element: <Navigate to="/" replace />
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        )
      },
      // Development/debug pages
      {
        path: 'style-guide',
        element: <StyleGuide />
      },
      {
        path: '*',
        element: <NotFound />
      }
    ]
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AdminRoute>
          <AdminLayout />
        </AdminRoute>
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: <AdminDashboard />
      },
      {
        path: 'videos',
        element: <AdminVideos />
      },
      {
        path: 'users',
        element: <AdminUsers />
      },
      {
        path: 'analytics',
        element: <AdminAnalytics />
      },
      {
        path: 'settings',
        element: <AdminSettings />
      }
    ]
  },
  {
    path: '/auth',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AuthLayout />
      </Suspense>
    ),
    children: [
      {
        path: 'login',
        element: (
          <PublicRoute>
            <Login />
          </PublicRoute>
        )
      },
      {
        path: 'register',
        element: (
          <PublicRoute>
            <Register />
          </PublicRoute>
        )
      }
    ]
  },
  // Legacy auth route redirects
  {
    path: '/login',
    element: <Navigate to="/auth/login" replace />
  },
  {
    path: '/register',
    element: <Navigate to="/auth/register" replace />
  }
]);
