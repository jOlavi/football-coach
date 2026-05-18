import { useState, useMemo, useEffect } from 'react';
import { Copy, Check, MessageSquare } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import { useTeamStore } from '../store/useTeamStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import type { Match, Player, OwnTeam } from '../types';

const FI_DAYS = ['Sunnuntai', 'Maanantai', 'Tiistai', 'Keskiviikko', 'Torstai', 'Perjantai', 'Lauantai'];

function generateMessage(team: OwnTeam, matches: Match[], players: Player[]): string {
  if (matches.length === 0) return '';

  const lines: string[] = [];
  lines.push(`⚽ ${team.name} – Kokoonpanoilmoitus`);
  lines.push('');

  // Group by date
  const byDate: Record<string, Match[]> = {};
  for (const m of [...matches].sort((a, b) => a.date.localeCompare(b.date))) {
    const date = m.date.slice(0, 10);
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(m);
  }

  for (const [date, dayMatches] of Object.entries(byDate)) {
    const d = new Date(date + 'T12:00:00');
    const taso = dayMatches[0]?.teamLevel;

    lines.push(`📅 ${FI_DAYS[d.getDay()]} ${format(d, 'dd.MM.yyyy')}${taso ? ` · ${taso === 'taso1' ? 'Taso 1' : 'Taso 2'}` : ''}`);
    lines.push('');

    for (const m of [...dayMatches].sort((a, b) => a.date.localeCompare(b.date))) {
      const time = format(new Date(m.date), 'HH:mm');
      const loc = m.location === 'home' ? 'Kotipeli' : 'Vieraspeli';
      const matchup = m.location === 'home'
        ? `${team.name} – ${m.opponent}`
        : `${m.opponent} – ${team.name}`;
      lines.push(`🕐 ${time}  ${matchup}  (${loc})`);
    }

    lines.push('');

    const lineupIds = [...new Set(dayMatches.flatMap((m) => m.lineup))];
    if (lineupIds.length > 0) {
      const lineupPlayers = lineupIds
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => p != null);
      lines.push('Pelaajat:');
      lines.push(lineupPlayers.map((p) => p.name).join(', '));
    } else {
      lines.push('Pelaajat: (kokoonpanoa ei ole asetettu)');
    }

    lines.push('');
    lines.push('─────────────────────');
    lines.push('');
  }

  // Remove trailing separator
  while (lines[lines.length - 1] === '' || lines[lines.length - 1] === '─────────────────────') lines.pop();

  lines.push('');
  lines.push('Hyvää peliä! 💪');

  return lines.join('\n');
}

export function Communication() {
  const players = usePlayerStore((s) => s.players);
  const matches = useMatchStore((s) => s.matches);
  const teams = useTeamStore((s) => s.teams);

  const upcomingMatches = useMemo(() =>
    matches
      .filter((m) => !m.result)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [matches]
  );

  const [selectedTeamId, setSelectedTeamId] = useState<string>(teams[0]?.id ?? '');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [editedMessage, setEditedMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const teamMatches = useMemo(() =>
    upcomingMatches.filter((m) => m.ownTeamId === selectedTeamId),
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
    setSelectedDate(matchesByDate[0]?.[0] ?? '');
  }, [selectedTeamId]);

  const selectedDayMatches = matchesByDate.find(([d]) => d === selectedDate)?.[1] ?? [];
  const message = selectedTeam && selectedDayMatches.length > 0
    ? generateMessage(selectedTeam, selectedDayMatches, players)
    : '';

  useEffect(() => {
    setEditedMessage(message);
  }, [message]);

  function copyToClipboard() {
    navigator.clipboard.writeText(editedMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-5">

      {/* Team selector pills */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {teams.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTeamId(t.id)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                selectedTeamId === t.id
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-gray-200 dark:border-slate-600 hover:border-brand-400'
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Left: event list */}
        <div className="space-y-2">
          <h2 className="font-semibold text-gray-900 dark:text-slate-100">
            {selectedTeam ? `${selectedTeam.name} – tapahtumat` : 'Valitse joukkue'}
          </h2>

          {teamMatches.length === 0 && (
            <Card>
              <p className="text-sm text-gray-400 dark:text-slate-500 py-4 text-center">
                Ei tulevia otteluita tälle joukkueelle.
              </p>
            </Card>
          )}

          {matchesByDate.map(([date, dayMatches]) => {
            const d = new Date(date + 'T12:00:00');
            const selected = selectedDate === date;
            const lineupIds = [...new Set(dayMatches.flatMap((m) => m.lineup))];
            const taso = dayMatches[0]?.teamLevel;

            return (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                  selected
                    ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-gray-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-semibold text-sm ${selected ? 'text-indigo-700 dark:text-indigo-300' : 'text-gray-900 dark:text-slate-100'}`}>
                      {FI_DAYS[d.getDay()]} {format(d, 'dd.MM.yyyy')}
                      {taso && <span className="ml-2 text-xs font-normal text-gray-400 dark:text-slate-500">{taso === 'taso1' ? 'Taso 1' : 'Taso 2'}</span>}
                    </p>
                    <div className="mt-1 space-y-0.5">
                      {[...dayMatches].sort((a, b) => a.date.localeCompare(b.date)).map((m) => (
                        <p key={m.id} className="text-xs text-gray-500 dark:text-slate-400">
                          {format(new Date(m.date), 'HH:mm')} · {m.location === 'home' ? `${selectedTeam?.name} – ${m.opponent}` : `${m.opponent} – ${selectedTeam?.name}`}
                        </p>
                      ))}
                    </div>
                  </div>
                  <span className={`text-xs font-medium shrink-0 ${lineupIds.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-500'}`}>
                    {lineupIds.length > 0 ? `${lineupIds.length} pelaajaa` : 'Ei kokoonpanoa'}
                  </span>
                </div>

                {lineupIds.length > 0 && (
                  <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 leading-relaxed">
                    {lineupIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean).join(', ')}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: generated message */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-brand-600" />
              <h2 className="font-semibold text-gray-900 dark:text-slate-100">Viesti</h2>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              onClick={copyToClipboard}
              disabled={!editedMessage}
            >
              {copied ? 'Kopioitu!' : 'Kopioi'}
            </Button>
          </div>

          <textarea
            className="w-full whitespace-pre-wrap text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 font-sans leading-relaxed min-h-[300px] resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:focus:ring-indigo-500"
            value={editedMessage || ''}
            onChange={(e) => setEditedMessage(e.target.value)}
            placeholder="Valitse tapahtuma vasemmalta."
          />
          <p className="text-xs text-gray-400 dark:text-slate-500">
            Kopioi ja liitä WhatsAppiin tai muuhun viestintäkanavaan.
          </p>
        </div>
      </div>
    </div>
  );
}
