import { useState, useMemo, useEffect } from "react";
import { useMatchStore } from "../store/useMatchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useTeamStore } from "../store/useTeamStore";
import { useAppStore } from "../store/useAppStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { fi } from "date-fns/locale";
import type { Match } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────

type EventGroup = {
  key: string;
  date: string;
  teamLevel: string;
  teams: { id: string; name: string; matches: Match[] }[];
};

// playerId → teamId (assigned) | 'absent' (not coming) | undefined (unset)
type Assignments = Record<string, string | "absent">;

// ── Main component ─────────────────────────────────────────────────────────

function groupMatches(list: Match[], teams: { id: string; name: string; color?: string }[]) {
  const grouped: Record<string, EventGroup> = {};
  for (const m of list) {
    const tl = m.teamLevel ?? 'general';
    // Matches with both ownTeamId and teamLevel are grouped by date+level.
    // Others get their own key so they always appear in the event planner.
    const key = (m.ownTeamId && m.teamLevel)
      ? `${m.date.slice(0, 10)}-${m.teamLevel}`
      : `solo-${m.id}`;
    if (!grouped[key]) grouped[key] = { key, date: m.date.slice(0, 10), teamLevel: tl, teams: [] };
    const team = teams.find((t) => t.id === m.ownTeamId) ?? { id: m.ownTeamId ?? 'solo', name: 'Joukkue' };
    const existing = grouped[key].teams.find((t) => t.id === team.id);
    if (existing) existing.matches.push(m);
    else grouped[key].teams.push({ id: team.id, name: team.name, matches: [m] });
  }
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function levelLabel(tl: string) {
  if (tl === "taso1") return "Taso 1";
  if (tl === "taso2") return "Taso 2";
  if (tl === "general") return "";
  return tl;
}

export function MatchPlanning() {
  const allMatches = useMatchStore((s) => s.matches);
  const { updateMatch } = useMatchStore();
  const { players } = usePlayerStore();
  const teams = useTeamStore((s) => s.teams);
  const { activeSeason, seasons } = useAppStore();
  const isFirstSeason = seasons[0] === activeSeason;
  const matches = useMemo(
    () => allMatches.filter((m) => m.season === activeSeason || (!m.season && isFirstSeason)),
    [allMatches, activeSeason, isFirstSeason]
  );

  const [showPlayed, setShowPlayed] = useState(false);

  const upcoming = useMemo(() =>
    matches
      .filter((m) => !m.result)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matches]
  );

  const played = useMemo(() =>
    matches
      .filter((m) => !!m.result)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [matches]
  );

  // ── Group all matches into day-events ────────────────────────────────────

  const eventGroups = useMemo(() => groupMatches(upcoming, teams), [upcoming, teams]);
  const playedEventGroups = useMemo(() => groupMatches(played, teams), [played, teams]);

  // ── Selection state ──────────────────────────────────────────────────────

  const firstKey = eventGroups[0]?.key ?? "";
  const firstPlayedKey = playedEventGroups[0]?.key ?? "";
  const [selectedKey, setSelectedKey] = useState(firstKey);
  const [selectedPlayedKey, setSelectedPlayedKey] = useState(firstPlayedKey);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);

  const selectedEvent = eventGroups.find((e) => e.key === selectedKey) ?? null;
  const selectedPlayedEvent = playedEventGroups.find((e) => e.key === selectedPlayedKey) ?? null;

  // ── Event planner state ──────────────────────────────────────────────────

  const [assignments, setAssignments] = useState<Assignments>({});
  const [saved, setSaved] = useState(false);

  // Init assignments from existing lineups when event changes
  useEffect(() => {
    if (!selectedEvent) return;
    const init: Assignments = {};
    for (const team of selectedEvent.teams) {
      for (const m of team.matches) {
        for (const pid of m.lineup) {
          init[pid] = team.id;
        }
        for (const pid of m.absentPlayerIds ?? []) {
          if (!init[pid]) init[pid] = 'absent';
        }
      }
    }
    setAssignments(init);
    setSaved(false);
  }, [selectedKey]);

  // Players relevant to the selected event
  const eventPlayers = useMemo(() => {
    if (!selectedEvent) return [];
    return players.filter((p) => {
      if (!p.active) return false;
      if (selectedEvent.teamLevel === "taso1") return p.skillLevel === 1 || p.skillLevel === 3;
      if (selectedEvent.teamLevel === "taso2") return p.skillLevel === 2 || p.skillLevel === 3;
      return true;
    });
  }, [selectedEvent, players]);

  function assign(playerId: string, value: string | "absent") {
    setAssignments((prev) => {
      const next = { ...prev };
      if (next[playerId] === value) delete next[playerId]; // toggle off
      else next[playerId] = value;
      return next;
    });
    setSaved(false);
  }

  function saveEvent() {
    if (!selectedEvent) return;
    const absentPlayerIds = eventPlayers
      .filter((p) => assignments[p.id] === 'absent')
      .map((p) => p.id);
    for (const team of selectedEvent.teams) {
      const lineup = eventPlayers
        .filter((p) => assignments[p.id] === team.id)
        .map((p) => p.id);
      for (const m of team.matches) {
        updateMatch(m.id, { lineup, lineupConfirmed: true, absentPlayerIds });
      }
    }
    setSaved(true);
  }

  const activeEventGroups = showPlayed ? playedEventGroups : eventGroups;

  const visibleEvents = filterTeamId
    ? activeEventGroups.filter((e) => e.teams.some((t) => t.id === filterTeamId))
    : activeEventGroups;

  if (upcoming.length === 0 && played.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-400 dark:text-slate-500 py-12">
          Ei otteluita. Lisää ensin ottelu.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Filter bar */}
      <div className="sticky top-0 z-10 -mt-6 -mx-6 px-6 pt-4 pb-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          {/* Two-way segmented toggle */}
          <div className="flex gap-1 bg-gray-200 dark:bg-slate-700 p-1 rounded-lg self-start">
            <button
              onClick={() => setShowPlayed(false)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                !showPlayed
                  ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Tulevat
            </button>
            <button
              onClick={() => setShowPlayed(true)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                showPlayed
                  ? 'bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              Pelatut
            </button>
          </div>
          {/* Team filters */}
          {teams.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="hidden sm:block w-px h-5 bg-gray-300 dark:bg-slate-600" />
              <button
                onClick={() => setFilterTeamId(null)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                  filterTeamId === null
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                }`}
              >
                Kaikki
              </button>
              {teams.map((t) => {
                const active = filterTeamId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setFilterTeamId(active ? null : t.id)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      active ? '' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500'
                    }`}
                    style={active ? { backgroundColor: t.color ?? '#64748b', borderColor: t.color ?? '#64748b', color: '#fff' } : undefined}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event / match selector */}
      <div className="flex flex-wrap gap-3">
        {visibleEvents.map((e) => {
          const sel = showPlayed ? selectedPlayedKey === e.key : selectedKey === e.key;
          const totalMatches = e.teams.reduce((n, t) => n + t.matches.length, 0);
          const isGrouped = e.teamLevel !== 'general';
          const firstMatch = e.teams[0]?.matches[0];
          const title = isGrouped
            ? e.teams.map((t) => t.name).join(" · ")
            : `vs ${firstMatch?.opponent ?? '?'}`;
          const ll = levelLabel(e.teamLevel);
          const subtitle = isGrouped
            ? `${ll ? ll + ' · ' : ''}${totalMatches} ottelua`
            : `${firstMatch?.location === 'home' ? 'Koti' : 'Vieras'}${firstMatch?.venue ? ` · ${firstMatch.venue}` : ''}`;
          return (
            <button
              key={e.key}
              onClick={() => showPlayed ? setSelectedPlayedKey(e.key) : setSelectedKey(e.key)}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-xl border-l-4 text-left transition-all ${
                sel
                  ? "border-l-brand-600 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shadow-md scale-105"
                  : "border-l-transparent bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-l-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <div className={`text-center min-w-[32px] ${sel ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-slate-400"}`}>
                <p className="text-xs leading-none">{format(new Date(e.date + "T12:00:00"), "EEE", { locale: fi }).slice(0, 2).toUpperCase()}</p>
                <p className="text-base font-bold leading-tight">{format(new Date(e.date + "T12:00:00"), "dd.MM")}</p>
              </div>
              <div>
                <p className={`text-sm font-semibold leading-tight ${sel ? "text-gray-900 dark:text-slate-100" : "text-gray-800 dark:text-slate-200"}`}>
                  {title}
                </p>
                <p className={`text-xs mt-0.5 ${sel ? "text-gray-500 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"}`}>
                  {subtitle}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── EVENT PLANNER ─────────────────────────────────────── */}
      {!showPlayed && selectedEvent && (
        <div className="space-y-5">

          {/* Event header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">
                  {format(new Date(selectedEvent.date + "T12:00:00"), "dd.MM.yyyy")}
                  {levelLabel(selectedEvent.teamLevel) && ` · ${levelLabel(selectedEvent.teamLevel)}`}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {selectedEvent.teams.map((t) => t.name).join(", ")}
                </p>
              </div>
              <Button
                onClick={saveEvent}
                icon={saved ? <CheckCircle size={14} /> : undefined}
                variant={saved ? "secondary" : "primary"}
              >
                {saved ? "Tallennettu" : "Tallenna kokoonpanot"}
              </Button>
            </div>

            {/* Matches per team */}
            <div className="flex flex-wrap gap-4">
              {selectedEvent.teams.map((team) => (
                <div key={team.id}>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-1">{team.name}</p>
                  {team.matches.map((m) => (
                    <p key={m.id} className="text-xs text-gray-600 dark:text-slate-300">
                      {format(new Date(m.date), "HH:mm")} {m.location === "home" ? "vs" : "@"} {m.opponent}
                    </p>
                  ))}
                </div>
              ))}
            </div>

            {/* Roster list */}
            <div className="flex flex-col gap-1.5 pt-3 border-t border-gray-100 dark:border-slate-700">
              {selectedEvent.teams.map((team) => {
                const teamCol = teams.find((t) => t.id === team.id)?.color ?? '#64748b';
                const assigned = eventPlayers
                  .filter((p) => assignments[p.id] === team.id)
                  .map((p) => p.name);
                return (
                  <div key={team.id} className="flex items-baseline gap-2">
                    <span
                      className="flex-shrink-0 text-xs font-bold text-white px-2.5 py-0.5 rounded-full"
                      style={{ backgroundColor: teamCol }}
                    >
                      {team.name} {assigned.length > 0 ? `(${assigned.length})` : ''}
                    </span>
                    {assigned.length > 0 ? (
                      <span className="text-sm text-gray-700 dark:text-slate-300">{assigned.join(', ')}</span>
                    ) : (
                      <span className="text-sm text-gray-300 dark:text-slate-600">–</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Player assignment grid */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Pelaajat ({eventPlayers.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {eventPlayers.map((p) => {
                const assignment = assignments[p.id];
                const assignedTeam = selectedEvent.teams.find((t) => t.id === assignment);
                const isAbsent = assignment === "absent";
                const assignedTeamColor = assignedTeam
                  ? teams.find((t) => t.id === assignedTeam.id)?.color ?? '#64748b'
                  : null;
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border-2 p-3 transition-all ${
                      assignedTeam
                        ? ''
                        : isAbsent
                        ? "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 opacity-50"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    }`}
                    style={assignedTeamColor ? { borderColor: assignedTeamColor, backgroundColor: `${assignedTeamColor}18` } : undefined}
                  >
                    {/* Player info */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          assignedTeam ? 'text-white' : isAbsent ? "bg-gray-300 dark:bg-slate-600 text-white" : "bg-gray-400 dark:bg-slate-500 text-white"
                        }`}
                        style={assignedTeamColor ? { backgroundColor: assignedTeamColor } : undefined}
                      >
                        {p.number || "?"}
                      </div>
                      <span className={`text-sm font-medium leading-tight ${isAbsent ? "line-through text-gray-400 dark:text-slate-500" : "text-gray-900 dark:text-slate-100"}`}>
                        {p.name}
                      </span>
                    </div>

                    {/* Team buttons */}
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.teams.map((team) => {
                        const active = assignments[p.id] === team.id;
                        const teamCol = teams.find((t) => t.id === team.id)?.color ?? '#64748b';
                        return (
                          <button
                            key={team.id}
                            onClick={() => assign(p.id, team.id)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                              active ? '' : 'bg-transparent dark:bg-transparent text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-600 hover:border-brand-400'
                            }`}
                            style={active ? { backgroundColor: teamCol, borderColor: teamCol, color: '#fff' } : undefined}
                          >
                            {team.name}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => assign(p.id, "absent")}
                        title="Ei tule"
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${
                          isAbsent
                            ? "bg-red-500 text-white border-red-500"
                            : "border-gray-200 dark:border-slate-600 text-gray-400 hover:bg-red-50 hover:border-red-200 hover:text-red-500"
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ── PLAYED MATCH DETAIL ───────────────────────────────── */}
      {showPlayed && selectedPlayedEvent && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-slate-100">
              {format(new Date(selectedPlayedEvent.date + "T12:00:00"), "dd.MM.yyyy")}
              {levelLabel(selectedPlayedEvent.teamLevel) && ` · ${levelLabel(selectedPlayedEvent.teamLevel)}`}
            </p>
          </div>
          {selectedPlayedEvent.teams.map((team) => (
            <div key={team.id} className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">{team.name}</p>
              {team.matches.map((m) => {
                const lineupPlayers = players.filter((p) => m.lineup.includes(p.id));
                return (
                  <div key={m.id} className="rounded-lg bg-gray-50 dark:bg-slate-700/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                        {format(new Date(m.date), "HH:mm")} {m.location === "home" ? "vs" : "@"} {m.opponent}
                      </p>
                      {m.result && (
                        <span className="text-sm font-bold text-gray-900 dark:text-slate-100">
                          {m.result.goalsFor}–{m.result.goalsAgainst}
                        </span>
                      )}
                    </div>
                    {lineupPlayers.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {lineupPlayers.map((p) => p.name).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
