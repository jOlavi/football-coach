import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSettingsStore } from '../../store/useSettingsStore';

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
  const teamName = useSettingsStore((s) => s.settings.teamName);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{title}</h1>
            <p className="text-xs text-gray-400 dark:text-slate-500">{teamName}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
            <span>🟢</span>
            <span>Kausi 2026</span>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
