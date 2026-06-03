import { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { useMatchStore } from '../store/useMatchStore';
import type { MatchSessionState, MatchPlayer } from '../types/matchSession';
import { FORMAT_SIZES, fmtTime } from '../types/matchSession';

export function MatchBreak() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: matchId } = useParams<{ id: string }>();
  const { updateMatch, setResult } = useMatchStore();

  const session = location.state as MatchSessionState | null;
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
    };

    navigate(`/matches/${matchId}/live`, { state: nextSession });
  }

  async function handleFinish() {
    const scores = session!.scores;
    const isHome = config?.location === 'home';
    const goalsFor = isHome ? scores.home : scores.away;
    const goalsAgainst = isHome ? scores.away : scores.home;

    setResult(matchId!, { goalsFor, goalsAgainst, scorers: [] });

    updateMatch(matchId!, {
      lineupConfirmed: true,
      notes: [
        `Tulos: ${goalsFor}–${goalsAgainst}`,
        `Pelaajaminuutit:`,
        ...(session?.players ?? []).map(
          (p) => `  ${p.name}: ${Math.floor(p.accumulatedSeconds / 60)} min`
        ),
      ].join('\n'),
    });

    navigate('/matches');
  }

  if (!session || !config) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)' }}>
        <p style={{ color: 'var(--match-text-muted)' }}>Ei aktiivista ottelua.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: 'var(--match-dark)' }}>
      {/* Header */}
      <div className="px-4 pt-10 pb-5" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-3 min-h-[48px]"
          style={{ color: 'var(--match-text-muted)' }}
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Takaisin</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--match-text-primary)' }}>Erätauko</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--match-text-muted)' }}>
              {currentPeriod}. erä päättyi
              {!isFinalBreak && ` · Seuraava: ${currentPeriod + 1}. erä`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: 'var(--match-text-muted)' }}>Tulos</p>
            <p className="text-3xl font-bold tabular-nums" style={{ color: 'var(--match-text-primary)' }}>
              {session.scores.home} – {session.scores.away}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">

        {/* Player time summary */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>
            Pelaajaminuutit — {currentPeriod}. erä
          </p>
          <div className="grid grid-cols-3 gap-2">
            {players.map((p) => {
              const wasOnField = session.players.find((sp) => sp.id === p.id)?.onField;
              return (
                <div
                  key={p.id}
                  className="rounded-xl border p-3"
                  style={
                    wasOnField
                      ? { borderColor: 'var(--match-field-border)', backgroundColor: 'var(--match-field-bg)' }
                      : { borderColor: '#334155', backgroundColor: 'var(--match-dark-mid)', opacity: 0.6 }
                  }
                >
                  <p className="text-xs font-bold" style={{ color: wasOnField ? 'var(--match-field-num)' : 'var(--match-text-muted)' }}>#{p.number}</p>
                  <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: wasOnField ? 'var(--match-field-name)' : 'var(--match-text-muted)' }}>{p.name}</p>
                  {p.isGoalkeeper && (
                    <span className="inline-block text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1 mt-0.5">MV</span>
                  )}
                  <p className="text-xs font-mono mt-1" style={{ color: 'var(--match-active)' }}>
                    {fmtTime(p.accumulatedSeconds)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

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
                          ? { borderColor: '#facc15', backgroundColor: '#fefce8' }
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
                        <span className="inline-block mt-1 text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1.5 py-0.5">MV</span>
                      )}
                    </button>
                    {onField && (
                      <button
                        onClick={() => toggleGK(p.id)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors"
                        style={
                          isGK
                            ? { backgroundColor: '#facc15', borderColor: '#facc15', color: '#713f12' }
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
