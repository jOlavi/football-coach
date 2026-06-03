import { useState, useMemo } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useMatchStore } from '../store/useMatchStore';
import type { Match, TeamFormat } from '../types';
import type { MatchPlayer, MatchSessionState } from '../types/matchSession';
import { FORMAT_SIZES } from '../types/matchSession';

const FORMAT_OPTIONS: TeamFormat[] = ['5v5', '7v7', '8v8', '11v11'];

export function MatchSetup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: matchId } = useParams<{ id: string }>();

  const allPlayers = usePlayerStore((s) => s.players);
  const storeMatch = useMatchStore((s) => s.matches.find((m) => m.id === matchId));
  const match: Match | undefined = (location.state as { match?: Match })?.match ?? storeMatch;

  const [format, setFormat] = useState<TeamFormat>((match?.format ?? '7v7') as TeamFormat);
  const [periods, setPeriods] = useState(2);
  const [periodLength, setPeriodLength] = useState(15);

  const pool = useMemo(() => {
    const lineup = match?.lineup ?? [];
    const source = lineup.length > 0
      ? allPlayers.filter((p) => lineup.includes(p.id))
      : allPlayers.filter((p) => p.active);
    return [...source].sort((a, b) => a.number - b.number);
  }, [match, allPlayers]);

  const required = FORMAT_SIZES[format];

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const initial = pool.slice(0, required).map((p) => p.id);
    return initial;
  });
  const [goalkeeperIdState, setGoalkeeperIdState] = useState<string | null>(null);
  const [error, setError] = useState('');

  const goalkeeper = goalkeeperIdState;

  function handleFormatChange(f: TeamFormat) {
    const newRequired = FORMAT_SIZES[f];
    setFormat(f);
    setSelectedIds((prev) => {
      if (prev.length <= newRequired) return prev;
      // deselect from bench first (those not matching goalkeeper)
      const trimmed = prev.slice(0, newRequired);
      return trimmed;
    });
    setGoalkeeperIdState((prev) =>
      prev && selectedIds.slice(0, newRequired).includes(prev) ? prev : null
    );
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        if (goalkeeperIdState === id) setGoalkeeperIdState(null);
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= required) return prev; // already full
      return [...prev, id];
    });
    setError('');
  }

  function toggleGK(id: string) {
    if (!selectedIds.includes(id)) return;
    setGoalkeeperIdState((prev) => (prev === id ? null : id));
  }

  function handleStart() {
    if (selectedIds.length !== required) {
      setError(`Valitse tasan ${required} pelaajaa kentälle (nyt ${selectedIds.length}/${required})`);
      return;
    }
    if (!goalkeeper) {
      setError('Valitse maalivahti ennen aloitusta');
      return;
    }
    setError('');

    const players: MatchPlayer[] = pool.map((p) => ({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position,
      accumulatedSeconds: 0,
      onField: selectedIds.includes(p.id),
      isGoalkeeper: p.id === goalkeeper,
    }));

    const session: MatchSessionState = {
      config: {
        matchId: matchId!,
        format,
        periods,
        periodLength,
        location: match?.location ?? 'home',
        opponent: match?.opponent ?? 'Vastustaja',
      },
      currentPeriod: 1,
      scores: { home: 0, away: 0 },
      players,
      substitutions: [],
      periodHistory: [],
      matchSeconds: 0,
    };

    navigate(`/matches/${matchId}/live`, { state: session });
  }

  if (!match && !matchId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <p className="text-gray-400">Ottelua ei löydy</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 pb-10">
      {/* Header */}
      <div className="bg-brand-700 text-white px-4 pt-12 pb-6">
        <button
          onClick={() => navigate('/matches')}
          className="flex items-center gap-2 text-green-200 mb-4 min-h-[48px]"
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Takaisin</span>
        </button>
        <h1 className="text-xl font-bold">Pelinhallinta – asetukset</h1>
        <p className="text-green-200 text-sm mt-1">
          vs {match?.opponent ?? '—'} · {match?.venue ?? ''}
        </p>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        {/* Format */}
        <section>
          <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Formaatti</p>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormatChange(f)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors min-h-[48px] ${
                  format === f
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border-gray-200 dark:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Periods */}
        <section className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Eriä</p>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
              <button onClick={() => setPeriods((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xl font-bold flex items-center justify-center">−</button>
              <span className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-slate-100">{periods}</span>
              <button onClick={() => setPeriods((p) => Math.min(4, p + 1))} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xl font-bold flex items-center justify-center">+</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-2">Erän pituus (min)</p>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-3">
              <button onClick={() => setPeriodLength((p) => Math.max(5, p - 5))} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xl font-bold flex items-center justify-center">−</button>
              <span className="flex-1 text-center text-xl font-bold text-gray-900 dark:text-slate-100">{periodLength}</span>
              <button onClick={() => setPeriodLength((p) => Math.min(60, p + 5))} className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 text-xl font-bold flex items-center justify-center">+</button>
            </div>
          </div>
        </section>

        {/* Player selection */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Aloituskokoonpano</p>
            <span className={`text-sm font-bold ${selectedIds.length === required ? 'text-brand-600' : 'text-amber-500'}`}>
              {selectedIds.length} / {required} valittu
            </span>
          </div>
          <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">Valitse {required} kenttäpelaajaa · merkitse MV-napilla maalivahti</p>
          <div className="grid grid-cols-3 gap-2">
            {pool.map((p) => {
              const onField = selectedIds.includes(p.id);
              const isGK = goalkeeper === p.id;
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
                  <button
                    onClick={() => togglePlayer(p.id)}
                    className="w-full text-left min-h-[48px]"
                  >
                    <p className="text-xs font-bold text-gray-400 dark:text-slate-500">#{p.number}</p>
                    <p className={`text-sm font-semibold leading-tight mt-0.5 ${onField ? 'text-gray-900 dark:text-slate-100' : 'text-gray-500 dark:text-slate-400'}`}>
                      {p.name}
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
                          : 'bg-white dark:bg-slate-700 border-gray-300 dark:border-slate-500 text-gray-400 dark:text-slate-500'
                      }`}
                      title="Merkitse maalivahdiksi"
                    >
                      MV
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px]"
        >
          <Check size={20} />
          Aloita ottelu
        </button>
      </div>
    </div>
  );
}
