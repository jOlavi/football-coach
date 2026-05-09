import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  MessageSquare, ClipboardList, Dumbbell, Bell, Settings as SettingsIcon,
} from 'lucide-react';

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
  return (
    <aside className="w-56 shrink-0 bg-gray-900 dark:bg-slate-950 min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-gray-700 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⚽</span>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Jalkapallovalmennin</p>
            <p className="text-gray-400 text-xs">Joukkueen hallinta</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-gray-700 dark:border-slate-800">
        <p className="text-gray-500 text-xs">v1.0.0</p>
      </div>
    </aside>
  );
}
