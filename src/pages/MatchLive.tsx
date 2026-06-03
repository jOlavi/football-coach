import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Minus, Plus, StopCircle, AlertCircle } from 'lucide-react';
import { useMatchTimer } from '../hooks/useMatchTimer';
import type { MatchSessionState, MatchPlayer, SubEntry } from '../types/matchSession';
import { fmtTime, FORMAT_SIZES } from '../types/matchSession';

export function MatchLive() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: matchId } = useParams<{ id: string }>();

  const session = location.state as MatchSessionState | null;

  const [isRunning, setIsRunning] = useState(true);
  const [players, setPlayers] = useState<MatchPlayer[]>(session?.players ?? []);
  const [scores, setScores] = useState(session?.scores ?? { home: 0, away: 0 });
  const [substitutions, setSubstitutions] = useState<SubEntry[]>(session?.substitutions ?? []);
  const [periodHistory] = useState(session?.periodHistory ?? []);
  const [showPeriodEnd, setShowPeriodEnd] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);

  const config = session?.config;
  const currentPeriod = session?.currentPeriod ?? 1;

  // Wake lock
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    async function requestWakeLock() {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch { /* ignore */ }
    }
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
    };
  }, []);

  // Update accumulated player seconds each tick
  const handleTick = useCallback(() => {
    setPlayers((prev) =>
      prev.map((p) =>
        p.onField ? { ...p, accumulatedSeconds: p.accumulatedSeconds + 1 } : p
      )
    );
  }, []);

  const periodLength = config?.periodLength ?? 15;
  const initialMatchSeconds = session?.matchSeconds ?? 0;

  const handlePeriodEnd = useCallback(() => {
    setIsRunning(false);
    setShowPeriodEnd(true);
  }, []);

  const { matchSeconds, periodSeconds, resetPeriodClock } = useMatchTimer(
    isRunning,
    initialMatchSeconds,
    periodLength,
    handlePeriodEnd,
  );

  // Tick players
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(handleTick, 1000);
    return () => clearInterval(id);
  }, [isRunning, handleTick]);

  // Auto-navigate to break after overlay
  useEffect(() => {
    if (!showPeriodEnd) return;
    const t = setTimeout(() => navigateToBreak(), 2000);
    return () => clearTimeout(t);
  }, [showPeriodEnd]); // eslint-disable-line react-hooks/exhaustive-deps

  function navigateToBreak() {
    const updatedSession: MatchSessionState = {
      config: config!,
      currentPeriod,
      scores,
      players,
      substitutions,
      periodHistory,
      matchSeconds,
    };
    navigate(`/matches/${matchId}/break`, { state: updatedSession });
  }

  function scoreChange(team: 'home' | 'away', delta: number) {
    setScores((s) => ({
      ...s,
      [team]: Math.max(0, s[team] + delta),
    }));
  }

  function handlePlayerTap(player: MatchPlayer) {
    if (player.onField) {
      // Tap on-field: select as "out" pending or do nothing if GK
      if (pendingSubId) {
        // Swap bench (pendingSubId) with this on-field player
        const minute = Math.floor(matchSeconds / 60);
        setSubstitutions((s) => [
          ...s,
          { outId: player.id, inId: pendingSubId, matchMinute: minute, period: currentPeriod },
        ]);
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === player.id) return { ...p, onField: false };
            if (p.id === pendingSubId) return { ...p, onField: true };
            return p;
          })
        );
        setPendingSubId(null);
      } else {
        // First tap on field player - mark as out candidate (deselect)
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, onField: false } : p))
        );
      }
    } else {
      // Tap bench player
      const onFieldCount = players.filter((p) => p.onField).length;
      const required = FORMAT_SIZES[config?.format ?? '7v7'];
      if (onFieldCount < required) {
        // Directly add to field
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, onField: true } : p))
        );
      } else {
        // Set as pending sub
        setPendingSubId((prev) => (prev === player.id ? null : player.id));
      }
    }
  }

  function handleEndPeriod() {
    if (showEndConfirm) {
      setShowEndConfirm(false);
      setIsRunning(false);
      navigateToBreak();
    } else {
      setShowEndConfirm(true);
    }
  }

  if (!session || !config) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <p className="text-gray-400">Ei aktiivista ottelua.</p>
          <button onClick={() => navigate('/matches')} className="text-brand-400 underline">Takaisin otteluihin</button>
        </div>
      </div>
    );
  }

  const onFieldPlayers = players.filter((p) => p.onField).sort((a, b) => a.number - b.number);
  const benchPlayers = players.filter((p) => !p.onField).sort((a, b) => a.number - b.number);
  const isHome = config.location === 'home';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col select-none">

      {/* Scoreboard header */}
      <div className="bg-brand-700 px-4 pt-10 pb-4">
        {/* Period + timer row */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-green-200 text-sm font-semibold">
            {currentPeriod}. erä / {config.periods}
          </span>
          <div className="text-center">
            <span className="text-white text-3xl font-mono font-bold tabular-nums">
              {fmtTime(periodSeconds)}
            </span>
          </div>
          <span className="text-green-300 text-xs font-mono">
            ⏱ {fmtTime(matchSeconds)}
          </span>
        </div>

        {/* Score */}
        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <p className="text-green-200 text-xs font-semibold mb-1">{isHome ? 'Kotijoukkue' : config.opponent}</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => scoreChange('home', -1)} className="w-10 h-10 rounded-full bg-green-900/50 text-white text-xl flex items-center justify-center">−</button>
              <span className="text-5xl font-bold text-white w-14 text-center tabular-nums">{scores.home}</span>
              <button onClick={() => scoreChange('home', 1)} className="w-10 h-10 rounded-full bg-green-600 text-white text-xl flex items-center justify-center">+</button>
            </div>
          </div>
          <span className="text-green-400 text-2xl font-bold">–</span>
          <div className="text-center flex-1">
            <p className="text-green-200 text-xs font-semibold mb-1">{isHome ? config.opponent : 'Kotijoukkue'}</p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => scoreChange('away', -1)} className="w-10 h-10 rounded-full bg-green-900/50 text-white text-xl flex items-center justify-center">−</button>
              <span className="text-5xl font-bold text-white w-14 text-center tabular-nums">{scores.away}</span>
              <button onClick={() => scoreChange('away', 1)} className="w-10 h-10 rounded-full bg-green-600 text-white text-xl flex items-center justify-center">+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="flex-1 px-3 pt-4 pb-24 overflow-y-auto">
        {pendingSubId && (
          <div className="mb-3 flex items-center gap-2 bg-amber-900/30 border border-amber-700 rounded-xl px-3 py-2">
            <AlertCircle size={15} className="text-amber-400 shrink-0" />
            <p className="text-amber-300 text-xs">Vaihto vireillä — valitse kenttäpelaaja joka tulee ulos</p>
          </div>
        )}

        {/* On field */}
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
          Kentällä ({onFieldPlayers.length}/{FORMAT_SIZES[config.format]})
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {onFieldPlayers.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              variant="onField"
              isPending={false}
              onTap={() => handlePlayerTap(p)}
            />
          ))}
        </div>

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 px-1">Vaihtopenkit</p>
            <div className="grid grid-cols-3 gap-2">
              {benchPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  variant="bench"
                  isPending={p.id === pendingSubId}
                  onTap={() => handlePlayerTap(p)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-3 flex gap-3">
        <button
          onClick={() => { setIsRunning((r) => !r); setShowEndConfirm(false); }}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px] ${
            isRunning
              ? 'bg-slate-700 text-white'
              : 'bg-amber-600 text-white'
          }`}
        >
          {isRunning ? '⏸ Tauko' : '▶ Jatka'}
        </button>
        <button
          onClick={handleEndPeriod}
          className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px] flex items-center justify-center gap-2 ${
            showEndConfirm
              ? 'bg-red-600 text-white'
              : 'bg-slate-700 text-slate-200'
          }`}
        >
          <StopCircle size={16} />
          {showEndConfirm ? 'Vahvista lopetus' : 'Lopeta erä'}
        </button>
      </div>

      {/* Period end overlay */}
      {showPeriodEnd && (
        <div className="fixed inset-0 bg-slate-900/95 flex items-center justify-center z-50">
          <div className="text-center">
            <p className="text-green-400 text-lg font-semibold mb-2">Erä päättyi!</p>
            <p className="text-white text-4xl font-bold">{currentPeriod}. erä</p>
            <p className="text-slate-400 text-sm mt-4">Siirrytään erätaukoon...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player card ──────────────────────────────────────────────────────────────

interface PlayerCardProps {
  player: MatchPlayer;
  variant: 'onField' | 'bench';
  isPending: boolean;
  onTap: () => void;
}

function PlayerCard({ player, variant, isPending, onTap }: PlayerCardProps) {
  const mins = Math.floor(player.accumulatedSeconds / 60);
  const secs = player.accumulatedSeconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <button
      onClick={onTap}
      className={`w-full rounded-xl p-3 text-left transition-all min-h-[80px] border-2 ${
        isPending
          ? 'border-amber-500 bg-amber-900/30'
          : variant === 'onField'
          ? 'border-brand-500 bg-brand-900/20'
          : 'border-slate-700 bg-slate-800 opacity-60'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-slate-400">#{player.number}</span>
        {player.isGoalkeeper && (
          <span className="text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1">MV</span>
        )}
      </div>
      <p className={`text-sm font-semibold leading-tight ${variant === 'onField' ? 'text-white' : 'text-slate-400'}`}>
        {player.name}
      </p>
      <p className={`text-xs mt-1 font-mono tabular-nums ${variant === 'onField' ? 'text-green-400' : 'text-slate-500'}`}>
        {timeStr}
      </p>
    </button>
  );
}
