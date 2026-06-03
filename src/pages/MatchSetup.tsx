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
      if (prev.length >= required) return prev;
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)' }}>
        <p style={{ color: 'var(--match-text-muted)' }}>Ottelua ei löydy</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-10" style={{ backgroundColor: 'var(--match-dark)' }}>
      {/* Header */}
      <div className="px-4 pt-12 pb-6" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <button
          onClick={() => navigate('/matches')}
          className="flex items-center gap-2 mb-4 min-h-[48px]"
          style={{ color: 'var(--match-text-muted)' }}
        >
          <ArrowLeft size={20} />
          <span className="text-sm">Takaisin</span>
        </button>
        <h1 className="text-xl font-bold" style={{ color: 'var(--match-text-primary)' }}>Pelinhallinta – asetukset</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--match-text-muted)' }}>
          vs {match?.opponent ?? '—'} · {match?.venue ?? ''}
        </p>
      </div>

      <div className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        {/* Format */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>Formaatti</p>
          <div className="flex gap-2">
            {FORMAT_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => handleFormatChange(f)}
                className="flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors min-h-[48px]"
                style={
                  format === f
                    ? { backgroundColor: 'var(--match-active)', borderColor: 'var(--match-active)', color: '#fff' }
                    : { backgroundColor: 'var(--match-dark-mid)', borderColor: '#334155', color: 'var(--match-text-muted)' }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Periods */}
        <section className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>Eriä</p>
            <div className="flex items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: 'var(--match-dark-mid)', borderColor: '#334155' }}>
              <button onClick={() => setPeriods((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-muted)' }}>−</button>
              <span className="flex-1 text-center text-xl font-bold" style={{ color: 'var(--match-text-primary)' }}>{periods}</span>
              <button onClick={() => setPeriods((p) => Math.min(4, p + 1))} className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--match-active)', color: '#fff' }}>+</button>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>Erän pituus (min)</p>
            <div className="flex items-center gap-3 rounded-xl border p-3" style={{ backgroundColor: 'var(--match-dark-mid)', borderColor: '#334155' }}>
              <button onClick={() => setPeriodLength((p) => Math.max(5, p - 5))} className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-muted)' }}>−</button>
              <span className="flex-1 text-center text-xl font-bold" style={{ color: 'var(--match-text-primary)' }}>{periodLength}</span>
              <button onClick={() => setPeriodLength((p) => Math.min(60, p + 5))} className="w-10 h-10 rounded-lg text-xl font-bold flex items-center justify-center" style={{ backgroundColor: 'var(--match-active)', color: '#fff' }}>+</button>
            </div>
          </div>
        </section>

        {/* Player selection */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--match-text-muted)' }}>Aloituskokoonpano</p>
            <span className="text-sm font-bold" style={{ color: selectedIds.length === required ? 'var(--match-active)' : '#f59e0b' }}>
              {selectedIds.length} / {required} valittu
            </span>
          </div>
          <p className="text-xs mb-3" style={{ color: 'var(--match-text-muted)' }}>Valitse {required} kenttäpelaajaa · merkitse MV-napilla maalivahti</p>
          <div className="grid grid-cols-3 gap-2">
            {pool.map((p) => {
              const onField = selectedIds.includes(p.id);
              const isGK = goalkeeper === p.id;
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
                  <button
                    onClick={() => togglePlayer(p.id)}
                    className="w-full text-left min-h-[48px]"
                  >
                    <p className="text-xs font-bold" style={{ color: onField ? 'var(--match-field-num)' : 'var(--match-text-muted)' }}>#{p.number}</p>
                    <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: onField ? 'var(--match-field-name)' : 'var(--match-text-muted)' }}>
                      {p.name}
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
          <div className="flex items-center gap-2 rounded-xl px-4 py-3 border" style={{ backgroundColor: 'var(--match-out-bg)', borderColor: 'var(--match-out-border)' }}>
            <AlertCircle size={16} style={{ color: 'var(--match-out-border)' }} className="shrink-0" />
            <p className="text-sm" style={{ color: 'var(--match-out-text)' }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full font-bold text-base rounded-xl py-4 flex items-center justify-center gap-2 transition-colors min-h-[56px] text-white"
          style={{ backgroundColor: 'var(--match-active)' }}
        >
          <Check size={20} />
          Aloita ottelu
        </button>
      </div>
    </div>
  );
}
