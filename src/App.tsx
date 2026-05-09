import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
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
import { usePlayerStore } from './store/usePlayerStore';
import { useMatchStore } from './store/useMatchStore';
import { SEED_PLAYERS, SEED_MATCHES } from './utils/seedData';

function SeedLoader() {
  useEffect(() => {
    const { players, addPlayer } = usePlayerStore.getState();
    if (players.length === 0) SEED_PLAYERS.forEach(addPlayer);

    const { matches, addMatch } = useMatchStore.getState();
    if (matches.length === 0) SEED_MATCHES.forEach(addMatch);
  }, []);

  return null;
}

function ThemeSync() {
  const theme = useSettingsStore((s) => s.settings.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <SeedLoader />
      <ThemeSync />
      <Routes>
        <Route path="/" element={<Layout />}>
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
    </BrowserRouter>
  );
}
