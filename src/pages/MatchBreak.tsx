import { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useMatchStore } from '../store/useMatchStore';
import { useTournamentStore } from '../store/useTournamentStore';
import type { MatchSessionState, MatchPlayer } from '../types/matchSession';
import { FORMAT_SIZES, fmtTime } from '../types/matchSession';

export function MatchBreak() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: matchId } = useParams<{ id: string }>();
  const { updateMatch } = useMatchStore();
  const { updateTournamentMatch } = useTournamentStore();

  const session = location.state as (MatchSessionState & { tournamentId?: string }) | null;
  const tournamentId = session?.tournamentId;
  const config = session?.config;
  const currentPeriod = session?.currentPeriod ?? 1;
  const isFinalBreak = currentPeriod >= (config?.periods ?? 2);

  const [selectedIds, setSelectedIds] = useState<string[]>(
    () => session?.players.filter((p) => p.onField).map((p) => p.id) ?? []
  );
  const [goalkeeperIdState, setGoalkeeperIdState] = useState<string | null>(
    () => session?.players.find((p) => p.isGoalkeeper)?.id ?? null
  );
  const [error, setError] = useState('');

  const required = FORMAT_SIZES[config?.format ?? '7v7'];

  const players = useMemo(
    () =>
      [...(session?.players ?? [])].sort(
        (a, b) => b.accumulatedSeconds - a.accumulatedSeconds
      ),
    [session?.players]
  );

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (goalkeeperIdState === id) setGoalkeeperIdState(null);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= required) return prev;
      return [...prev, id];
    });
    setError('');
  }

  function toggleGK(id: string) {
    if (!selectedIds.includes(id)) return;
    setGoalkeeperIdState((prev) => (prev === id ? null : id));
  }

  function handleNext() {
    if (selectedIds.length !== required) {
      setError(`Valitse tasan ${required} pelaajaa (nyt ${selectedIds.length}/${required})`);
      return;
    }
    if (!goalkeeperIdState) {
      setError('Valitse maalivahti ennen jatkamista');
      return;
    }
    setError('');

    const updatedPlayers: MatchPlayer[] = (session?.players ?? []).map((p) => ({
      ...p,
      onField: selectedIds.includes(p.id),
      isGoalkeeper: p.id === goalkeeperIdState,
    }));

    const nextSession: MatchSessionState = {
      config: config!,
      currentPeriod: currentPeriod + 1,
      scores: session!.scores,
      players: updatedPlayers,
      substitutions: session!.substitutions,
      periodHistory: [
        ...session!.periodHistory,
        {
          period: currentPeriod,
          scores: session!.scores,
          playerSeconds: Object.fromEntries(
            (session?.players ?? []).map((p) => [p.id, p.accumulatedSeconds])
          ),
        },
      ],
      matchSeconds: session!.matchSeconds,
      periodSeconds: 0,
      goalEntries: session!.goalEntries,
      opponentGoalTimes: session!.opponentGoalTimes,
    };

    navigate(`/matches/${matchId}/live`, { state: nextSession });
  }

  async function handleFinish() {
    const scores = session!.scores;
    const isHome = config?.location === 'home';
    const goalsFor = isHome ? scores.home : scores.away;
    const goalsAgainst = isHome ? scores.away : scores.home;

    const playerMinutes: Record<string, number> = {};
    for (const p of session?.players ?? []) {
      playerMinutes[p.id] = p.accumulatedSeconds;
    }

    const scorerCounts: Record<string, number> = {};
    for (const entry of session?.goalEntries ?? []) {
      scorerCounts[entry.playerId] = (scorerCounts[entry.playerId] ?? 0) + 1;
    }
    const scorers = Object.entries(scorerCounts).map(([playerId, count]) => ({ playerId, count }));

    if (tournamentId && matchId) {
      updateTournamentMatch(tournamentId, matchId, {
        result: { goalsFor, goalsAgainst },
      });
      navigate('/matches?tab=tournaments');
    } else {
      updateMatch(matchId!, {
        lineupConfirmed: true,
        result: { goalsFor, goalsAgainst, scorers },
        playerMinutes,
      });
      navigate('/matches');
    }
  }

  if (!session || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)' }}>
        <p style={{ color: 'var(--match-text-muted)' }}>Ei aktiivista ottelua.</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-10" style={{ backgroundColor: 'var(--match-dark)' }}>
      {/* Header */}
      <div className="px-3 pt-10 pb-3" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <div className="relative flex items-center justify-center min-h-[48px]">
          <button
            onClick={() => navigate(`/matches/${matchId}/live`, { state: session, replace: true })}
            className="absolute left-0 flex items-center gap-1.5 min-h-[48px]"
            style={{ color: 'var(--match-text-muted)' }}
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Takaisin</span>
          </button>
          <div className="text-center px-20">
            <h1 className="text-base font-bold" style={{ color: 'var(--match-text-primary)' }}>
              {isFinalBreak ? 'Ottelu päättyi' : 'Erätauko'}
            </h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--match-text-muted)' }}>
              {currentPeriod}. erä päättyi
            </p>
          </div>
          <div className="absolute right-0 text-right">
            <p className="text-xs" style={{ color: 'var(--match-text-muted)' }}>Tulos</p>
            <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--match-text-primary)' }}>
              {session.scores.home}–{session.scores.away}
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 py-4 space-y-5 max-w-lg mx-auto">

        {/* Final summary */}
        {isFinalBreak ? (
          <>
            {/* Result */}
            <section className="rounded-xl py-4 text-center" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--match-text-muted)' }}>
                {(() => {
                  const own = config.teamName ?? 'Oma joukkue';
                  return config.location === 'home' ? `${own} – ${config.opponent}` : `${config.opponent} – ${own}`;
                })()}
              </p>
              <p className="text-5xl font-bold tabular-nums" style={{ color: 'var(--match-text-primary)' }}>
                {session.scores.home}–{session.scores.away}
              </p>
              {(() => {
                const isHome = config.location === 'home';
                const gf = isHome ? session.scores.home : session.scores.away;
                const ga = isHome ? session.scores.away : session.scores.home;
                const label = gf > ga ? 'Voitto' : gf < ga ? 'Tappio' : 'Tasapeli';
                const color = gf > ga ? 'var(--match-active)' : gf < ga ? 'var(--match-out-border)' : '#f59e0b';
                return <p className="text-sm font-bold mt-1" style={{ color }}>{label}</p>;
              })()}
            </section>

            {/* Goals timeline */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>Maalit</p>
              {(() => {
                const ourMap = new Map<string, { name: string; times: number[] }>();
                for (const g of session.goalEntries ?? []) {
                  const name = session.players.find((p) => p.id === g.playerId)?.name ?? 'Tuntematon';
                  if (!ourMap.has(g.playerId)) ourMap.set(g.playerId, { name, times: [] });
                  ourMap.get(g.playerId)!.times.push(g.matchMinute);
                }
                const opponentTimes = [...(session.opponentGoalTimes ?? [])].sort((a, b) => a - b);
                const rows = [
                  ...[...ourMap.values()].map((v) => ({
                    label: v.name,
                    times: [...v.times].sort((a, b) => a - b),
                    ours: true,
                  })),
                  ...(opponentTimes.length > 0 ? [{ label: config?.opponent ?? 'Vastustaja', times: opponentTimes, ours: false }] : []),
                ].sort((a, b) => a.times[0] - b.times[0]);
                if (rows.length === 0) return (
                  <p className="text-sm py-2" style={{ color: 'var(--match-text-muted)' }}>Ei kirjattuja maaleja</p>
                );
                return rows.map((row, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b" style={{ borderColor: 'var(--match-border)' }}>
                    <span className="text-base">{row.ours ? '⚽' : '🔴'}</span>
                    <span className="text-sm font-medium" style={{ color: row.ours ? 'var(--match-field-name)' : 'var(--match-out-text)' }}>{row.label}</span>
                    {row.times.length > 1 && (
                      <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0" style={{ backgroundColor: row.ours ? 'var(--match-active)' : 'var(--match-out-border)', color: '#fff' }}>
                        {row.times.length}
                      </span>
                    )}
                    <span className="flex-1 text-right text-xs font-mono font-semibold" style={{ color: 'var(--match-text-muted)' }}>{row.times.map((t) => `${t}'`).join(', ')}</span>
                  </div>
                ));
              })()}
            </section>

            {/* Player times — ranked list with bar */}
            <section>
              <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--match-text-muted)' }}>Peliajat</p>
              {(() => {
                const maxSeconds = (config?.periods ?? 2) * (config?.periodLength ?? 15) * 60;
                return [...players]
                  .sort((a, b) => b.accumulatedSeconds - a.accumulatedSeconds)
                  .map((p) => {
                    const pct = maxSeconds > 0 ? Math.min(100, (p.accumulatedSeconds / maxSeconds) * 100) : 0;
                    return (
                      <div key={p.id} className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold w-6 text-right flex-shrink-0" style={{ color: 'var(--match-text-muted)' }}>#{p.number}</span>
                        <span className="text-sm font-medium w-24 truncate flex-shrink-0" style={{ color: 'var(--match-text-primary)' }}>{p.name}</span>
                        <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--match-border)' }}>
                          <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 0 ? 'var(--match-active)' : 'transparent' }} />
                        </div>
                        <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: 'var(--match-active)' }}>{fmtTime(p.accumulatedSeconds)}</span>
                      </div>
                    );
                  });
              })()}
            </section>
          </>
        ) : (
          /* Player time summary for mid-game breaks */
          <section>
            <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--match-text-muted)' }}>
              Peliajat — {currentPeriod}. erä
            </p>
            {(() => {
              const maxSeconds = currentPeriod * (config?.periodLength ?? 15) * 60;
              return [...players]
                .sort((a, b) => b.accumulatedSeconds - a.accumulatedSeconds)
                .map((p) => {
                  const wasOnField = session.players.find((sp) => sp.id === p.id)?.onField;
                  const pct = maxSeconds > 0 ? Math.min(100, (p.accumulatedSeconds / maxSeconds) * 100) : 0;
                  return (
                    <div key={p.id} className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold w-6 text-right flex-shrink-0" style={{ color: wasOnField ? 'var(--match-field-num)' : 'var(--match-text-muted)' }}>#{p.number}</span>
                      <span className="text-sm font-medium w-24 truncate flex-shrink-0" style={{ color: wasOnField ? 'var(--match-text-primary)' : 'var(--match-text-muted)' }}>{p.name}</span>
                      <div className="flex-1 rounded-full h-2" style={{ backgroundColor: 'var(--match-border)' }}>
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 0 ? 'var(--match-active)' : 'transparent' }} />
                      </div>
                      <span className="text-xs font-mono w-10 text-right flex-shrink-0" style={{ color: wasOnField ? 'var(--match-active)' : 'var(--match-text-muted)' }}>{fmtTime(p.accumulatedSeconds)}</span>
                    </div>
                  );
                });
            })()}
          </section>
        )}

        {/* Next lineup (only if not final) */}
        {!isFinalBreak && (
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--match-text-muted)' }}>
                Kokoonpano — {currentPeriod + 1}. erä
              </p>
              <span className="text-sm font-bold" style={{ color: selectedIds.length === required ? 'var(--match-active)' : '#f59e0b' }}>
                {selectedIds.length} / {required} valittu
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {players.map((p) => {
                const onField = selectedIds.includes(p.id);
                const isGK = goalkeeperIdState === p.id;
                return (
                  <div
                    key={p.id}
                    className="relative rounded-xl border-2 p-3 transition-all"
                    style={
                      onField
                        ? isGK
                          ? { borderColor: '#facc15', backgroundColor: 'var(--match-field-bg)' }
                          : { borderColor: 'var(--match-field-border)', backgroundColor: 'var(--match-field-bg)' }
                        : { borderColor: '#334155', backgroundColor: 'var(--match-dark-mid)' }
                    }
                  >
                    <button onClick={() => togglePlayer(p.id)} className="w-full text-left min-h-[48px]">
                      <p className="text-xs font-bold" style={{ color: onField ? 'var(--match-field-num)' : 'var(--match-text-muted)' }}>#{p.number}</p>
                      <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: onField ? 'var(--match-field-name)' : 'var(--match-text-muted)' }}>
                        {p.name}
                      </p>
                      <p className="text-xs font-mono mt-0.5" style={{ color: onField ? 'var(--match-active)' : 'var(--match-text-muted)' }}>
                        {fmtTime(p.accumulatedSeconds)}
                      </p>
                      {isGK && (
                        <span className="inline-block mt-1 text-xs font-bold rounded px-1 border" style={{ backgroundColor: 'transparent', borderColor: '#facc15', color: '#facc15' }}>MV</span>
                      )}
                    </button>
                    {onField && (
                      <button
                        onClick={() => toggleGK(p.id)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors"
                        style={
                          isGK
                            ? { backgroundColor: 'transparent', borderColor: '#facc15', color: '#facc15' }
                            : { backgroundColor: 'var(--match-dark)', borderColor: '#334155', color: 'var(--match-text-muted)' }
                        }
                      >
                        MV
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: 'var(--match-out-bg)', borderColor: 'var(--match-out-border)' }}>
            <AlertCircle size={16} style={{ color: 'var(--match-out-border)' }} className="shrink-0" />
            <p className="text-sm" style={{ color: 'var(--match-out-text)' }}>{error}</p>
          </div>
        )}

        {isFinalBreak ? (
          <button
            onClick={handleFinish}
            className="w-full text-white font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px]"
            style={{ backgroundColor: 'var(--match-out-border)' }}
          >
            Lopeta ottelu ja tallenna tulos
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full text-white font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px]"
            style={{ backgroundColor: 'var(--match-active)' }}
          >
            <Check size={20} />
            Aloita {currentPeriod + 1}. erä
          </button>
        )}
      </div>
    </div>
  );
}
