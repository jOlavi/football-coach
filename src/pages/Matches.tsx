import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  PlayCircle,
  Trophy,
  X,
  MoreVertical,
} from "lucide-react";
import { useMatchStore } from "../store/useMatchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useTeamStore } from "../store/useTeamStore";
import { useTournamentStore } from "../store/useTournamentStore";
import { useAppStore } from "../store/useAppStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { MatchFormModal } from "../components/matches/MatchFormModal";
import { TournamentFormModal } from "../components/matches/TournamentFormModal";
import { format } from "date-fns";
import type { Match, MatchLevel, MatchResult, TeamFormat, Tournament } from "../types";

const FI_DAYS = ['su', 'ma', 'ti', 'ke', 'to', 'pe', 'la'];
const FI_MONTHS = ['tammi', 'helmi', 'maalis', 'huhti', 'touko', 'kesä', 'heinä', 'elo', 'syys', 'loka', 'marras', 'joulu'];

function getLineupThresholds(format?: TeamFormat): { low: number; max: number } {
  if (format === "5v5")   return { low: 5, max: 9 };
  if (format === "7v7")   return { low: 7, max: 12 };
  if (format === "8v8")   return { low: 8, max: 11 };
  if (format === "11v11") return { low: 11, max: 14 };
  return { low: 7, max: 12 };
}

const levelLabels: Record<MatchLevel, string> = {
  league: "Sarja", cup: "Cup", tournament: "Turnaus", friendly: "Harjoitusottelu",
};

export function Matches() {
  const navigate = useNavigate();
  const location = useLocation();
  const allMatches = useMatchStore((s) => s.matches);
  const { deleteMatch, setResult } = useMatchStore();
  const players = usePlayerStore((s) => s.players);
  const teams = useTeamStore((s) => s.teams);
  const allTournaments = useTournamentStore((s) => s.tournaments);
  const { deleteTournament, addTournamentMatch, updateTournamentMatch, removeTournamentMatch } = useTournamentStore();
  const { activeSeason, seasons } = useAppStore();
  const isFirstSeason = seasons[0] === activeSeason;
  const inSeason = (s?: string) => s === activeSeason || (!s && isFirstSeason);
  const matches = allMatches.filter((m) => inSeason(m.season));
  const tournaments = allTournaments.filter((t) => inSeason(t.season));

  const [activeTab, setActiveTab] = useState<'matches' | 'tournaments'>(
    (location.state as { tab?: string } | null)?.tab === 'tournaments' ? 'tournaments' : 'matches'
  );
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [matchFilter, setMatchFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [resultModal, setResultModal] = useState<Match | null>(null);
  const [resultForm, setResultForm] = useState<MatchResult>({
    goalsFor: 0,
    goalsAgainst: 0,
    scorers: [],
  });

  const [showTournamentFormModal, setShowTournamentFormModal] = useState(false);
  const [editingTournamentForModal, setEditingTournamentForModal] = useState<Tournament | null>(null);
  const [confirmDeleteTournamentId, setConfirmDeleteTournamentId] = useState<string | null>(null);
  const [editingTournamentResult, setEditingTournamentResult] = useState<{ tournamentId: string; matchId: string; goalsFor: number; goalsAgainst: number } | null>(null);
  const initialExpanded = (location.state as { tournamentId?: string } | null)?.tournamentId;
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(
    initialExpanded ? new Set([initialExpanded]) : new Set()
  );
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filtered = selectedTeamId
    ? matches.filter((m) => m.ownTeamId === selectedTeamId)
    : matches;

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const past = sorted.filter((m) => m.result);
  const upcoming = sorted
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());


  function openResult(m: Match) {
    setResultModal(m);
    setResultForm(m.result ?? { goalsFor: 0, goalsAgainst: 0, scorers: [] });
  }

  function handleSaveResult() {
    if (!resultModal) return;
    setResult(resultModal.id, resultForm);
    setResultModal(null);
  }

  function toggleScorer(playerId: string, count: number) {
    const existing = resultForm.scorers.find((s) => s.playerId === playerId);
    if (count === 0) {
      setResultForm({
        ...resultForm,
        scorers: resultForm.scorers.filter((s) => s.playerId !== playerId),
      });
    } else if (existing) {
      setResultForm({
        ...resultForm,
        scorers: resultForm.scorers.map((s) =>
          s.playerId === playerId ? { ...s, count } : s
        ),
      });
    } else {
      setResultForm({
        ...resultForm,
        scorers: [...resultForm.scorers, { playerId, count }],
      });
    }
  }

  function MatchRow({ m }: { m: Match }) {
    const open = expanded === m.id;
    const date = new Date(m.date);
    const dayAbbr = FI_DAYS[date.getDay()];
    const dayNum = format(date, 'dd');
    const monthName = FI_MONTHS[date.getMonth()];
    const timeStr = format(date, 'HH:mm');
    const isPast = !!m.result;

    const ownTeam = m.ownTeamId ? teams.find((t) => t.id === m.ownTeamId) : null;
    const matchTitle = ownTeam
      ? (m.location === 'home' ? `${ownTeam.name} – ${m.opponent}` : `${m.opponent} – ${ownTeam.name}`)
      : `vs ${m.opponent}`;

    const lineupPlayers = m.lineup.map((id) => players.find((p) => p.id === id)).filter(Boolean);

    const statusBadge = isPast ? (
      <span className={`text-xl font-bold ${
        m.result!.goalsFor > m.result!.goalsAgainst ? 'text-green-600'
        : m.result!.goalsFor < m.result!.goalsAgainst ? 'text-red-500'
        : 'text-gray-600 dark:text-slate-300'
      }`}>
        {m.location === 'home'
          ? `${m.result!.goalsFor} – ${m.result!.goalsAgainst}`
          : `${m.result!.goalsAgainst} – ${m.result!.goalsFor}`}
      </span>
    ) : (() => {
      const { low, max } = getLineupThresholds(m.format);
      const n = m.lineup.length;
      if (n === 0) return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-2 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />Ei kokoonpanoa
        </span>
      );
      const isGood = n >= max;
      const isLow = n < low;
      const colorClass = isLow ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : isGood ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20';
      const dotClass = isLow ? 'bg-red-500' : isGood ? 'bg-green-500' : 'bg-amber-500';
      return (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${colorClass} rounded-lg px-2 py-1`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotClass} flex-shrink-0`} />{n}/{max}
        </span>
      );
    })();

    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden transition-all hover:border-gray-200 dark:hover:border-slate-600 hover:shadow-sm ${isPast ? 'opacity-70 hover:opacity-100' : ''}`}>
        <div className="flex items-stretch cursor-pointer" onClick={() => setExpanded(open ? null : m.id)}>
          {/* Date block */}
          <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center py-4 bg-gray-50 dark:bg-slate-700/40 border-r border-gray-100 dark:border-slate-700">
            <span className="text-xs text-gray-400 dark:text-slate-500 font-medium uppercase tracking-wide">{dayAbbr}</span>
            <span className={`text-2xl font-bold leading-tight ${isPast ? 'text-gray-400 dark:text-slate-500' : 'text-gray-900 dark:text-slate-100'}`}>{dayNum}</span>
            <span className="text-xs text-gray-400 dark:text-slate-500">{monthName}</span>
          </div>
          {/* Match info */}
          <div className="flex-1 flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-slate-100 text-sm truncate">{matchTitle}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {ownTeam && (
                  <span
                    className="text-xs font-semibold rounded-full px-2 py-0.5 text-white"
                    style={{ backgroundColor: ownTeam.color ?? '#6b7280' }}
                  >
                    {ownTeam.name}
                  </span>
                )}
                <span className="text-xs text-gray-400 dark:text-slate-500 font-mono">{timeStr}</span>
                <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${m.location === 'home' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'}`}>
                  {m.location === 'home' ? 'Koti' : 'Vieras'}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5 font-medium">{levelLabels[m.level]}</span>
                {m.format && <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 rounded-full px-2 py-0.5 font-medium">{m.format}</span>}
                {m.venue && <span className="text-xs text-gray-400 dark:text-slate-500">{m.venue}</span>}
              </div>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              {statusBadge}
              {open ? <ChevronUp size={16} className="text-gray-400 dark:text-slate-500" /> : <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />}
            </div>
          </div>
        </div>
        {open && (
          <div className="px-4 pb-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700">
            <div className="pt-3 space-y-3">
              {!m.result && m.lineup.length === 0 && (
                <button
                  onClick={() => navigate(`/planning?matchId=${m.id}`)}
                  className="w-full flex items-center gap-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2.5 text-left hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <ClipboardList size={16} className="text-yellow-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Kokoonpano puuttuu</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Klikkaa suunnitellaksesi joukkue tälle ottelulle</p>
                  </div>
                </button>
              )}
              {m.lineupConfirmed && m.lineup.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Kokoonpano ({m.lineup.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {lineupPlayers.map((p) => p && (
                      <span key={p.id} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full px-2.5 py-1 text-xs font-medium dark:text-slate-200">
                        #{p.number} {p.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {m.result?.scorers && m.result.scorers.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">Maalintekijät</p>
                  <div className="flex flex-wrap gap-1.5">
                    {m.result.scorers.map((s) => {
                      const p = players.find((pl) => pl.id === s.playerId);
                      return p ? (
                        <span key={s.playerId} className="bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full px-2.5 py-1 text-xs font-medium">
                          ⚽ {p.name} ({s.count})
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              {m.notes && <p className="text-sm text-gray-600 dark:text-slate-300 italic">{m.notes}</p>}
              {!m.result && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" icon={<ClipboardList size={13} />} onClick={() => navigate(`/planning?matchId=${m.id}`)}>
                    Suunnittele kokoonpano
                  </Button>
                  <Button size="sm" onClick={() => openResult(m)}>Kirjaa tulos</Button>
                  <Button size="sm" icon={<PlayCircle size={13} />} onClick={() => navigate(`/matches/${m.id}/setup`, { state: { match: m } })}>
                    Aloita pelinhallinta
                  </Button>
                </div>
              )}
              {m.result && (
                <Button variant="secondary" size="sm" onClick={() => openResult(m)}>Muokkaa tulosta</Button>
              )}
              <div className="flex gap-1 pt-1 border-t border-gray-100 dark:border-slate-700">
                <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={() => { setEditingMatch(m); setShowMatchForm(true); }}>Muokkaa</Button>
                <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} onClick={() => setConfirmDeleteId(m.id)}>Poista</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mt-6 -mx-6 px-6 pt-4 pb-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 space-y-2">
        <div className="flex items-center p-1.5 rounded-xl bg-gray-200 dark:bg-slate-700 gap-0.5">
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'matches'
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            Ottelut
            {filtered.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'matches' ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400' : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400'}`}>
                {filtered.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('tournaments')}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'tournaments'
                ? 'bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            <Trophy size={14} className={activeTab === 'tournaments' ? 'text-yellow-500' : 'text-gray-400 dark:text-slate-500'} />
            Turnaukset
            {tournaments.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'tournaments' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-gray-300 dark:bg-slate-600 text-gray-500 dark:text-slate-400'}`}>
                {tournaments.length}
              </span>
            )}
          </button>
          <div className="ml-auto">
            {activeTab === 'matches' ? (
              <Button icon={<Plus size={15} />} onClick={() => { setEditingMatch(null); setShowMatchForm(true); }}>Lisää ottelu</Button>
            ) : (
              <Button icon={<Plus size={15} />} onClick={() => { setEditingTournamentForModal(null); setShowTournamentFormModal(true); }}>Luo turnaus</Button>
            )}
          </div>
        </div>

        {activeTab === 'matches' && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Three-way toggle */}
            <div className="flex gap-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg">
              {(['upcoming', 'past', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setMatchFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    matchFilter === f
                      ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 shadow-sm'
                      : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                  }`}
                >
                  {f === 'upcoming' ? 'Tulevat' : f === 'past' ? 'Pelatut' : 'Kaikki'}
                </button>
              ))}
            </div>
            {/* Team filters */}
            {teams.length > 0 && (
              <>
                <div className="w-px h-5 bg-gray-300 dark:bg-slate-600" />
                <button
                  onClick={() => setSelectedTeamId(null)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedTeamId === null
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                  }`}
                >
                  Kaikki
                </button>
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTeamId(selectedTeamId === t.id ? null : t.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      selectedTeamId === t.id
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {activeTab === 'matches' && (
        <>
          {filtered.length === 0 ? (
            <Card>
              <p className="text-center text-gray-400 dark:text-slate-500 py-8">
                Ei otteluita vielä. Lisää ensimmäinen ottelu!
              </p>
            </Card>
          ) : matchFilter === 'all' ? (
            <section className="space-y-2">
              {upcoming.map((m) => <MatchRow key={m.id} m={m} />)}
              {upcoming.length > 0 && past.length > 0 && (
                <div className="flex items-center gap-3 py-1 pt-2">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                  <span className="text-xs text-gray-400 dark:text-slate-500 font-semibold uppercase tracking-widest">Pelatut</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-slate-700" />
                </div>
              )}
              {past.map((m) => <MatchRow key={m.id} m={m} />)}
              {upcoming.length === 0 && past.length === 0 && (
                <p className="text-center text-gray-400 dark:text-slate-500 py-8">Ei otteluita.</p>
              )}
            </section>
          ) : (
            <section>
              <div className="space-y-2">
                {(matchFilter === 'upcoming' ? upcoming : past).map((m) => <MatchRow key={m.id} m={m} />)}
                {(matchFilter === 'upcoming' ? upcoming : past).length === 0 && (
                  <p className="text-center text-gray-400 dark:text-slate-500 py-8">
                    {matchFilter === 'upcoming' ? 'Ei tulevia otteluita.' : 'Ei pelattuja otteluita.'}
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      {activeTab === 'tournaments' && (
        <section className="space-y-4">
          {tournaments.length === 0 && (
            <Card>
              <p className="text-center text-gray-400 dark:text-slate-500 py-8">
                Ei turnauksia. Luo ensimmäinen turnaus!
              </p>
            </Card>
          )}
          {[...tournaments].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).map((t) => {
            const isCollapsed = !expandedTournaments.has(t.id);
            const toggleCollapse = () => setExpandedTournaments((prev) => {
              const next = new Set(prev);
              if (next.has(t.id)) next.delete(t.id); else next.add(t.id);
              return next;
            });
            const tournamentOwnTeam = t.ownTeamId ? teams.find((team) => team.id === t.ownTeamId) : null;
            return (
            <div key={t.id} className="border border-gray-100 dark:border-slate-700 rounded-xl">
              {/* Tournament header */}
              <div
                className={`bg-white dark:bg-slate-800 px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${isCollapsed ? 'rounded-xl' : 'rounded-t-xl'}`}
                onClick={toggleCollapse}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Trophy size={18} className="text-yellow-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-slate-100">{t.name}</p>
                    {isCollapsed ? (
                      <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                        {t.date ? format(new Date(t.date), 'dd.MM.yyyy') : '—'}
                        {tournamentOwnTeam ? ` · ${tournamentOwnTeam.name}` : ''}
                      </p>
                    ) : (
                      <div className="mt-1.5 space-y-0.5">
                        {t.date && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500 w-16 inline-block">Päivä</span>
                            {format(new Date(t.date), 'dd.MM.yyyy')}
                          </p>
                        )}
                        {t.venue && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500 w-16 inline-block">Kenttä</span>
                            {t.venue}
                          </p>
                        )}
                        {t.address && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500 w-16 inline-block">Osoite</span>
                            {t.address}
                          </p>
                        )}
                        {(() => {
                          const ownTeam = t.ownTeamId ? teams.find((ot) => ot.id === t.ownTeamId) : null;
                          return ownTeam ? (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              <span className="text-gray-400 dark:text-slate-500 w-16 inline-block">Joukkue</span>
                              {ownTeam.name}
                            </p>
                          ) : null;
                        })()}
                        {t.level && (
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            <span className="text-gray-400 dark:text-slate-500 w-16 inline-block">Taso</span>
                            {t.level}
                          </p>
                        )}
                        {t.notes && <p className="text-xs text-gray-500 dark:text-slate-400 italic mt-1">{t.notes}</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {openMenuId === t.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute right-0 top-9 z-20 w-36 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
                          <button
                            onClick={() => { setEditingTournamentForModal(t); setShowTournamentFormModal(true); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Pencil size={13} className="text-gray-400 dark:text-slate-500" /> Muokkaa
                          </button>
                          <button
                            onClick={() => { setConfirmDeleteTournamentId(t.id); setOpenMenuId(null); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          >
                            <Trash2 size={13} /> Poista
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 cursor-pointer" onClick={toggleCollapse}>
                    {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </span>
                </div>
              </div>
              {/* Tournament matches */}
              {!isCollapsed && <div className="bg-gray-50 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 px-4 py-3 space-y-1 rounded-b-xl">
                {(t.matches ?? []).length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 py-1">Ei otteluita vielä.</p>
                )}
                {[...(t.matches ?? [])].sort((a, b) => (a.time ?? '').localeCompare(b.time ?? '')).map((m) => {
                  const isEditingResult = editingTournamentResult?.tournamentId === t.id && editingTournamentResult?.matchId === m.id;
                  return (
                    <div key={m.id}>
                      <div className="flex items-center gap-2 py-1.5 border-b border-gray-100 dark:border-slate-700 last:border-0">
                        <span className="text-xs text-gray-400 dark:text-slate-500 w-10 flex-shrink-0 font-mono">{m.time || '—'}</span>
                        {m.field && <span className="text-xs text-gray-400 dark:text-slate-500 w-20 truncate flex-shrink-0">{m.field}</span>}
                        <span className="flex-1 text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                          {tournamentOwnTeam
                            ? (m.location === 'away'
                                ? <><span className="font-normal text-gray-500 dark:text-slate-400">{m.opponent}</span><span className="mx-1 text-gray-400 dark:text-slate-500">–</span><span className="font-bold">{tournamentOwnTeam.name}</span></>
                                : <><span className="font-bold">{tournamentOwnTeam.name}</span><span className="mx-1 text-gray-400 dark:text-slate-500">–</span><span className="font-normal text-gray-500 dark:text-slate-400">{m.opponent}</span></>)
                            : `vs ${m.opponent}`}
                        </span>
                        {m.result ? (
                          <button
                            onClick={() => setEditingTournamentResult({ tournamentId: t.id, matchId: m.id, goalsFor: m.result!.goalsFor, goalsAgainst: m.result!.goalsAgainst })}
                            className={`text-sm font-bold ${m.result.goalsFor > m.result.goalsAgainst ? 'text-green-600' : m.result.goalsFor < m.result.goalsAgainst ? 'text-red-500' : 'text-gray-500 dark:text-slate-400'}`}
                          >
                            {m.result.goalsFor}–{m.result.goalsAgainst}
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingTournamentResult({ tournamentId: t.id, matchId: m.id, goalsFor: 0, goalsAgainst: 0 })}
                            className="text-xs font-medium text-brand-600 hover:underline"
                          >
                            Kirjaa tulos
                          </button>
                        )}
                        <button onClick={() => removeTournamentMatch(t.id, m.id)} className="text-gray-300 dark:text-slate-600 hover:text-red-400 transition-colors ml-1">
                          <X size={13} />
                        </button>
                      </div>
                      {isEditingResult && (
                        <div className="flex items-center gap-2 py-2 px-2 bg-white dark:bg-slate-800 rounded-lg my-1">
                          <input type="number" min={0} value={editingTournamentResult.goalsFor}
                            onChange={(e) => setEditingTournamentResult({ ...editingTournamentResult, goalsFor: +e.target.value })}
                            className="w-12 text-center text-lg font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100" />
                          <span className="text-gray-400 font-bold">–</span>
                          <input type="number" min={0} value={editingTournamentResult.goalsAgainst}
                            onChange={(e) => setEditingTournamentResult({ ...editingTournamentResult, goalsAgainst: +e.target.value })}
                            className="w-12 text-center text-lg font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100" />
                          <Button size="sm" onClick={() => {
                            updateTournamentMatch(t.id, m.id, { result: { goalsFor: editingTournamentResult.goalsFor, goalsAgainst: editingTournamentResult.goalsAgainst } });
                            setEditingTournamentResult(null);
                          }}>Tallenna</Button>
                          <Button variant="secondary" size="sm" onClick={() => setEditingTournamentResult(null)}>Peruuta</Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                <div className="pt-1">
                  <Button variant="secondary" size="sm" icon={<Plus size={13} />}
                    onClick={() => addTournamentMatch(t.id, { id: crypto.randomUUID(), opponent: 'Uusi ottelu' })}>
                    Lisää ottelu
                  </Button>
                </div>
              </div>}
            </div>
            );
          })}
        </section>
      )}

      {showTournamentFormModal && (
        <TournamentFormModal
          editing={editingTournamentForModal ?? undefined}
          onClose={() => { setShowTournamentFormModal(false); setEditingTournamentForModal(null); }}
        />
      )}

      {showMatchForm && (
        <MatchFormModal
          editing={editingMatch ?? undefined}
          onClose={() => { setShowMatchForm(false); setEditingMatch(null); }}
        />
      )}

      {/* Record Result Modal */}
      {resultModal && (
        <Modal
          title={`Tulos: vs ${resultModal.opponent}`}
          onClose={() => setResultModal(null)}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Omat maalit</p>
                <input
                  type="number"
                  min={0}
                  value={resultForm.goalsFor}
                  onChange={(e) =>
                    setResultForm({ ...resultForm, goalsFor: +e.target.value })
                  }
                  className="w-16 text-center text-2xl font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
              <span className="text-2xl text-gray-400 dark:text-slate-500 font-bold">–</span>
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Vastustaja</p>
                <input
                  type="number"
                  min={0}
                  value={resultForm.goalsAgainst}
                  onChange={(e) =>
                    setResultForm({
                      ...resultForm,
                      goalsAgainst: +e.target.value,
                    })
                  }
                  className="w-16 text-center text-2xl font-bold border rounded-lg p-1 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
                />
              </div>
            </div>
            {resultModal.lineup.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-2">
                  Maalintekijät
                </p>
                <div className="rounded-lg border border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700 max-h-52 overflow-y-auto">
                  {resultModal.lineup.map((pid) => {
                    const p = players.find((pl) => pl.id === pid);
                    if (!p) return null;
                    const scorer = resultForm.scorers.find((s) => s.playerId === pid);
                    const count = scorer?.count ?? 0;
                    return (
                      <div
                        key={pid}
                        className="flex items-center justify-between px-3 py-2.5 text-sm bg-white dark:bg-slate-800"
                      >
                        <span className="font-medium text-gray-800 dark:text-slate-200">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleScorer(pid, Math.max(0, count - 1))}
                            className="w-7 h-7 rounded-md border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-gray-100 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 flex items-center justify-center text-lg leading-none transition-colors"
                          >
                            −
                          </button>
                          <span className="w-6 text-center font-bold text-gray-800 dark:text-slate-100">
                            {count}
                          </span>
                          <button
                            onClick={() => toggleScorer(pid, count + 1)}
                            className="w-7 h-7 rounded-md bg-brand-600 hover:bg-brand-700 text-white flex items-center justify-center text-lg leading-none transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setResultModal(null)}>
                Peruuta
              </Button>
              <Button onClick={handleSaveResult}>Tallenna tulos</Button>
            </div>
          </div>
        </Modal>
      )}

      {confirmDeleteTournamentId && (() => {
        const t = tournaments.find((x) => x.id === confirmDeleteTournamentId);
        if (!t) return null;
        return (
          <Modal title="Poista turnaus" onClose={() => setConfirmDeleteTournamentId(null)}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Haluatko varmasti poistaa turnauksen <span className="font-semibold text-gray-900 dark:text-slate-100">{t.name}</span>?
              </p>
              <p className="text-xs text-red-500">Tätä toimintoa ei voi peruuttaa. Turnauksen ottelut poistetaan myös.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmDeleteTournamentId(null)}>Peruuta</Button>
                <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => {
                  deleteTournament(confirmDeleteTournamentId);
                  setConfirmDeleteTournamentId(null);
                }}>
                  Poista
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {confirmDeleteId && (() => {
        const m = matches.find((x) => x.id === confirmDeleteId);
        if (!m) return null;
        return (
          <Modal title="Poista ottelu" onClose={() => setConfirmDeleteId(null)}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-slate-300">
                Haluatko varmasti poistaa ottelun <span className="font-semibold text-gray-900 dark:text-slate-100">vs {m.opponent}</span> ({format(new Date(m.date), 'dd.MM.yyyy')})?
              </p>
              <p className="text-xs text-red-500">Tätä toimintoa ei voi peruuttaa.</p>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>Peruuta</Button>
                <Button variant="danger" icon={<Trash2 size={13} />} onClick={() => { deleteMatch(confirmDeleteId); setConfirmDeleteId(null); }}>
                  Poista
                </Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </div>
  );
}
