import { Outlet, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { DataLoader } from '../data/DataLoader';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Etusivu',
  '/players': 'Pelaajahallinta',
  '/matches': 'Otteluhallinta',
  '/planning': 'Ottelusuunnittelu',
  '/statistics': 'Tilastot',
  '/training': 'Harjoitussuunnitelma',
  '/training/new': 'Uusi harjoitussuunnitelma',
  '/training/new-drill': 'Uusi harjoite',
  '/training/edit': 'Muokkaa harjoitussuunnitelmaa',
  '/communication': 'Viestintä',
  '/reminders': 'Muistutukset',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname]
    ?? (/^\/training\/drills\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitetta'
      : /^\/training\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitussuunnitelmaa'
      : 'Jalkapallovalmennin');

  const theme = useSettingsStore((s) => s.settings.theme);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const teams = useAuthStore((s) => s.teams);
  const activeTeamId = useAppStore((s) => s.activeTeamId);
  const teamName = teams.find((t) => t.id === activeTeamId)?.name ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <DataLoader />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500">{teamName}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
              <span>🟢</span>
              <span>Kausi 2026</span>
            </div>
            <button
              onClick={() => updateSettings({ theme: theme === 'dark' ? 'light' : 'dark' })}
              className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Vaihda vaaleatilaan' : 'Vaihda tummatilaan'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="pt-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
