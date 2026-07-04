import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTeamStore } from '../store/useTeamStore';
import { useAppStore } from '../store/useAppStore';
import { format } from 'date-fns';

interface Reminder {
  id: string;
  type: 'warning' | 'info' | 'ok';
  title: string;
  detail: string;
  action?: { label: string; path: string };
}

type FilterTab = 'all' | 'warning' | 'info';

export function Reminders() {
  const navigate = useNavigate();
  const players = usePlayerStore((s) => s.players);
  const allMatches = useMatchStore((s) => s.matches);
  const teams = useTeamStore((s) => s.teams);
  const { activeSeason, seasons } = useAppStore();
  const isFirstSeason = seasons[0] === activeSeason;
  const inSeason = (s?: string) => s === activeSeason || (!s && isFirstSeason);
  const matches = allMatches.filter((m) => inSeason(m.season));
  const [filter, setFilter] = useState<FilterTab>('all');

  const activePlayers = players.filter((p) => p.active);
  const upcoming = matches
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const reminders: Reminder[] = [];

  // Matches without lineups
  upcoming.forEach((m) => {
    const minLineup = teams.find((t) => t.id === m.ownTeamId)?.minLineupSize ?? 7;
    if (m.lineup.length < minLineup) {
      const daysUntil = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
      reminders.push({
        id: `lineup-${m.id}`,
        type: daysUntil <= 3 ? 'warning' : 'info',
        title: `Kokoonpano vajaa: vs ${m.opponent}`,
        detail: `${format(new Date(m.date), 'dd.MM.')} · ${m.lineup.length}/${minLineup} pelaajaa · ${daysUntil} pv`,
        action: { label: 'Suunnittele', path: '/planning' },
      });
    }
  });

  // Played matches missing result
  matches
    .filter((m) => !m.result && new Date(m.date).getTime() <= Date.now())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .forEach((m) => {
      const daysAgo = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000);
      reminders.push({
        id: `result-${m.id}`,
        type: daysAgo >= 2 ? 'warning' : 'info',
        title: `Tulos kirjaamatta: vs ${m.opponent}`,
        detail: `Pelattiin ${format(new Date(m.date), 'dd.MM.')}${daysAgo > 0 ? ` · ${daysAgo} pv sitten` : ' · tänään'}`,
        action: { label: 'Kirjaa', path: '/matches' },
      });
    });

  // Matches without availability set
  upcoming.forEach((m) => {
    const daysUntil = Math.ceil((new Date(m.date).getTime() - Date.now()) / 86400000);
    if (daysUntil <= 7 && m.availability.length === 0) {
      reminders.push({
        id: `avail-${m.id}`,
        type: 'info',
        title: `Saatavuus asettamatta: vs ${m.opponent}`,
        detail: `${format(new Date(m.date), 'dd.MM.')} · ${daysUntil} pv päästä`,
        action: { label: 'Aseta', path: '/planning' },
      });
    }
  });

  // Missing parent contacts
  const missingContact = activePlayers.filter((p) => !p.parentContact);
  if (missingContact.length > 0) {
    reminders.push({
      id: 'missing-contact',
      type: 'info',
      title: 'Puuttuvat yhteystiedot',
      detail: missingContact.map((p) => p.name).join(', '),
      action: { label: 'Päivitä', path: '/players' },
    });
  }

  const warnings = reminders.filter((r) => r.type === 'warning');
  const infos = reminders.filter((r) => r.type === 'info');
  const allClear = reminders.length === 0;

  const visible = filter === 'all'
    ? reminders
    : reminders.filter((r) => r.type === filter);

  const BORDER: Record<Reminder['type'], string> = {
    warning: 'border-l-yellow-400',
    info: 'border-l-blue-400',
    ok: 'border-l-green-400',
  };
  const DOT: Record<Reminder['type'], string> = {
    warning: 'bg-yellow-400',
    info: 'bg-blue-400',
    ok: 'bg-green-400',
  };

  return (
    <div className="space-y-4">

      {/* Count pills */}
      {!allClear && (
        <div className="flex gap-2 flex-wrap">
          {warnings.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800">
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0" />
              {warnings.length} kiireellist{warnings.length === 1 ? 'ä' : 'ä'}
            </span>
          )}
          {infos.length > 0 && (
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
              {infos.length} tiedoksi
            </span>
          )}
        </div>
      )}

      {/* Tab filter */}
      {!allClear && (
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 p-1 rounded-lg">
          {(['all', 'warning', 'info'] as FilterTab[]).map((tab) => {
            const labels: Record<FilterTab, string> = { all: 'Kaikki', warning: 'Kiireelliset', info: 'Tiedoksi' };
            const active = filter === tab;
            return (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  active
                    ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 shadow-sm'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300'
                }`}
              >
                {labels[tab]}
              </button>
            );
          })}
        </div>
      )}

      {/* List */}
      {allClear ? (
        <div className="flex items-center gap-3 p-4 rounded-xl border bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CheckCircle size={18} className="text-green-500 shrink-0" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm">Kaikki kunnossa!</p>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Ei avoimia muistutuksia.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          {visible.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">Ei muistutuksia tässä kategoriassa.</p>
          ) : (
            visible.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-center gap-2.5 border-l-[3px] px-3 py-2.5 ${BORDER[r.type]} ${
                  i < visible.length - 1 ? 'border-b border-gray-100 dark:border-slate-700' : ''
                } hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${DOT[r.type]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">{r.title}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5 truncate font-mono">{r.detail}</p>
                </div>
                {r.action && (
                  <button
                    onClick={() => navigate(r.action!.path)}
                    className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 dark:text-brand-400 whitespace-nowrap shrink-0 hover:underline"
                  >
                    {r.action.label}
                    <ChevronRight size={12} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
