import { useState, useMemo, useEffect, useRef } from "react";
import { Copy, Check, Trophy } from "lucide-react";
import { usePlayerStore } from "../store/usePlayerStore";
import { useMatchStore } from "../store/useMatchStore";
import { useTeamStore } from "../store/useTeamStore";
import { useTournamentStore } from "../store/useTournamentStore";
import { useAppStore } from "../store/useAppStore";
import { useCommDraftStore } from "../store/useCommDraftStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { format } from "date-fns";
import type { Match, Player, OwnTeam, Tournament } from "../types";

const FI_DAYS = [
  "Sunnuntai",
  "Maanantai",
  "Tiistai",
  "Keskiviikko",
  "Torstai",
  "Perjantai",
  "Lauantai",
];

function generateMessage(
  team: OwnTeam,
  matches: Match[],
  players: Player[]
): string {
  if (matches.length === 0) return "";

  const lines: string[] = [];
  lines.push(`⚽ ${team.name} – Kokoonpanoilmoitus`);
  lines.push("");

  // Group by date
  const byDate: Record<string, Match[]> = {};
  for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date))) {
    const date = m.date.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
  }

  for (const [date, dayMatches] of Object.entries(byDate)) {
    const d = new Date(date + "T12:00:00");
    const taso = dayMatches[0]?.teamLevel;
    const sorted = [...dayMatches].sort((a, b) => a.date.localeCompare(b.date));
    const firstMatch = sorted[0];
    lines.push(`📅 ${FI_DAYS[d.getDay()]} ${format(d, "dd.MM.yyyy")}`);
    if (taso) lines.push(`🏅 ${taso === "taso1" ? "Taso 1" : "Taso 2"}`);
    lines.push(`⚽ ${team.name}`);
    if (firstMatch.venue)
      lines.push(`📍 ${firstMatch.address ? `${firstMatch.address}` : ""}`);
    lines.push("");

    const lineupIds = [...new Set(dayMatches.flatMap((m) => m.lineup))];
    if (lineupIds.length > 0) {
      const lineupPlayers = lineupIds
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => p != null);
      lines.push("Pelaajat:");
      lines.push(lineupPlayers.map((p) => p.name).join(", "));
    } else {
      lines.push("Pelaajat: (kokoonpanoa ei ole asetettu)");
    }

    lines.push("");

    for (const m of sorted) {
      const time = format(new Date(m.date), "HH:mm");
      const matchup =
        m.location === "home"
          ? `${team.name} vs ${m.opponent}`
          : `${m.opponent} vs ${team.name}`;
      lines.push(`🕐 ${time} - ${matchup}${m.venue ? ` - ${m.venue}` : ""}`);
    }

    lines.push("");
    lines.push("─────────────────────");
    lines.push("");
  }

  // Remove trailing separator
  while (
    lines[lines.length - 1] === "" ||
    lines[lines.length - 1] === "─────────────────────"
  )
    lines.pop();

  lines.push("");
  lines.push("Hyvää peliä! 💪");

  return lines.join("\n");
}

function generateTournamentMessage(
  tournament: Tournament,
  teamName: string,
  players: Player[]
): string {
  const lines: string[] = [];
  lines.push(`🏆 ${tournament.name} – Turnausilmoitus`);
  lines.push("");

  if (tournament.date) {
    const d = new Date(tournament.date + "T12:00:00");
    lines.push(`📅 ${FI_DAYS[d.getDay()]} ${format(d, "dd.MM.yyyy")}`);
  }
  if (tournament.level) lines.push(`🏅 ${tournament.level}`);
  lines.push(`⚽ ${teamName}`);
  if (tournament.venue)
    lines.push(`📍 ${tournament.address ? tournament.address : ""}`);
  lines.push("");

  const lineupIds = tournament.lineup ?? [];
  if (lineupIds.length > 0) {
    const lineupPlayers = lineupIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => p != null);
    lines.push("Pelaajat:");
    lines.push(lineupPlayers.map((p) => p.name).join(", "));
  } else {
    lines.push("Pelaajat: (kokoonpanoa ei ole asetettu)");
  }
  lines.push("");

  const matches = [...(tournament.matches ?? [])].sort((a, b) =>
    (a.time ?? "").localeCompare(b.time ?? "")
  );
  if (matches.length > 0) {
    lines.push("Ottelut:");
    for (const m of matches) {
      const time = m.time ?? "—";
      const matchup =
        m.location === "away"
          ? `${m.opponent} vs ${teamName}`
          : `${teamName} vs ${m.opponent}`;
      lines.push(`🕐 ${time} - ${matchup}${m.field ? ` - ${m.field}` : ""}`);
    }
    lines.push("");
  }

  if (tournament.notes) {
    lines.push(tournament.notes);
    lines.push("");
  }

  lines.push("Hyvää turnausta! 💪");
  return lines.join("\n");
}

export function Communication() {
  const players = usePlayerStore((s) => s.players);
  const allMatches = useMatchStore((s) => s.matches);
  const teams = useTeamStore((s) => s.teams);
  const allTournaments = useTournamentStore((s) => s.tournaments);
  const { activeSeason, seasons } = useAppStore();
  const isFirstSeason = seasons[0] === activeSeason;
  const inSeason = (s?: string) => s === activeSeason || (!s && isFirstSeason);
  const matches = allMatches.filter((m) => inSeason(m.season));
  const tournaments = allTournaments.filter((t) => inSeason(t.season));

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter((m) => !m.result)
        .sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        ),
    [matches]
  );

  const [mode, setMode] = useState<"matches" | "tournaments">("matches");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(
    teams[0]?.id ?? ""
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");
  const [editedMessage, setEditedMessage] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isDraft, setIsDraft] = useState(false);
  const { drafts, saveDraft, deleteDraft } = useCommDraftStore();

  const currentDraftKey = useMemo(() => {
    if (mode === "matches" && selectedTeamId && selectedDate)
      return `match-${selectedTeamId}-${selectedDate}`;
    if (mode === "tournaments" && selectedTournamentId)
      return `tournament-${selectedTournamentId}`;
    return null;
  }, [mode, selectedTeamId, selectedDate, selectedTournamentId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const teamMatches = useMemo(
    () => upcomingMatches.filter((m) => m.ownTeamId === selectedTeamId),
    [upcomingMatches, selectedTeamId]
  );

  const matchesByDate = useMemo(() => {
    const byDate: Record<string, Match[]> = {};
    for (const m of teamMatches) {
      const date = m.date.slice(0, 10);
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(m);
    }
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
  }, [teamMatches]);

  // Auto-select first event when team changes
  useEffect(() => {
    setSelectedDate(matchesByDate[0]?.[0] ?? "");
  }, [selectedTeamId]);

  const teamTournaments = useMemo(
    () =>
      [...tournaments]
        .filter((t) => !t.ownTeamId || t.ownTeamId === selectedTeamId)
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? "")),
    [tournaments, selectedTeamId]
  );

  const selectedTournament = teamTournaments.find(
    (t) => t.id === selectedTournamentId
  );

  useEffect(() => {
    setSelectedTournamentId(teamTournaments[0]?.id ?? "");
  }, [selectedTeamId, mode]);

  const selectedDayMatches =
    matchesByDate.find(([d]) => d === selectedDate)?.[1] ?? [];
  const message =
    mode === "matches"
      ? selectedTeam && selectedDayMatches.length > 0
        ? generateMessage(selectedTeam, selectedDayMatches, players)
        : ""
      : selectedTournament && selectedTeam
      ? generateTournamentMessage(selectedTournament, selectedTeam.name, players)
      : "";

  useEffect(() => {
    if (currentDraftKey) {
      const stored = drafts[currentDraftKey];
      if (stored && stored !== message) {
        setEditedMessage(stored);
        setIsDraft(true);
        return;
      }
    }
    setEditedMessage(message);
    setIsDraft(false);
  }, [message, currentDraftKey]);

  useEffect(() => {
    if (!currentDraftKey) return;
    clearTimeout(saveTimerRef.current);
    if (!editedMessage || editedMessage === message) {
      deleteDraft(currentDraftKey);
      return;
    }
    saveTimerRef.current = setTimeout(() => {
      saveDraft(currentDraftKey, editedMessage);
    }, 1000);
    return () => clearTimeout(saveTimerRef.current);
  }, [editedMessage, currentDraftKey, message]);

  function copyToClipboard() {
    navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      {/* Top bar: controls left, copy button right */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          {/* Mode tabs */}
          <div className="flex p-1.5 rounded-xl bg-gray-200 dark:bg-slate-700 gap-0.5 w-fit">
            <button
              onClick={() => setMode("matches")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "matches"
                  ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              Ottelut
            </button>
            <button
              onClick={() => setMode("tournaments")}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "tournaments"
                  ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 shadow-sm"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              }`}
            >
              <Trophy
                size={14}
                className={
                  mode === "tournaments"
                    ? "text-yellow-500"
                    : "text-gray-400 dark:text-slate-500"
                }
              />
              Turnaukset
            </button>
          </div>

          {/* Team selector pills */}
          {teams.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTeamId(t.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    selectedTeamId === t.id
                      ? "bg-brand-600 text-white border-brand-600"
                      : "bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy button */}
        <Button
          variant="secondary"
          size="sm"
          icon={
            copied ? (
              <Check size={13} className="text-green-500" />
            ) : (
              <Copy size={13} />
            )
          }
          onClick={copyToClipboard}
          disabled={!editedMessage}
        >
          {copied ? "Kopioitu!" : "Kopioi"}
        </Button>
      </div>

      {/* Content grid: both areas start at same level */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: event list */}
        <div className="space-y-2">
          {/* Matches mode */}
          {mode === "matches" && (
            <>
              {teamMatches.length === 0 && (
                <Card>
                  <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">
                    Ei tulevia otteluita tälle joukkueelle.
                  </p>
                </Card>
              )}
              {matchesByDate.map(([date, dayMatches]) => {
                const d = new Date(date + "T12:00:00");
                const selected = selectedDate === date;
                const lineupIds = [
                  ...new Set(dayMatches.flatMap((m) => m.lineup)),
                ];
                const taso = dayMatches[0]?.teamLevel;
                return (
                  <button
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selected
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={`font-semibold text-sm ${
                            selected
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-gray-900 dark:text-slate-100"
                          }`}
                        >
                          {FI_DAYS[d.getDay()]} {format(d, "dd.MM.yyyy")}
                          {taso && (
                            <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">
                              {taso === "taso1" ? "Taso 1" : "Taso 2"}
                            </span>
                          )}
                        </p>
                        <div className="mt-1 space-y-0.5">
                          {[...dayMatches]
                            .sort((a, b) => a.date.localeCompare(b.date))
                            .map((m) => (
                              <p
                                key={m.id}
                                className="text-xs text-gray-500 dark:text-slate-400"
                              >
                                {format(new Date(m.date), "HH:mm")} ·{" "}
                                {m.location === "home"
                                  ? `${selectedTeam?.name} – ${m.opponent}`
                                  : `${m.opponent} – ${selectedTeam?.name}`}
                              </p>
                            ))}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium shrink-0 ${
                          lineupIds.length > 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-amber-500"
                        }`}
                      >
                        {lineupIds.length > 0
                          ? `${lineupIds.length} pelaajaa`
                          : "Ei kokoonpanoa"}
                      </span>
                    </div>
                    {lineupIds.length > 0 && (
                      <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                        {lineupIds
                          .map((id) => players.find((p) => p.id === id)?.name)
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </button>
                );
              })}
            </>
          )}

          {/* Tournaments mode */}
          {mode === "tournaments" && (
            <>
              {teamTournaments.length === 0 && (
                <Card>
                  <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">
                    Ei turnauksia. Luo turnaus Ottelut-sivulla.
                  </p>
                </Card>
              )}
              {teamTournaments.map((t) => {
                const selected = selectedTournamentId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTournamentId(t.id)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                      selected
                        ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Trophy
                        size={16}
                        className={`flex-shrink-0 mt-0.5 ${
                          selected
                            ? "text-yellow-500"
                            : "text-gray-400 dark:text-slate-500"
                        }`}
                      />
                      <div className="min-w-0">
                        <p
                          className={`font-semibold text-sm ${
                            selected
                              ? "text-indigo-700 dark:text-indigo-300"
                              : "text-gray-900 dark:text-slate-100"
                          }`}
                        >
                          {t.name}
                        </p>
                        <div className="mt-0.5 space-y-0.5">
                          {t.date && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {format(
                                new Date(t.date + "T12:00:00"),
                                "dd.MM.yyyy"
                              )}
                            </p>
                          )}
                          {t.venue && (
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {t.venue}
                            </p>
                          )}
                          {t.level && (
                            <p className="text-xs text-gray-400 dark:text-slate-500">
                              {t.level}
                            </p>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {(t.matches ?? []).length > 0 && (
                            <span className="text-xs text-gray-400 dark:text-slate-500">
                              {(t.matches ?? []).length} ottelua
                            </span>
                          )}
                          <span className={`text-xs font-medium ${(t.lineup?.length ?? 0) > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                            {(t.lineup?.length ?? 0) > 0 ? `${t.lineup!.length} pelaajaa` : 'Ei kokoonpanoa'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Right: generated message */}
        <div className="space-y-3">
          <textarea
            className="w-full whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 font-sans leading-relaxed min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500"
            value={editedMessage || ""}
            onChange={(e) => setEditedMessage(e.target.value)}
            placeholder="Valitse tapahtuma vasemmalta."
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-400 dark:text-slate-500">
              Kopioi ja liitä WhatsAppiin tai muuhun viestintäkanavaan.
            </p>
            {isDraft && (
              <p className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
                Muokattu ·{" "}
                <button
                  onClick={() => {
                    if (currentDraftKey) deleteDraft(currentDraftKey);
                    setEditedMessage(message);
                    setIsDraft(false);
                  }}
                  className="text-brand-600 dark:text-brand-400 hover:text-brand-700 underline"
                >
                  Palauta alkuperäinen
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
