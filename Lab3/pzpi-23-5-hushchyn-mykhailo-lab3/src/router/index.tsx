import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

import AuthLayout from '../layouts/AuthLayout';
import UserLayout from '../layouts/UserLayout';
import AdminLayout from '../layouts/AdminLayout';

import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import StationsListPage from '../pages/StationsListPage';
import StationDetailsPage from '../pages/StationDetailsPage';
import AlarmsPage from '../pages/AlarmsPage';
import UsersPage from '../pages/UsersPage';
import StationStatisticsPage from '../pages/StationStatisticsPage';
import BackupsPage from '../pages/BackupsPage';
import UserStationsPage from '../pages/UserStationsPage';
import UserStationDetailsPage from '../pages/UserStationDetailsPage';
import UserAlarmsPage from '../pages/UserAlarmsPage';
import ProfileSettingsPage from '../pages/ProfileSettingsPage';
import AdminStatisticsPage from '../pages/AdminStatisticsPage';


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const RoleBasedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: string[] }) => {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <>{children}</>;
};

const RootRedirect = () => {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (['admin', 'manager'].includes(user?.role || '')) return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

const UnauthorizedPage = () => (
  <div className="flex items-center justify-center h-screen bg-slate-50">
    <div className="text-center"><h1 className="text-4xl font-bold text-slate-800 mb-2">403</h1><p className="text-slate-600">Немає доступу.</p></div>
  </div>
);

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  
  // --- USER ROUTES ---
  {
    path: '/dashboard',
    element: <ProtectedRoute><UserLayout /></ProtectedRoute>,
    children: [
      { path: '', element: <UserStationsPage /> },
      { path: 'stations/:id', element: <UserStationDetailsPage /> }, // <- ДОДАНО МАРШРУТ
      { path: 'alerts', element: <UserAlarmsPage /> },
      { path: 'profile', element: <ProfileSettingsPage /> },
    ],
  },

  // --- ADMIN ROUTES ---
  {
    path: '/admin',
    element: <ProtectedRoute><RoleBasedRoute allowedRoles={['admin', 'manager']}><AdminLayout /></RoleBasedRoute></ProtectedRoute>,
    children: [
      { path: '', element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <StationsListPage /> },
      { path: 'stations/:id', element: <StationDetailsPage /> }, // <- ДОДАНО МАРШРУТ
      { path: 'stations/:id/statistics', element: <StationStatisticsPage /> },
      { path: 'statistics', element: <AdminStatisticsPage /> },
      { path: 'alerts', element: <AlarmsPage />},
      { path: 'users', element: <UsersPage/> },
      { path: 'backups', element: <BackupsPage /> },
      { path: 'profile', element: <ProfileSettingsPage /> },
    ],
  },

  { path: '/unauthorized', element: <UnauthorizedPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
  
]);