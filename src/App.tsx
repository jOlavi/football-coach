import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeSync />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/join" element={<JoinTeam />} />
          <Route path="/teams/select" element={
            <ProtectedRoute><SelectTeam /></ProtectedRoute>
          } />
          <Route path="/teams/new" element={
            <ProtectedRoute><CreateTeam /></ProtectedRoute>
          } />
          {/* Full-screen match management — no sidebar layout */}
          <Route path="/matches/:id/setup" element={
            <ProtectedRoute><TeamGuard><MatchSetup /></TeamGuard></ProtectedRoute>
          } />
          <Route path="/matches/:id/live" element={
            <ProtectedRoute><TeamGuard><MatchLive /></TeamGuard></ProtectedRoute>
          } />
          <Route path="/matches/:id/break" element={
            <ProtectedRoute><TeamGuard><MatchBreak /></TeamGuard></ProtectedRoute>
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
            <Route path="notes" element={<Notes />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
