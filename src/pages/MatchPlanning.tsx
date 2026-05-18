import { useState, useMemo, useEffect } from "react";
import { useMatchStore } from "../store/useMatchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useTeamStore } from "../store/useTeamStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { CheckCircle, UserX, UserCheck } from "lucide-react";
import { PlayerCard } from "../components/matchplanning/PlayerCard";
import { getPlayerParticipation } from "../utils/stats";
import { format } from "date-fns";
import type { Match, Player } from "../types";

// ── Types ──────────────────────────────────────────────────────────────────

type EventGroup = {
  key: string; // "2026-05-17-taso1"
  date: string; // "2026-05-17"
  teamLevel: string;
  teams: { id: string; name: string; matches: Match[] }[];
};

// playerId → teamId (assigned) | 'absent' (not coming) | undefined (unset)
type Assignments = Record<string, string | "absent">;

// ── Helpers ────────────────────────────────────────────────────────────────

function teamColor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("black")) return { active: "bg-gray-800 text-white border-gray-800", inactive: "border-gray-300 text-gray-500 hover:bg-gray-100 dark:border-slate-600 dark:text-slate-400" };
  if (n.includes("red"))   return { active: "bg-red-600 text-white border-red-600",   inactive: "border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900 dark:text-red-400" };
  if (n.includes("white")) return { active: "bg-blue-600 text-white border-blue-600", inactive: "border-blue-200 text-blue-500 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400" };
  return { active: "bg-brand-600 text-white border-brand-600", inactive: "border-brand-200 text-brand-600 hover:bg-brand-50 dark:border-brand-800 dark:text-brand-400" };
}

// ── Main component ─────────────────────────────────────────────────────────

export function MatchPlanning() {
  const { matches, updateMatch } = useMatchStore();
  const { players, updatePlayer } = usePlayerStore();
  const teams = useTeamStore((s) => s.teams);

  const upcoming = useMemo(() =>
    matches
      .filter((m) => !m.result)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matches]
  );

  // ── Group matches into day-events ────────────────────────────────────────

  const { eventGroups, soloMatches } = useMemo(() => {
    const grouped: Record<string, EventGroup> = {};
    const solo: Match[] = [];

    for (const m of upcoming) {
      if (m.ownTeamId && m.teamLevel) {
        const key = `${m.date.slice(0, 10)}-${m.teamLevel}`;
        if (!grouped[key]) {
          grouped[key] = { key, date: m.date.slice(0, 10), teamLevel: m.teamLevel, teams: [] };
        }
        const team = teams.find((t) => t.id === m.ownTeamId);
        if (team) {
          const existing = grouped[key].teams.find((t) => t.id === team.id);
          if (existing) existing.matches.push(m);
          else grouped[key].teams.push({ id: team.id, name: team.name, matches: [m] });
        }
      } else {
        solo.push(m);
      }
    }

    return {
      eventGroups: Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)),
      soloMatches: solo,
    };
  }, [upcoming, teams]);

  // ── Selection state ──────────────────────────────────────────────────────

  const firstKey = eventGroups[0]?.key ?? soloMatches[0]?.id ?? "";
  const [selectedKey, setSelectedKey] = useState(firstKey);
  const [filterTeamId, setFilterTeamId] = useState<string | null>(null);

  const selectedEvent = eventGroups.find((e) => e.key === selectedKey) ?? null;
  const selectedMatch = soloMatches.find((m) => m.id === selectedKey) ?? null;

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

  const inactivePlayers = players.filter((p) => !p.active);

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
    for (const team of selectedEvent.teams) {
      const lineup = eventPlayers
        .filter((p) => assignments[p.id] === team.id)
        .map((p) => p.id);
      for (const m of team.matches) {
        updateMatch(m.id, { lineup, lineupConfirmed: true });
      }
    }
    setSaved(true);
  }

  // Filtered events/solo for the team pills
  const visibleEvents = filterTeamId
    ? eventGroups.filter((e) => e.teams.some((t) => t.id === filterTeamId))
    : eventGroups;
  const visibleSolo = filterTeamId
    ? soloMatches.filter((m) => m.ownTeamId === filterTeamId)
    : soloMatches;

  if (upcoming.length === 0) {
    return (
      <Card>
        <p className="text-center text-gray-400 dark:text-slate-500 py-12">
          Ei tulevia otteluita. Lisää ensin ottelu.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">

      {/* Team filter pills */}
      {teams.length > 1 && (
        <div className="sticky top-0 z-10 -mt-6 -mx-6 px-6 pt-4 pb-3 bg-gray-50 dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 flex flex-wrap gap-2">
          <button onClick={() => setFilterTeamId(null)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterTeamId === null ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400"}`}>Kaikki</button>
          {teams.map((t) => (
            <button key={t.id} onClick={() => setFilterTeamId(filterTeamId === t.id ? null : t.id)} className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${filterTeamId === t.id ? "bg-brand-600 text-white border-brand-600" : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400"}`}>{t.name}</button>
          ))}
        </div>
      )}

      {/* Event / match selector */}
      <div className="flex flex-wrap gap-3">
        {visibleEvents.map((e) => {
          const sel = selectedKey === e.key;
          const totalMatches = e.teams.reduce((n, t) => n + t.matches.length, 0);
          return (
            <button
              key={e.key}
              onClick={() => setSelectedKey(e.key)}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-xl border-l-4 text-left transition-all ${
                sel
                  ? "border-l-brand-600 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shadow-md scale-105"
                  : "border-l-transparent bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-l-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <div className={`text-center min-w-[32px] ${sel ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-slate-400"}`}>
                <p className="text-xs leading-none">{format(new Date(e.date + "T12:00:00"), "EEE")}</p>
                <p className="text-base font-bold leading-tight">{format(new Date(e.date + "T12:00:00"), "dd.MM")}</p>
              </div>
              <div>
                <p className={`text-sm font-semibold leading-tight ${sel ? "text-gray-900 dark:text-slate-100" : "text-gray-800 dark:text-slate-200"}`}>
                  {e.teams.map((t) => t.name).join(" · ")}
                </p>
                <p className={`text-xs mt-0.5 ${sel ? "text-gray-500 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"}`}>
                  {e.teamLevel === "taso1" ? "Taso 1" : e.teamLevel === "taso2" ? "Taso 2" : e.teamLevel} · {totalMatches} ottelua
                </p>
              </div>
            </button>
          );
        })}

        {visibleSolo.map((m) => {
          const sel = selectedKey === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedKey(m.id)}
              className={`flex items-start gap-3 px-4 py-2.5 rounded-xl border-l-4 text-left transition-all ${
                sel
                  ? "border-l-brand-600 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shadow-md scale-105"
                  : "border-l-transparent bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-l-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <div className={`text-center min-w-[32px] ${sel ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-slate-400"}`}>
                <p className="text-xs leading-none">{format(new Date(m.date), "EEE")}</p>
                <p className="text-base font-bold leading-tight">{format(new Date(m.date), "dd.MM")}</p>
              </div>
              <div>
                <p className={`text-sm font-semibold leading-tight ${sel ? "text-gray-900 dark:text-slate-100" : "text-gray-800 dark:text-slate-200"}`}>
                  vs {m.opponent}
                </p>
                <p className={`text-xs mt-0.5 ${sel ? "text-gray-500 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"}`}>
                  {m.location === "home" ? "Koti" : "Vieras"}{m.venue ? ` · ${m.venue}` : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── EVENT PLANNER ─────────────────────────────────────── */}
      {selectedEvent && (
        <div className="space-y-5">

          {/* Event header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-gray-900 dark:text-slate-100">
                  {format(new Date(selectedEvent.date + "T12:00:00"), "dd.MM.yyyy")} · {selectedEvent.teamLevel === "taso1" ? "Taso 1" : selectedEvent.teamLevel === "taso2" ? "Taso 2" : selectedEvent.teamLevel}
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

            {/* Summary counts */}
            <div className="flex flex-wrap gap-3">
              {selectedEvent.teams.map((team) => {
                const count = eventPlayers.filter((p) => assignments[p.id] === team.id).length;
                const colors = teamColor(team.name);
                return (
                  <span key={team.id} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${count > 0 ? colors.active : "bg-gray-100 dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-400"}`}>
                    {team.name}: {count}
                  </span>
                );
              })}
              {(() => {
                const unassigned = eventPlayers.filter((p) => !assignments[p.id] || assignments[p.id] === "absent").length;
                return unassigned > 0 ? <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500">{unassigned} jakamatta</span> : null;
              })()}
            </div>
          </div>

          {/* Player assignment grid */}
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-3">
              Pelaajat ({eventPlayers.length})
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {eventPlayers.map((p) => {
                const assignment = assignments[p.id];
                const assignedTeam = selectedEvent.teams.find((t) => t.id === assignment);
                const isAbsent = assignment === "absent";
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border-2 p-3 transition-all ${
                      assignedTeam
                        ? "border-brand-300 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/20"
                        : isAbsent
                        ? "border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 opacity-50"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    }`}
                  >
                    {/* Player info */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        assignedTeam ? "bg-brand-600" : isAbsent ? "bg-gray-300 dark:bg-slate-600" : "bg-gray-400 dark:bg-slate-500"
                      }`}>
                        {p.number || "?"}
                      </div>
                      <span className={`text-sm font-medium leading-tight ${isAbsent ? "line-through text-gray-400 dark:text-slate-500" : "text-gray-900 dark:text-slate-100"}`}>
                        {p.name}
                      </span>
                    </div>

                    {/* Team buttons */}
                    <div className="flex flex-wrap gap-1">
                      {selectedEvent.teams.map((team) => {
                        const colors = teamColor(team.name);
                        const active = assignments[p.id] === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => assign(p.id, team.id)}
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold border transition-colors ${active ? colors.active : colors.inactive}`}
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

          {/* Unavailable players section */}
          {inactivePlayers.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Ei saatavilla</p>
              <div className="flex flex-wrap gap-2">
                {inactivePlayers.map((p) => (
                  <div key={p.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full pl-2.5 pr-1 py-1">
                    <span className="text-xs text-gray-400 dark:text-slate-500 line-through">{p.name}</span>
                    <button onClick={() => updatePlayer(p.id, { active: true })} title="Palauta saataville" className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-green-500 hover:border-green-300 flex items-center justify-center transition-colors">
                      <UserCheck size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── SOLO MATCH PLANNER (fallback) ─────────────────────── */}
      {selectedMatch && <SoloMatchPlanner match={selectedMatch} matches={matches} players={players} updateMatch={updateMatch} updatePlayer={updatePlayer} inactivePlayers={inactivePlayers} />}
    </div>
  );
}

// ── Solo match planner (kept for non-event matches) ────────────────────────

function SoloMatchPlanner({ match, matches, players, updateMatch, updatePlayer, inactivePlayers }: {
  match: Match;
  matches: Match[];
  players: Player[];
  updateMatch: (id: string, data: Partial<Match>) => void;
  updatePlayer: (id: string, data: Partial<Player>) => void;
  inactivePlayers: Player[];
}) {
  const activePlayers = players.filter((p) => p.active);
  const [isDragOverLineup, setIsDragOverLineup] = useState(false);

  function getAvailability(playerId: string) {
    return match.availability.find((a) => a.playerId === playerId)?.status ?? "available";
  }

  function setAvailability(playerId: string, status: string) {
    const existing = match.availability.filter((a) => a.playerId !== playerId);
    updateMatch(match.id, { availability: [...existing, { playerId, status: status as "available" | "unavailable" | "unknown" }] });
  }

  function toggleLineup(playerId: string) {
    const inLineup = match.lineup.includes(playerId);
    const lineup = inLineup ? match.lineup.filter((id) => id !== playerId) : [...match.lineup, playerId];
    updateMatch(match.id, { lineup, lineupConfirmed: false });
  }

  const poolPlayers = activePlayers.filter((p) => !match.lineup.includes(p.id));
  const lineupPlayers = activePlayers.filter((p) => match.lineup.includes(p.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div>
        <div className="mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">Pelaajat ({activePlayers.length})</h2>
        </div>
        <div onDrop={(e) => { e.preventDefault(); const pid = e.dataTransfer.getData("text/plain"); if (pid && match.lineup.includes(pid)) toggleLineup(pid); }} onDragOver={(e) => e.preventDefault()} className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-32">
          {poolPlayers.map((p) => (
            <div key={p.id} className="relative group/pool">
              <PlayerCard player={p} gamesPlayedPct={getPlayerParticipation(p.id, matches)} availability={getAvailability(p.id) as "available" | "unavailable" | "unknown"} onAvailabilityChange={(s) => setAvailability(p.id, s)} onTransfer={() => toggleLineup(p.id)} />
              <button onClick={() => updatePlayer(p.id, { active: false })} title="Merkitse ei saatavilla" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-red-500 hover:border-red-300 flex items-center justify-center opacity-0 group-hover/pool:opacity-100 transition-opacity z-10">
                <UserX size={11} />
              </button>
            </div>
          ))}
        </div>

        {inactivePlayers.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wide mb-2">Ei saatavilla</p>
            <div className="flex flex-wrap gap-2">
              {inactivePlayers.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full pl-2.5 pr-1 py-1">
                  <span className="text-xs text-gray-400 dark:text-slate-500 line-through">{p.name}</span>
                  <button onClick={() => updatePlayer(p.id, { active: true })} title="Palauta saataville" className="w-5 h-5 rounded-full bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-400 hover:text-green-500 hover:border-green-300 flex items-center justify-center transition-colors">
                    <UserCheck size={10} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-gray-900 dark:text-slate-100">Kokoonpano</h2>
            {match.lineupConfirmed && <CheckCircle size={15} className="text-green-500" />}
          </div>
          <Button size="sm" variant={match.lineupConfirmed ? "secondary" : "primary"} onClick={() => updateMatch(match.id, { lineupConfirmed: true })}>
            {match.lineupConfirmed ? "Tallennettu" : "Tallenna kokoonpano"}
          </Button>
        </div>
        <div
          onDrop={(e) => { e.preventDefault(); setIsDragOverLineup(false); const pid = e.dataTransfer.getData("text/plain"); if (pid && !match.lineup.includes(pid) && getAvailability(pid) !== "unavailable") toggleLineup(pid); }}
          onDragOver={(e) => e.preventDefault()}
          onDragEnter={() => setIsDragOverLineup(true)}
          onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOverLineup(false); }}
          className={`min-h-64 rounded-xl transition-colors ${isDragOverLineup ? "bg-gray-100 dark:bg-slate-800 ring-2 ring-brand-300" : ""}`}
        >
          {lineupPlayers.length === 0 ? (
            <div className="h-32 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
              <p className="text-sm text-gray-400 dark:text-slate-500">Vedä tai klikkaa pelaajia tähän.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {lineupPlayers.map((p) => (
                <PlayerCard key={p.id} player={p} gamesPlayedPct={getPlayerParticipation(p.id, matches)} availability={getAvailability(p.id) as "available" | "unavailable" | "unknown"} onAvailabilityChange={(s) => setAvailability(p.id, s)} onTransfer={() => toggleLineup(p.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
