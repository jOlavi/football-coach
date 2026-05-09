import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Trophy, AlertCircle, ChevronRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { getTeamRecord } from '../utils/stats';
import { format, isPast } from 'date-fns';

export function Dashboard() {
  const navigate = useNavigate();
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);

  const activePlayers = players.filter((p) => p.active);

  const record = getTeamRecord(matches);

  const upcomingMatches = matches
    .filter((m) => !isPast(new Date(m.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const soonMatch = upcomingMatches[0];
  const incompleteLineup = soonMatch && soonMatch.lineup.length < 7;

  const reminders = [
    incompleteLineup && {
      type: 'info' as const,
      text: `Kokoonpano asettamatta: ${soonMatch.opponent} (${format(new Date(soonMatch.date), 'dd.MM.')})`,
      action: () => navigate('/planning'),
    },
  ].filter(Boolean) as { type: 'warning' | 'info'; text: string; action: () => void }[];

  const levelColors: Record<string, 'blue' | 'purple' | 'yellow' | 'green'> = {
    league: 'blue', cup: 'purple', tournament: 'yellow', friendly: 'green',
  };
  const levelLabels: Record<string, string> = {
    league: 'Sarja', cup: 'Cup', tournament: 'Turnaus', friendly: 'Harjoitusottelu',
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Aktiiviset pelaajat"
          value={activePlayers.length}
          icon={<Users size={18} />}
          color="bg-brand-600"
        />
        <StatCard
          label="Pelatut ottelut"
          value={record.played}
          icon={<Calendar size={18} />}
          color="bg-blue-500"
        />
        <StatCard
          label="Tilanne"
          value={`${record.wins}V ${record.draws}T ${record.losses}H`}
          icon={<Trophy size={18} />}
          color="bg-amber-500"
        />
        <StatCard
          label="Maalit"
          value={`${record.goalsFor} : ${record.goalsAgainst}`}
          icon={<Trophy size={18} />}
          color="bg-purple-500"
          sub="omat : vastustaja"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming matches */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Tulevat ottelut</h2>
              <button
                onClick={() => navigate('/matches')}
                className="text-sm text-brand-600 hover:underline flex items-center gap-1"
              >
                Kaikki ottelut <ChevronRight size={14} />
              </button>
            </div>
            {upcomingMatches.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">Ei tulevia otteluita</p>
            ) : (
              <div className="space-y-3">
                {upcomingMatches.map((m) => {
                  const missingPlayers = m.availability.filter((a) => a.status === 'unavailable').length;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      onClick={() => navigate('/planning')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-center min-w-[48px]">
                          <p className="text-xs text-gray-500 dark:text-slate-400">{format(new Date(m.date), 'EEE')}</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-slate-100">{format(new Date(m.date), 'dd')}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">{format(new Date(m.date), 'MMM')}</p>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-slate-100">vs {m.opponent}</p>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            {m.location === 'home' ? '🏠 Koti' : '✈️ Vieras'} · {format(new Date(m.date), 'HH:mm')}
                            {m.venue ? ` · ${m.venue}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {missingPlayers > 0 && (
                          <Badge label={`${missingPlayers} pois`} color="red" />
                        )}
                        <Badge label={levelLabels[m.level] ?? m.level} color={levelColors[m.level]} />
                        <Badge label={`${m.lineup.length} valittu`} color={m.lineup.length >= 7 ? 'green' : 'yellow'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Reminders */}
        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Muistutukset</h2>
            {reminders.length === 0 ? (
              <div className="flex flex-col items-center py-4 text-center">
                <span className="text-3xl mb-2">✅</span>
                <p className="text-sm text-gray-400 dark:text-slate-500">Kaikki kunnossa!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reminders.map((r, i) => (
                  <button
                    key={i}
                    onClick={r.action}
                    className={`w-full flex items-start gap-2 p-3 rounded-lg text-left text-sm transition-colors ${
                      r.type === 'warning'
                        ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 dark:hover:bg-yellow-900/30'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30'
                    }`}
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {r.text}
                  </button>
                ))}
              </div>
            )}
          </Card>

          {/* Quick squad overview */}
          <Card>
            <h2 className="font-semibold text-gray-900 dark:text-slate-100 mb-3">Joukkue</h2>
            <div className="space-y-1.5">
              {[
                { key: 'goalkeeper', label: 'Maalivahdit' },
                { key: 'defender', label: 'Puolustajat' },
                { key: 'midfielder', label: 'Keskikenttäpelaajat' },
                { key: 'forward', label: 'Hyökkääjät' },
              ].map(({ key, label }) => {
                const count = activePlayers.filter((p) => p.position === key).length;
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-slate-300">{label}</span>
                    <span className="font-semibold text-gray-900 dark:text-slate-100">{count}</span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => navigate('/players')}
              className="mt-3 text-xs text-brand-600 hover:underline"
            >
              Hallinnoi pelaajia →
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
