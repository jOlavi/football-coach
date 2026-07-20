import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';
import { useAppStore } from './store/useAppStore';

import { Dashboard } from './pages/Dashboard';
import { Players } from './pages/Players';
import { Matches } from './pages/Matches';
import { MatchPlanning } from './pages/MatchPlanning';
import { Statistics } from './pages/Statistics';
import { Training } from './pages/Training';
import { TrainingBuilder } from './pages/TrainingBuilder';
import { NewDrillPage } from './pages/NewDrillPage';
import { Communication } from './pages/Communication';
import { Reminders } from './pages/Reminders';
import { Notes } from './pages/Notes';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { CreateTeam } from './pages/CreateTeam';
import { SelectTeam } from './pages/SelectTeam';
import { JoinTeam } from './pages/JoinTeam';
import { MatchSetup } from './pages/MatchSetup';
import { MatchLive } from './pages/MatchLive';
import { MatchBreak } from './pages/MatchBreak';
import { ErrorPage } from './pages/ErrorPage';

function ThemeSync() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);
  return null;
}

function TeamGuard({ children }: { children: React.ReactNode }) {
  const teams = useAuthStore((s) => s.teams);
  const authLoading = useAuthStore((s) => s.authLoading);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  if (authLoading) return null;
  const activeExists = teams.some((t) => t.id === activeTeamId);
  if (!activeExists) return <Navigate to="/teams/select" replace />;
  return <>{children}</>;
}

const router = createBrowserRouter([
  { path: '/login', element: <Login />, errorElement: <ErrorPage /> },
  { path: '/join', element: <JoinTeam />, errorElement: <ErrorPage /> },
  {
    path: '/teams/select',
    element: <ProtectedRoute><SelectTeam /></ProtectedRoute>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/teams/new',
    element: <ProtectedRoute><CreateTeam /></ProtectedRoute>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/matches/:id/setup',
    element: <ProtectedRoute><TeamGuard><MatchSetup /></TeamGuard></ProtectedRoute>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/matches/:id/live',
    element: <ProtectedRoute><TeamGuard><MatchLive /></TeamGuard></ProtectedRoute>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/matches/:id/break',
    element: <ProtectedRoute><TeamGuard><MatchBreak /></TeamGuard></ProtectedRoute>,
    errorElement: <ErrorPage />,
  },
  {
    path: '/',
    errorElement: <ErrorPage />,
    element: (
      <ProtectedRoute>
        <TeamGuard>
          <Layout />
        </TeamGuard>
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'players', element: <Players /> },
      { path: 'matches', element: <Matches /> },
      { path: 'planning', element: <MatchPlanning /> },
      { path: 'statistics', element: <Statistics /> },
      { path: 'training', element: <Training /> },
      { path: 'training/new', element: <TrainingBuilder /> },
      { path: 'training/:id/edit', element: <TrainingBuilder /> },
      { path: 'training/new-drill', element: <NewDrillPage /> },
      { path: 'training/drills/:id/edit', element: <NewDrillPage /> },
      { path: 'communication', element: <Communication /> },
      { path: 'reminders', element: <Reminders /> },
      { path: 'notes', element: <Notes /> },
      { path: 'settings', element: <Settings /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <ThemeSync />
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
