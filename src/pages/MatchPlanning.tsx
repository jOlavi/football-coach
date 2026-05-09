import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useMatchStore } from "../store/useMatchStore";
import { usePlayerStore } from "../store/usePlayerStore";
import { useSettingsStore } from "../store/useSettingsStore";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { CheckCircle } from "lucide-react";
import { PlayerCard } from "../components/matchplanning/PlayerCard";
import { getPlayerParticipation } from "../utils/stats";
import { format } from "date-fns";
import type { AvailabilityStatus, Player } from "../types";

export function MatchPlanning() {
  const { matches, updateMatch } = useMatchStore();
  const players = usePlayerStore((s) => s.players);
  const settingsMinLineupSize = useSettingsStore(
    (s) => s.settings.minLineupSize
  );

  const upcoming = matches
    .filter((m) => !m.result)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [searchParams] = useSearchParams();
  const [selectedMatchId, setSelectedMatchId] = useState<string>(
    searchParams.get("matchId") ?? upcoming[0]?.id ?? ""
  );
  const [isDragOverLineup, setIsDragOverLineup] = useState(false);
  const match = matches.find((m) => m.id === selectedMatchId);
  const activePlayers = players.filter((p) => {
    if (!p.active) return false;
    if (!match?.teamLevel) return true;
    if (p.skillLevel === 3) return true; // Molemmat
    return match.teamLevel === 'taso1' ? p.skillLevel === 1 : p.skillLevel === 2;
  });

  const minLineupSize =
    match?.format === "5v5" ? 9
    : match?.format === "7v7" ? 12
    : match?.format === "8v8" ? 11
    : match?.format === "11v11" ? 14
    : settingsMinLineupSize;

  function getAvailability(playerId: string): AvailabilityStatus {
    return (
      match?.availability.find((a) => a.playerId === playerId)?.status ??
      "available"
    );
  }

  function setAvailability(playerId: string, status: AvailabilityStatus) {
    if (!match) return;
    const existing = match.availability.filter((a) => a.playerId !== playerId);
    updateMatch(match.id, {
      availability: [...existing, { playerId, status }],
    });
  }

  function toggleLineup(playerId: string) {
    if (!match) return;
    const inLineup = match.lineup.includes(playerId);
    const lineup = inLineup
      ? match.lineup.filter((id) => id !== playerId)
      : [...match.lineup, playerId];
    updateMatch(match.id, { lineup, lineupConfirmed: false });
  }

  function handlePoolDrop(e: React.DragEvent) {
    e.preventDefault();
    const playerId = e.dataTransfer.getData("text/plain");
    if (playerId && match?.lineup.includes(playerId)) toggleLineup(playerId);
  }

  function handleLineupDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOverLineup(false);
    const playerId = e.dataTransfer.getData("text/plain");
    if (
      playerId &&
      !match?.lineup.includes(playerId) &&
      getAvailability(playerId) !== "unavailable"
    ) {
      toggleLineup(playerId);
    }
  }

  // Freeze sort order per match — re-sorts only when selected match changes,
  // so changing a player's availability dot doesn't shuffle the list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableOrder = useMemo(() => {
    const snap =
      matches.find((m) => m.id === selectedMatchId)?.availability ?? [];
    const order: Record<AvailabilityStatus, number> = {
      available: 0,
      unknown: 1,
      unavailable: 2,
    };
    return [...activePlayers]
      .sort((a, b) => {
        const av = snap.find((x) => x.playerId === a.id)?.status ?? "unknown";
        const bv = snap.find((x) => x.playerId === b.id)?.status ?? "unknown";
        return order[av] - order[bv];
      })
      .map((p) => p.id);
  }, [selectedMatchId]); // intentional: exclude matches/activePlayers to freeze order within a match

  // Players booked in another match on the same day → show conflict warning
  const sameDayConflicts = useMemo(() => {
    if (!match) return {} as Record<string, string>;
    const result: Record<string, string> = {};
    for (const m of matches) {
      if (m.id === selectedMatchId || m.result) continue;
      if (m.date.slice(0, 10) !== match.date.slice(0, 10)) continue;
      for (const pid of m.lineup) {
        if (!result[pid]) result[pid] = m.opponent;
      }
    }
    return result;
  }, [matches, selectedMatchId, match]);

  const poolPlayers = stableOrder
    .map((id) => activePlayers.find((p) => p.id === id))
    .filter((p): p is Player => p != null && !match?.lineup.includes(p.id));

  const lineupPlayers = activePlayers.filter((p) =>
    match?.lineup.includes(p.id)
  );

  const availableCount = activePlayers.filter(
    (p) => getAvailability(p.id) === "available"
  ).length;
  const unknownCount = activePlayers.filter(
    (p) => getAvailability(p.id) === "unknown"
  ).length;
  const unavailableCount = activePlayers.filter(
    (p) => getAvailability(p.id) === "unavailable"
  ).length;

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
      {/* Match selector */}
      <div className="flex flex-wrap gap-3">
        {upcoming.map((m) => {
          const selected = m.id === selectedMatchId;
          return (
            <button
              key={m.id}
              onClick={() => setSelectedMatchId(m.id)}
              className={`relative flex items-center gap-3 px-4 py-2.5 rounded-xl border-l-4 text-left transition-all ${
                selected
                  ? "border-l-brand-600 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 shadow-md scale-105"
                  : "border-l-transparent bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:border-l-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              }`}
            >
              <div className={`text-center min-w-[32px] ${selected ? "text-brand-600 dark:text-brand-400" : "text-gray-500 dark:text-slate-400"}`}>
                <p className="text-xs leading-none">{format(new Date(m.date), "EEE")}</p>
                <p className="text-base font-bold leading-tight">{format(new Date(m.date), "dd.MM")}</p>
              </div>
              <div>
                <p className={`text-sm font-semibold leading-tight ${selected ? "text-gray-900 dark:text-slate-100" : "text-gray-800 dark:text-slate-200"}`}>
                  vs {m.opponent}
                </p>
                <p className={`text-xs mt-0.5 ${selected ? "text-gray-500 dark:text-slate-400" : "text-gray-400 dark:text-slate-500"}`}>
                  {m.teamLevel === 'taso1' ? 'Taso 1' : m.teamLevel === 'taso2' ? 'Taso 2' : ''}{m.teamLevel ? ' · ' : ''}{m.location === "home" ? "Koti" : "Vieras"}{m.venue ? ` · ${m.venue}` : ""}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {match && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Left — Player pool */}
          <div>
            <div className="mb-3">
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">
                Pelaajat ({activePlayers.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                {availableCount} saatavilla · {unknownCount} ei vahvistettu ·{" "}
                {unavailableCount} poissa
              </p>
            </div>
            <div
              onDrop={handlePoolDrop}
              onDragOver={(e) => e.preventDefault()}
              className="grid grid-cols-2 sm:grid-cols-3 gap-3 min-h-32"
            >
              {poolPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  gamesPlayedPct={getPlayerParticipation(p.id, matches)}
                  availability={getAvailability(p.id)}
                  onAvailabilityChange={(status) =>
                    setAvailability(p.id, status)
                  }
                  onTransfer={() => toggleLineup(p.id)}
                  conflictOpponent={sameDayConflicts[p.id]}
                />
              ))}
            </div>
          </div>

          {/* Right — Lineup */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">Kokoonpano</h2>
                {match.lineupConfirmed && (
                  <CheckCircle size={15} className="text-green-500" />
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  label={`${lineupPlayers.length}/${minLineupSize}`}
                  color={lineupPlayers.length >= minLineupSize ? "green" : "yellow"}
                />
                <Button
                  size="sm"
                  variant={match.lineupConfirmed ? "secondary" : "primary"}
                  onClick={() =>
                    updateMatch(match.id, { lineupConfirmed: true })
                  }
                >
                  {match.lineupConfirmed
                    ? "Tallennettu"
                    : "Tallenna kokoonpano"}
                </Button>
              </div>
            </div>
            <div
              onDrop={handleLineupDrop}
              onDragOver={(e) => e.preventDefault()}
              onDragEnter={() => setIsDragOverLineup(true)}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node))
                  setIsDragOverLineup(false);
              }}
              className={`min-h-64 rounded-xl transition-colors ${
                isDragOverLineup ? "bg-gray-100 dark:bg-slate-800 ring-2 ring-brand-300" : ""
              }`}
            >
              {lineupPlayers.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl flex items-center justify-center">
                  <p className="text-sm text-gray-400 dark:text-slate-500">
                    Vedä tai klikkaa pelaajia tähän.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {lineupPlayers.map((p) => (
                    <PlayerCard
                      key={p.id}
                      player={p}
                      gamesPlayedPct={getPlayerParticipation(p.id, matches)}
                      availability={getAvailability(p.id)}
                      onAvailabilityChange={(status) =>
                        setAvailability(p.id, status)
                      }
                      onTransfer={() => toggleLineup(p.id)}
                      conflictOpponent={sameDayConflicts[p.id]}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
