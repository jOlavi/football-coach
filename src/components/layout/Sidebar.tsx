import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  MessageSquare, ClipboardList, Dumbbell, Bell, Settings as SettingsIcon,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Plus, LogOut,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';
import { signOut } from '../../lib/auth';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Etusivu' },
  { to: '/players', icon: Users, label: 'Pelaajat' },
  { to: '/matches', icon: Calendar, label: 'Ottelut' },
  { to: '/planning', icon: ClipboardList, label: 'Ottelusuunnittelu' },
  { to: '/statistics', icon: BarChart2, label: 'Tilastot' },
  { to: '/training', icon: Dumbbell, label: 'Harjoitukset' },
  { to: '/communication', icon: MessageSquare, label: 'Viestintä' },
  { to: '/reminders', icon: Bell, label: 'Muistutukset' },
  { to: '/settings', icon: SettingsIcon, label: 'Asetukset' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const teams = useAuthStore((s) => s.teams);
  const { activeTeamId, setActiveTeamId } = useAppStore();
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <aside className={`shrink-0 bg-gray-900 dark:bg-slate-950 flex flex-col transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
      {/* Team switcher */}
      <div className="border-b border-gray-700 dark:border-slate-800 px-2 py-2">
        {!collapsed ? (
          <div className="relative">
            <button
              onClick={() => setTeamMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <span className="text-xl">⚽</span>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  {activeTeam?.name ?? 'Valitse joukkue'}
                </p>
                <p className="text-gray-400 text-xs">{activeTeam?.sport ?? ''}</p>
              </div>
              <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${teamMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {teamMenuOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-gray-800 rounded-lg shadow-xl z-50 py-1">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTeamId(t.id); setTeamMenuOpen(false); navigate('/'); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      t.id === activeTeamId
                        ? 'text-white bg-gray-700'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
                <div className="border-t border-gray-700 mt-1 pt-1">
                  <button
                    onClick={() => { setTeamMenuOpen(false); navigate('/teams/new'); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={13} />
                    Luo uusi joukkue
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-2">
            <span className="text-xl">⚽</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <div key={to} className="relative group">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-brand-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {!collapsed && label}
            </NavLink>
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 z-50">
                {label}
              </span>
            )}
          </div>
        ))}
      </nav>

      {/* Footer: user info + collapse */}
      <div className="border-t border-gray-700 dark:border-slate-800 px-2 py-2 flex flex-col gap-1">
        {!collapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1.5">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {(user.displayName || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-xs text-gray-400 truncate flex-1">{user.displayName || user.email}</span>
            <button
              onClick={handleSignOut}
              className="text-gray-500 hover:text-white transition-colors"
              title="Kirjaudu ulos"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
        <div className={`flex ${collapsed ? 'justify-center' : 'items-center justify-between px-2'}`}>
          {!collapsed && <p className="text-gray-500 text-xs">v1.0.0</p>}
          <div className="relative group">
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
