import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { AuthProvider } from './components/auth/AuthProvider';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAuthStore } from './store/useAuthStore';
import { useSettingsStore } from './store/useSettingsStore';

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
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { CreateTeam } from './pages/CreateTeam';
import { JoinTeam } from './pages/JoinTeam';

function ThemeSync() {
  const theme = useSettingsStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

function TeamGuard({ children }: { children: React.ReactNode }) {
  const teams = useAuthStore((s) => s.teams);
  const authLoading = useAuthStore((s) => s.authLoading);
  if (authLoading) return null;
  if (teams.length === 0) return <Navigate to="/teams/new" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeSync />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinTeam />} />
          <Route path="/teams/new" element={
            <ProtectedRoute><CreateTeam /></ProtectedRoute>
          } />
          <Route path="/" element={
            <ProtectedRoute>
              <TeamGuard>
                <Layout />
              </TeamGuard>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="players" element={<Players />} />
            <Route path="matches" element={<Matches />} />
            <Route path="planning" element={<MatchPlanning />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="training" element={<Training />} />
            <Route path="training/new" element={<TrainingBuilder />} />
            <Route path="training/:id/edit" element={<TrainingBuilder />} />
            <Route path="training/new-drill" element={<NewDrillPage />} />
            <Route path="training/drills/:id/edit" element={<NewDrillPage />} />
            <Route path="communication" element={<Communication />} />
            <Route path="reminders" element={<Reminders />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
