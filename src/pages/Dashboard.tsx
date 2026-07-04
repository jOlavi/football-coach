import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, Trophy, AlertCircle, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTrainingStore } from '../store/useTrainingStore';
import { useTeamStore } from '../store/useTeamStore';
import { useTournamentStore } from '../store/useTournamentStore';
import { useAppStore } from '../store/useAppStore';
import { Card, StatCard } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { CalendarAddModal } from '../components/dashboard/CalendarAddModal';
import { MatchFormModal } from '../components/matches/MatchFormModal';
import { TournamentFormModal } from '../components/matches/TournamentFormModal';
import { TrainingSessionModal } from '../components/dashboard/TrainingSessionModal';
import { getTeamRecord } from '../utils/stats';
import {
  format, isPast, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, addMonths, subMonths, isToday,
} from 'date-fns';
import { fi } from 'date-fns/locale';
import type { Match, Tournament } from '../types';
import type { TrainingSession } from '../types';

const FI_MONTHS = ['Tammikuu','Helmikuu','Maaliskuu','Huhtikuu','Toukokuu','Kesäkuu',
                   'Heinäkuu','Elokuu','Syyskuu','Lokakuu','Marraskuu','Joulukuu'];
const FI_DAYS = ['Ma','Ti','Ke','To','Pe','La','Su'];

const levelColors: Record<string, 'blue' | 'purple' | 'yellow' | 'green'> = {
  league: 'blue', cup: 'purple', tournament: 'yellow', friendly: 'green',
};
const levelLabels: Record<string, string> = {
  league: 'Sarja', cup: 'Cup', tournament: 'Turnaus', friendly: 'Harjoitusottelu',
};

type DayEvent =
  | { kind: 'match'; data: Match }
  | { kind: 'training'; data: TrainingSession }
  | { kind: 'tournament'; data: Tournament };

export function Dashboard() {
  const navigate = useNavigate();
  const players = usePlayerStore((s) => s.players);
  const allMatches = useMatchStore((s) => s.matches);
  const allSessions = useTrainingStore((s) => s.sessions);
  const teams = useTeamStore((s) => s.teams);
  const allTournaments = useTournamentStore((s) => s.tournaments);
  const { activeSeason, seasons } = useAppStore();
  const isFirstSeason = seasons[0] === activeSeason;
  const inSeason = (s?: string) => s === activeSeason || (!s && isFirstSeason);
  const matches = allMatches.filter((m) => inSeason(m.season));
  const tournaments = allTournaments.filter((t) => inSeason(t.season));
  const sessions = allSessions.filter((s) => inSeason(s.season));

  const [calMonth, setCalMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [addModalDay, setAddModalDay] = useState<Date | null>(null);
  const [matchFormDate, setMatchFormDate] = useState<Date | null>(null);
  const [tournamentFormDate, setTournamentFormDate] = useState<Date | null>(null);
  const [viewingSession, setViewingSession] = useState<typeof sessions[number] | null>(null);

  const activePlayers = players.filter((p) => p.active);
  const record = getTeamRecord(matches);

  const upcomingMatches = matches
    .filter((m) => !isPast(new Date(m.date)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const soonMatch = upcomingMatches[0];
  const incompleteLineup = soonMatch && soonMatch.lineup.length < 7;

  const reminders = [
    incompleteLineup && {
      type: 'info' as const,
      text: `Kokoonpano asettamatta: ${soonMatch.opponent} (${format(new Date(soonMatch.date), 'dd.MM.')})`,
      action: () => navigate('/planning'),
    },
  ].filter(Boolean) as { type: 'warning' | 'info'; text: string; action: () => void }[];

  // Calendar helpers
  const monthStart = startOfMonth(calMonth);
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(calMonth) });
  const startPad = (getDay(monthStart) + 6) % 7;

  function eventsOnDay(day: Date): DayEvent[] {
    const matchEvents: DayEvent[] = matches
      .filter((m) => isSameDay(new Date(m.date), day))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((m) => ({ kind: 'match', data: m }));
    const trainingEvents: DayEvent[] = sessions
      .filter((s) => isSameDay(new Date(s.date + 'T12:00:00'), day))
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''))
      .map((s) => ({ kind: 'training', data: s }));
    const tournamentEvents: DayEvent[] = tournaments
      .filter((t) => t.date && isSameDay(new Date(t.date + 'T12:00:00'), day))
      .map((t) => ({ kind: 'tournament', data: t }));
    return [...tournamentEvents, ...matchEvents, ...trainingEvents];
  }

  const upcomingTournaments = tournaments
    .filter((t) => t.date && !isPast(new Date(t.date + 'T23:59:59')))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  // Events shown in the list below the calendar
  const selectedEvents: DayEvent[] = selectedDay
    ? eventsOnDay(selectedDay)
    : [
        ...upcomingMatches.slice(0, 4).map((m): DayEvent => ({ kind: 'match', data: m })),
        ...upcomingTournaments.slice(0, 3).map((t): DayEvent => ({ kind: 'tournament', data: t })),
        ...sessions
          .filter((s) => !isPast(new Date(s.date + 'T23:59:59')))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 2)
          .map((s): DayEvent => ({ kind: 'training', data: s })),
      ].sort((a, b) => {
        const dateA = a.kind === 'match' ? new Date(a.data.date)
          : a.kind === 'tournament' ? new Date((a.data.date ?? '') + 'T12:00:00')
          : new Date(a.data.date);
        const dateB = b.kind === 'match' ? new Date(b.data.date)
          : b.kind === 'tournament' ? new Date((b.data.date ?? '') + 'T12:00:00')
          : new Date(b.data.date);
        return dateA.getTime() - dateB.getTime();
      }).slice(0, 6);

  function matchLabel(m: Match) {
    const team = m.ownTeamId ? teams.find((t) => t.id === m.ownTeamId) : null;
    if (!team) return `vs ${m.opponent}`;
    return m.location === 'home' ? `${team.name} – ${m.opponent}` : `${m.opponent} – ${team.name}`;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row — last on mobile, first on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 order-last md:order-first">
        <StatCard label="Aktiiviset pelaajat" value={activePlayers.length} icon={<Users size={18} />} color="bg-brand-600" />
        <StatCard label="Pelatut ottelut" value={record.played} icon={<Calendar size={18} />} color="bg-blue-500" />
        <StatCard label="Tilanne" value={`${record.wins}V ${record.draws}T ${record.losses}H`} icon={<Trophy size={18} />} color="bg-amber-500" />
        <StatCard label="Maalit" value={`${record.goalsFor} : ${record.goalsAgainst}`} icon={<Trophy size={18} />} color="bg-purple-500" sub="omat : vastustaja" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Calendar card */}
        <div className="lg:col-span-2">
          <Card>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => { setCalMonth((m) => subMonths(m, 1)); setSelectedDay(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">
                {FI_MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
              </h2>
              <button
                onClick={() => { setCalMonth((m) => addMonths(m, 1)); setSelectedDay(null); }}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-gray-100 dark:border-slate-700 mb-0">
              {FI_DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 py-1.5">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 border-l border-t border-gray-100 dark:border-slate-700">
              {Array.from({ length: startPad }).map((_, i) => (
                <div key={`pad-${i}`} className="border-r border-b border-gray-100 dark:border-slate-700" />
              ))}
              {days.map((day) => {
                const events = eventsOnDay(day);
                const hasMatch = events.some((e) => e.kind === 'match');
                const hasTournament = events.some((e) => e.kind === 'tournament');
                const hasTraining = events.some((e) => e.kind === 'training');
                const isSelected = selectedDay !== null && isSameDay(day, selectedDay);
                const today = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`relative flex flex-col items-center justify-center py-1.5 border-r border-b border-gray-100 dark:border-slate-700 transition-colors ${
                      isSelected
                        ? 'bg-brand-600 text-white'
                        : today
                        ? 'bg-brand-50 dark:bg-brand-900/20 font-bold'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    <span className={`text-xs ${
                      isSelected ? 'text-white' :
                      today ? 'text-brand-600 dark:text-brand-400' :
                      'text-gray-700 dark:text-slate-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                    {/* Event dots */}
                    {events.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasMatch && !hasTournament && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-500'}`} />
                        )}
                        {hasTournament && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />
                        )}
                        {hasTraining && (
                          <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-amber-400'}`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend + add button */}
            <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" /> Ottelu
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" /> Turnaus
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Harjoitus
                </span>
              </div>
              <button
                onClick={() => setAddModalDay(selectedDay ?? new Date())}
                className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-2 sm:py-1.5 rounded-lg transition-colors w-full sm:w-auto"
              >
                <Plus size={13} />
                Lisää tapahtuma
              </button>
            </div>

            {/* Event list */}
            <div className="mt-4 border-t border-gray-100 dark:border-slate-700 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0.5 bg-gray-100 dark:bg-slate-700/50 p-0.5 rounded-lg">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      !selectedDay
                        ? 'bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm'
                        : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300'
                    }`}
                  >
                    Tulevat
                  </button>
                  {selectedDay && (
                    <button className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 shadow-sm">
                      {format(selectedDay, 'dd.MM.')}
                    </button>
                  )}
                </div>
                <button onClick={() => navigate('/matches')} className="text-xs text-brand-600 hover:underline flex items-center gap-1">
                  Kaikki ottelut <ChevronRight size={12} />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 py-3 text-center">
                  {selectedDay ? 'Ei tapahtumia' : 'Ei tulevia tapahtumia'}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev) => {
                    if (ev.kind === 'match') {
                      const m = ev.data;
                      return (
                        <div
                          key={`match-${m.id}`}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                          onClick={() => navigate('/planning')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-center w-10 shrink-0">
                              <p className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-none">{format(new Date(m.date), 'dd')}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">{format(new Date(m.date), 'MMM', { locale: fi })}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate">{matchLabel(m)}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                {m.location === 'home' ? '🏠' : '✈️'} {format(new Date(m.date), 'HH:mm')}
                                {m.venue ? ` · ${m.venue}` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge label={levelLabels[m.level] ?? m.level} color={levelColors[m.level]} />
                        </div>
                      );
                    } else if (ev.kind === 'tournament') {
                      const t = ev.data;
                      const tDate = t.date ? new Date(t.date + 'T12:00:00') : null;
                      return (
                        <div
                          key={`tournament-${t.id}`}
                          className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/10 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/20 transition-colors border border-purple-100 dark:border-purple-900/30"
                          onClick={() => navigate('/matches', { state: { tab: 'tournaments', tournamentId: t.id } })}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-center w-10 shrink-0">
                              {tDate ? (
                                <>
                                  <p className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-none">{format(tDate, 'dd')}</p>
                                  <p className="text-xs text-gray-400 dark:text-slate-500">{format(tDate, 'MMM', { locale: fi })}</p>
                                </>
                              ) : (
                                <Trophy size={20} className="text-purple-500 mx-auto" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate">{t.name}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                🏆 {(() => {
                                  const ownTeam = t.ownTeamId ? teams.find((team) => team.id === t.ownTeamId) : null;
                                  return ownTeam ? ownTeam.name : (t.venue ? t.venue : 'Turnaus');
                                })()}
                                {t.venue && t.ownTeamId ? ` · ${t.venue}` : ''}
                                {t.matches?.length ? ` · ${t.matches.length} ottelua` : ''}
                              </p>
                            </div>
                          </div>
                          <Badge label="Turnaus" color="purple" />
                        </div>
                      );
                    } else {
                      const s = ev.data;
                      return (
                        <div
                          key={`training-${s.id}`}
                          className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-colors border border-amber-100 dark:border-amber-900/30"
                          onClick={() => s.exercises.length > 0 ? setViewingSession(s) : navigate(`/training/${s.id}/edit`)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="text-center w-10 shrink-0">
                              <p className="text-lg font-bold text-gray-900 dark:text-slate-100 leading-none">{format(new Date(s.date), 'dd')}</p>
                              <p className="text-xs text-gray-400 dark:text-slate-500">{format(new Date(s.date), 'MMM', { locale: fi })}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-gray-900 dark:text-slate-100 text-sm truncate">{s.title}</p>
                              <p className="text-xs text-gray-500 dark:text-slate-400">
                                🏋️ {s.startTime ? `${s.startTime} · ` : ''}{s.duration} min
                                {s.exercises.length > 0
                                  ? ` · ${s.exercises.length} harjoitetta`
                                  : ' · Ei suunnitelmaa'}
                              </p>
                            </div>
                          </div>
                          <Badge label="Harjoitus" color="yellow" />
                        </div>
                      );
                    }
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
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
                        ? 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-blue-50 text-blue-800 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300'
                    }`}
                  >
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    {r.text}
                  </button>
                ))}
              </div>
            )}
          </Card>

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
            <button onClick={() => navigate('/players')} className="mt-3 text-xs text-brand-600 hover:underline">
              Hallinnoi pelaajia →
            </button>
          </Card>
        </div>
      </div>

      {addModalDay && (
        <CalendarAddModal
          date={addModalDay}
          onClose={() => setAddModalDay(null)}
          onAddMatch={(d) => { setAddModalDay(null); setMatchFormDate(d); }}
          onAddTournament={(d) => { setAddModalDay(null); setTournamentFormDate(d); }}
        />
      )}
      {viewingSession && (
        <TrainingSessionModal session={viewingSession} onClose={() => setViewingSession(null)} />
      )}
      {matchFormDate && (
        <MatchFormModal
          initialDate={matchFormDate}
          onClose={() => setMatchFormDate(null)}
        />
      )}
      {tournamentFormDate && (
        <TournamentFormModal
          initialDate={tournamentFormDate}
          onClose={() => setTournamentFormDate(null)}
        />
      )}
    </div>
  );
}
