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

  // Build lineup for next period — start from previous period's on-field players
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

    // Save player minutes as notes or extended data — update match with final player times
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
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <p className="text-gray-400">Ei aktiivista ottelua.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 dark:bg-slate-900 pb-10">
      {/* Header */}
      <div className="bg-amber-600 text-white px-4 pt-10 pb-5">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-amber-100 mb-3 min-h-[48px]"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Takaisin</span>
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Erätauko</h1>
            <p className="text-amber-100 text-sm mt-0.5">
              {currentPeriod}. erä päättyi
              {!isFinalBreak && ` · Seuraava: ${currentPeriod + 1}. erä`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-amber-100 text-xs mb-1">Tulos</p>
            <p className="text-3xl font-bold tabular-nums">
              {session.scores.home} – {session.scores.away}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">

        {/* Player time summary */}
        <section>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Pelaajaminuutit — {currentPeriod}. erä
          </p>
          <div className="grid grid-cols-3 gap-2">
            {players.map((p) => {
              const wasOnField = session.players.find((sp) => sp.id === p.id)?.onField;
              return (
                <div
                  key={p.id}
                  className={`rounded-xl border p-3 ${
                    wasOnField
                      ? 'border-amber-300 bg-amber-100/70 dark:bg-amber-900/20 dark:border-amber-700'
                      : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-60'
                  }`}
                >
                  <p className="text-xs text-gray-400 dark:text-slate-500 font-bold">#{p.number}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight mt-0.5">{p.name}</p>
                  {p.isGoalkeeper && (
                    <span className="inline-block text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1 mt-0.5">MV</span>
                  )}
                  <p className="text-xs font-mono text-amber-700 dark:text-amber-400 mt-1">
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
              <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">
                Kokoonpano — {currentPeriod + 1}. erä
              </p>
              <span className={`text-sm font-bold ${selectedIds.length === required ? 'text-brand-600' : 'text-amber-500'}`}>
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
                    className={`relative rounded-xl border-2 p-3 transition-all ${
                      onField
                        ? isGK
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 opacity-50'
                    }`}
                  >
                    <button onClick={() => togglePlayer(p.id)} className="w-full text-left min-h-[48px]">
                      <p className="text-xs font-bold text-gray-400 dark:text-slate-500">#{p.number}</p>
                      <p className={`text-sm font-semibold leading-tight mt-0.5 ${onField ? 'text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
                        {p.name}
                      </p>
                      <p className="text-xs font-mono text-gray-400 dark:text-slate-500 mt-0.5">
                        {fmtTime(p.accumulatedSeconds)}
                      </p>
                      {isGK && (
                        <span className="inline-block mt-1 text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1.5 py-0.5">MV</span>
                      )}
                    </button>
                    {onField && (
                      <button
                        onClick={() => toggleGK(p.id)}
                        className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                          isGK
                            ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                            : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-400'
                        }`}
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
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {isFinalBreak ? (
          <button
            onClick={handleFinish}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px]"
          >
            Lopeta ottelu ja tallenna tulos
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px]"
          >
            <Check size={20} />
            Aloita {currentPeriod + 1}. erä
          </button>
        )}
      </div>
    </div>
  );
}
