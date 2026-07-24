import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart2,
  MessageSquare, ClipboardList, Dumbbell, Bell, Settings as SettingsIcon,
  PanelLeftClose, PanelLeftOpen, ChevronDown, Plus, NotebookPen, Trophy, BookOpen,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppStore } from '../../store/useAppStore';

type NavItem = { to: string; icon: React.ElementType; label: string; exactTab?: string };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Joukkue',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Etusivu' },
      { to: '/players', icon: Users, label: 'Pelaajat' },
      { to: '/statistics', icon: BarChart2, label: 'Tilastot' },
    ],
  },
  {
    label: 'Pelit',
    items: [
      { to: '/matches', icon: Calendar, label: 'Ottelut' },
      { to: '/matches?tab=tournaments', icon: Trophy, label: 'Turnaukset', exactTab: 'tournaments' },
      { to: '/planning', icon: ClipboardList, label: 'Ottelusuunnittelu' },
    ],
  },
  {
    label: 'Valmistautuminen',
    items: [
      { to: '/training', icon: Dumbbell, label: 'Harjoitukset' },
      { to: '/training?view=sessions', icon: ClipboardList, label: 'Suunnitelmat', exactTab: 'sessions' },
      { to: '/training?view=library', icon: BookOpen, label: 'Harjoitekirjasto', exactTab: 'library' },
    ],
  },
  {
    label: 'Muut',
    items: [
      { to: '/communication', icon: MessageSquare, label: 'Viestintä' },
      { to: '/notes', icon: NotebookPen, label: 'Muistiinpanot' },
      { to: '/reminders', icon: Bell, label: 'Muistutukset' },
      { to: '/settings', icon: SettingsIcon, label: 'Asetukset' },
    ],
  },
];

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);

  function toggleGroup(label: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label); else next.add(label);
      return next;
    });
  }
  const teamMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!teamMenuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (teamMenuRef.current && !teamMenuRef.current.contains(e.target as Node)) {
        setTeamMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [teamMenuOpen]);

  const teams = useAuthStore((s) => s.teams);
  const { activeTeamId, setActiveTeamId } = useAppStore();
  const activeTeam = teams.find((t) => t.id === activeTeamId);

  const sportLabel: Record<string, string> = { football: 'Jalkapallo', floorball: 'Salibandy', basketball: 'Koripallo', icehockey: 'Jääkiekko' };

  function NavItemLink({ item }: { item: NavItem }) {
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const currentTab = searchParams.get('tab');
    const currentView = searchParams.get('view');
    const basePath = item.to.split('?')[0];
    const isActive = item.exactTab !== undefined
      ? loc.pathname === basePath && (currentTab === item.exactTab || currentView === item.exactTab)
      : item.to === '/'
        ? loc.pathname === '/'
        : loc.pathname.startsWith(basePath) && !item.to.includes('?') && currentTab === null && currentView === null;

    return (
      <div className="relative group">
        <NavLink
          to={item.to}
          onClick={onMobileClose}
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors ${
            collapsed ? 'justify-center' : ''
          } ${
            isActive
              ? 'bg-brand-600 text-white'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <item.icon size={16} />
          {!collapsed && item.label}
        </NavLink>
        {collapsed && (
          <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg bg-gray-800 border border-gray-700 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity delay-200 group-hover:opacity-100 z-50 shadow-lg">
            {item.label}
          </span>
        )}
      </div>
    );
  }

  return (
    <aside className={`shrink-0 bg-gray-900 dark:bg-slate-950 flex flex-col transition-all duration-200
      ${mobileOpen ? 'fixed inset-y-0 left-0 z-40 flex' : 'hidden md:flex'}
      ${collapsed ? 'w-14' : 'w-56'}`}>

      {/* Team switcher */}
      <div className="border-b border-gray-700 dark:border-slate-800 px-2 py-2">
        {!collapsed ? (
          <div className="relative" ref={teamMenuRef}>
            <button
              onClick={() => setTeamMenuOpen((v) => !v)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <div className="w-6 h-6 rounded-md bg-gray-700 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold leading-none">
                  {(activeTeam?.name ?? 'J').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate leading-tight">
                  {activeTeam?.name ?? 'Valitse joukkue'}
                </p>
                <p className="text-gray-400 text-xs">{sportLabel[activeTeam?.sport ?? ''] ?? activeTeam?.sport ?? ''}</p>
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
          <div className="relative group flex justify-center py-1" ref={teamMenuRef}>
            <button
              onClick={() => setTeamMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-md bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
            >
              <span className="text-white text-xs font-bold leading-none">
                {(activeTeam?.name ?? 'J').charAt(0).toUpperCase()}
              </span>
            </button>
            <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 z-50">
              {activeTeam?.name ?? 'Valitse joukkue'}
            </span>
            {teamMenuOpen && (
              <div className="absolute left-full ml-2 top-0 bg-gray-800 rounded-lg shadow-xl z-50 py-1 min-w-40">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setActiveTeamId(t.id); setTeamMenuOpen(false); navigate('/'); }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                      t.id === activeTeamId ? 'text-white bg-gray-700' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 overflow-y-auto md:overflow-visible">
        {navGroups.map((group, gi) => {
          const isGroupCollapsed = collapsedGroups.has(group.label);
          return (
            <div key={group.label} className={gi > 0 ? 'mt-3' : ''}>
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 mb-1 group/header"
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 dark:text-slate-600 group-hover/header:text-gray-400 transition-colors">
                    {group.label}
                  </span>
                  <ChevronDown
                    size={11}
                    className={`text-gray-600 dark:text-slate-700 group-hover/header:text-gray-400 transition-all ${isGroupCollapsed ? '-rotate-90' : ''}`}
                  />
                </button>
              )}
              {collapsed && gi > 0 && (
                <div className="mx-3 mb-2 border-t border-gray-700 dark:border-slate-800" />
              )}
              {!isGroupCollapsed && group.items.map((item) => (
                <NavItemLink key={item.label} item={item} />
              ))}
            </div>
          );
        })}
      </nav>

      {/* Footer: version + collapse */}
      <div className="border-t border-gray-700 dark:border-slate-800 px-2 py-2 flex flex-col gap-1">
        <div className={`flex ${collapsed ? 'justify-center' : 'items-center justify-between px-2'}`}>
          {!collapsed && <p className="text-gray-600 text-xs">v1.0.0</p>}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title={collapsed ? 'Avaa sivupalkki' : 'Sulje sivupalkki'}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
