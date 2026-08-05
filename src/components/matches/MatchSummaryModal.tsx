import { X, MapPin, Clock, Shield } from 'lucide-react';
import { usePlayerStore } from '../../store/usePlayerStore';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import type { Match, Tournament, TournamentMatch } from '../../types';

const POS_LABEL: Record<string, string> = {
  goalkeeper: 'MV',
  defender: 'PU',
  midfielder: 'KK',
  forward: 'HY',
};

const POS_COLOR: Record<string, string> = {
  goalkeeper: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  defender: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  midfielder: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  forward: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function fmtSeconds(s: number) {
  const m = Math.floor(s / 60);
  return `${m} min`;
}

function fmtDate(iso?: string) {
  if (!iso) return null;
  try { return format(parseISO(iso), 'd. MMMM yyyy', { locale: fi }); }
  catch { return null; }
}

interface RegularProps {
  type: 'match';
  match: Match;
  onClose: () => void;
}

interface TournamentProps {
  type: 'tournament';
  tournamentMatch: TournamentMatch;
  tournament: Tournament;
  onClose: () => void;
}

type Props = RegularProps | TournamentProps;

export function MatchSummaryModal(props: Props) {
  const { onClose } = props;
  const allPlayers = usePlayerStore((s) => s.players);

  // Normalise to a common shape
  const isRegular = props.type === 'match';
  const opponent = isRegular ? props.match.opponent : props.tournamentMatch.opponent;
  const result = isRegular ? props.match.result : props.tournamentMatch.result;
  const location = isRegular ? props.match.location : (props.tournamentMatch.location ?? 'home');
  const venue = isRegular ? props.match.venue : (props.tournament.venue ?? '');
  const dateStr = isRegular ? props.match.date : props.tournament.date;
  const timeStr = isRegular ? undefined : props.tournamentMatch.time;
  const fieldStr = isRegular ? undefined : props.tournamentMatch.field;
  const tournamentName = isRegular ? undefined : props.tournament.name;
  const lineupIds: string[] = isRegular ? props.match.lineup : (props.tournament.lineup ?? []);
  const playerMinutes: Record<string, number> | undefined = isRegular ? props.match.playerMinutes : undefined;
  const scorers = isRegular ? (props.match.result?.scorers ?? []) : [];

  const gf = result?.goalsFor ?? null;
  const ga = result?.goalsAgainst ?? null;
  const homeScore = result ? (location === 'home' ? result.goalsFor : result.goalsAgainst) : null;
  const awayScore = result ? (location === 'home' ? result.goalsAgainst : result.goalsFor) : null;

  const resultLabel = gf != null && ga != null
    ? gf > ga ? 'Voitto' : gf < ga ? 'Tappio' : 'Tasapeli'
    : null;
  const resultColor = gf != null && ga != null
    ? gf > ga ? 'text-green-600 dark:text-green-400' : gf < ga ? 'text-red-500 dark:text-red-400' : 'text-yellow-500'
    : '';

  const lineupPlayers = lineupIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter(Boolean) as typeof allPlayers;

  const goalkeepers = lineupPlayers.filter((p) => p.position === 'goalkeeper');

  // Sort lineup: goalkeeper first, then by position
  const posOrder: Record<string, number> = { goalkeeper: 0, defender: 1, midfielder: 2, forward: 3 };
  const sortedLineup = [...lineupPlayers].sort((a, b) => (posOrder[a.position] ?? 9) - (posOrder[b.position] ?? 9));

  // Player minutes sorted descending
  const minuteEntries = playerMinutes
    ? sortedLineup
        .filter((p) => playerMinutes[p.id] != null)
        .sort((a, b) => (playerMinutes[b.id] ?? 0) - (playerMinutes[a.id] ?? 0))
    : [];
  const maxSeconds = minuteEntries.length > 0 ? (playerMinutes![minuteEntries[0].id] ?? 1) : 1;

  const scorerRows = scorers
    .map((s) => ({ player: allPlayers.find((p) => p.id === s.playerId), count: s.count }))
    .filter((r) => r.player)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="min-w-0">
            <p className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">
              {tournamentName ?? (location === 'home' ? 'Kotipeli' : 'Vieraspeli')}
            </p>
            <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 truncate">
              vs {opponent}
            </h2>
          </div>
          <button onClick={onClose} className="ml-3 shrink-0 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* Result */}
            {result && (
              <div className="rounded-xl bg-gray-50 dark:bg-slate-700/50 p-4 text-center">
                <p className="text-xs text-gray-400 dark:text-slate-500 mb-1">
                  {location === 'home' ? 'Koti – Vieras' : 'Vieras – Koti'}
                </p>
                <p className="text-5xl font-bold tabular-nums text-gray-900 dark:text-slate-100">
                  {homeScore}–{awayScore}
                </p>
                {resultLabel && (
                  <p className={`text-sm font-bold mt-1 ${resultColor}`}>{resultLabel}</p>
                )}
              </div>
            )}

            {/* Meta info */}
            <div className="flex flex-wrap gap-3">
              {(dateStr || timeStr) && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <Clock size={14} className="shrink-0" />
                  <span>
                    {fmtDate(dateStr)}
                    {timeStr && ` · klo ${timeStr}`}
                  </span>
                </div>
              )}
              {venue && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <MapPin size={14} className="shrink-0" />
                  <span>{venue}{fieldStr ? ` · ${fieldStr}` : ''}</span>
                </div>
              )}
              {!venue && fieldStr && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400">
                  <MapPin size={14} className="shrink-0" />
                  <span>{fieldStr}</span>
                </div>
              )}
            </div>

            {/* Goals */}
            {result && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">Maalit</p>
                <div className="space-y-1.5">
                  {scorerRows.length > 0 ? (
                    scorerRows.map((r, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="text-base">⚽</span>
                        <span className="font-medium text-gray-800 dark:text-slate-200">{r.player!.name}</span>
                        {r.count > 1 && (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-600 text-white text-xs font-bold">{r.count}</span>
                        )}
                      </div>
                    ))
                  ) : result.goalsFor > 0 ? (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-base">⚽</span>
                      <span className="text-gray-800 dark:text-slate-200">{result.goalsFor} maali{result.goalsFor !== 1 ? 'a' : ''}</span>
                    </div>
                  ) : null}
                  {result.goalsAgainst > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-base">🔴</span>
                      <span className="text-gray-600 dark:text-slate-400">{opponent} – {result.goalsAgainst} maali{result.goalsAgainst !== 1 ? 'a' : ''}</span>
                    </div>
                  )}
                  {result.goalsFor === 0 && result.goalsAgainst === 0 && (
                    <p className="text-sm text-gray-400 dark:text-slate-500">Ei maaleja</p>
                  )}
                </div>
              </div>
            )}

            {/* Goalkeeper */}
            {goalkeepers.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">Maalivahti</p>
                <div className="flex flex-wrap gap-2">
                  {goalkeepers.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-2.5 py-1.5">
                      <Shield size={13} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Player minutes */}
            {minuteEntries.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">Peliajat</p>
                <div className="space-y-2">
                  {minuteEntries.map((p) => {
                    const secs = playerMinutes![p.id] ?? 0;
                    const pct = Math.min(100, (secs / maxSeconds) * 100);
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${POS_COLOR[p.position]}`}>
                          {POS_LABEL[p.position] ?? p.position.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-slate-300 w-24 shrink-0 truncate">{p.name}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                          <div className="h-2 rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500 w-12 text-right shrink-0">{fmtSeconds(secs)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Lineup (when no minutes available) */}
            {minuteEntries.length === 0 && sortedLineup.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500 mb-2">Kokoonpano</p>
                <div className="flex flex-wrap gap-2">
                  {sortedLineup.map((p) => (
                    <div key={p.id} className="flex items-center gap-1.5 bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5">
                      {p.position === 'goalkeeper' && <Shield size={12} className="text-yellow-500 shrink-0" />}
                      <span className={`text-[10px] font-bold px-1 py-0.5 rounded ${POS_COLOR[p.position]}`}>
                        {POS_LABEL[p.position] ?? '—'}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-slate-300">{p.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {lineupIds.length === 0 && !result && (
              <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Ei tietoja saatavilla</p>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
