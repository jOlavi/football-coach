import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, Check, Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { DataLoader } from '../data/DataLoader';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { signOut } from '../../lib/auth';

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
  '/notes': 'Muistiinpanot',
  '/communication': 'Viestintä',
  '/reminders': 'Muistutukset',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname]
    ?? (/^\/training\/drills\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitetta'
      : /^\/training\/.+\/edit$/.test(pathname) ? 'Muokkaa harjoitussuunnitelmaa'
      : 'Pitchside');

  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { settings, updateSettings } = useSettingsStore();
  const { activeSeason } = useAppStore();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [coachName, setCoachName] = useState(settings.coachName);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    setCoachName(settings.coachName);
    setEditing(false);
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  function handleSaveProfile() {
    updateSettings({ coachName: coachName.trim() });
    setEditing(false);
  }

  async function handleSignOut() {
    setDropdownOpen(false);
    await signOut();
    navigate('/login');
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-slate-900">
      <DataLoader />

      {/* Full-width header */}
      <header className="shrink-0 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 px-3 sm:px-6 flex items-center justify-between z-20" style={{ height: 56 }}>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setMobileSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5">
            <img src="/logo.svg" alt="Pitchside" className="w-8 h-8 rounded-xl" />
            <span className="font-bold text-gray-900 dark:text-slate-100 text-base tracking-tight">Pitchside</span>
          </div>
          <div className="hidden sm:block w-px h-5 bg-gray-200 dark:bg-slate-700" />
          <h1 className="hidden sm:block text-sm font-medium text-gray-500 dark:text-slate-400">{title}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Active season badge */}
          <span className="hidden sm:inline text-xs font-semibold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 px-2.5 py-1 rounded-full">
            Kausi {activeSeason}
          </span>

          {user && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-brand-400 transition-all"
                title={user.displayName || user.email || ''}
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-bold">
                    {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-[min(288px,calc(100vw-1rem))] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 z-50 overflow-hidden">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold shrink-0">
                        {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                        {user.displayName || 'Käyttäjä'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Coach name */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 space-y-1.5">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-gray-400 dark:text-slate-500">
                      <User size={12} />
                      Valmentajan nimi
                    </p>
                    {editing ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={coachName}
                          onChange={(e) => setCoachName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setEditing(false); }}
                          className="flex-1 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                        <button
                          onClick={handleSaveProfile}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-800 dark:text-slate-200">
                          {settings.coachName || <span className="text-gray-400 dark:text-slate-500 italic">Ei asetettu</span>}
                        </p>
                        <button
                          onClick={() => { setCoachName(settings.coachName); setEditing(true); }}
                          className="text-xs text-brand-600 dark:text-brand-400 hover:underline"
                        >
                          Muokkaa
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sign out */}
                  <div className="px-2 py-1.5">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={15} />
                      Kirjaudu ulos
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Sidebar + content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay backdrop */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}
        <Sidebar mobileOpen={mobileSidebarOpen} onMobileClose={() => setMobileSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 flex flex-col">
          <div className="pt-4 sm:pt-6 pb-4 sm:pb-6 flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
