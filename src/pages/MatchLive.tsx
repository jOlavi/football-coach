import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { StopCircle } from 'lucide-react';
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

  const handleTick = useCallback(() => {
    setPlayers((prev) =>
      prev.map((p) => p.onField ? { ...p, accumulatedSeconds: p.accumulatedSeconds + 1 } : p)
    );
  }, []);

  const periodLength = config?.periodLength ?? 15;
  const initialMatchSeconds = session?.matchSeconds ?? 0;

  const handlePeriodEnd = useCallback(() => {
    setIsRunning(false);
    setShowPeriodEnd(true);
  }, []);

  const { matchSeconds, periodSeconds, resetPeriodClock } = useMatchTimer(
    isRunning, initialMatchSeconds, periodLength, handlePeriodEnd,
  );
  void resetPeriodClock;

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(handleTick, 1000);
    return () => clearInterval(id);
  }, [isRunning, handleTick]);

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
    setScores((s) => ({ ...s, [team]: Math.max(0, s[team] + delta) }));
  }

  function handlePlayerTap(player: MatchPlayer) {
    if (player.onField) {
      if (pendingSubId) {
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
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, onField: false } : p))
        );
      }
    } else {
      const onFieldCount = players.filter((p) => p.onField).length;
      const required = FORMAT_SIZES[config?.format ?? '7v7'];
      if (onFieldCount < required) {
        setPlayers((prev) =>
          prev.map((p) => (p.id === player.id ? { ...p, onField: true } : p))
        );
      } else {
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)' }}>
        <div className="text-center space-y-4">
          <p style={{ color: 'var(--match-text-muted)' }}>Ei aktiivista ottelua.</p>
          <button onClick={() => navigate('/matches')} style={{ color: 'var(--match-active)' }} className="underline">
            Takaisin otteluihin
          </button>
        </div>
      </div>
    );
  }

  const onFieldPlayers = players.filter((p) => p.onField).sort((a, b) => a.number - b.number);
  const benchPlayers = players.filter((p) => !p.onField).sort((a, b) => a.number - b.number);
  const isHome = config.location === 'home';

  return (
    <div className="min-h-screen flex flex-col select-none" style={{ backgroundColor: 'var(--match-dark)' }}>

      {/* Scoreboard header */}
      <div className="px-4 pt-10 pb-4" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--match-text-muted)' }}>
            {currentPeriod}. erä / {config.periods}
          </span>
          <span className="text-3xl font-mono font-bold tabular-nums" style={{ color: 'var(--match-text-primary)' }}>
            {fmtTime(periodSeconds)}
          </span>
          <span className="text-xs font-mono" style={{ color: 'var(--match-text-muted)' }}>
            ⏱ {fmtTime(matchSeconds)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-6">
          <div className="text-center flex-1">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--match-text-muted)' }}>
              {isHome ? 'Kotijoukkue' : config.opponent}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => scoreChange('home', -1)} className="w-10 h-10 rounded-full text-xl flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-primary)' }}>−</button>
              <span className="text-5xl font-bold w-14 text-center tabular-nums" style={{ color: 'var(--match-text-primary)' }}>{scores.home}</span>
              <button onClick={() => scoreChange('home', 1)} className="w-10 h-10 rounded-full text-white text-xl flex items-center justify-center" style={{ backgroundColor: 'var(--match-active)' }}>+</button>
            </div>
          </div>
          <span className="text-2xl font-bold" style={{ color: 'var(--match-text-muted)' }}>–</span>
          <div className="text-center flex-1">
            <p className="text-xs font-semibold mb-1" style={{ color: 'var(--match-text-muted)' }}>
              {isHome ? config.opponent : 'Kotijoukkue'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => scoreChange('away', -1)} className="w-10 h-10 rounded-full text-xl flex items-center justify-center" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-primary)' }}>−</button>
              <span className="text-5xl font-bold w-14 text-center tabular-nums" style={{ color: 'var(--match-text-primary)' }}>{scores.away}</span>
              <button onClick={() => scoreChange('away', 1)} className="w-10 h-10 rounded-full text-white text-xl flex items-center justify-center" style={{ backgroundColor: 'var(--match-active)' }}>+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="flex-1 px-3 pt-4 pb-24 overflow-y-auto">
        {pendingSubId && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ backgroundColor: 'var(--match-hint-bg)', borderColor: 'var(--match-hint-border)' }}>
            <span className="text-xs" style={{ color: 'var(--match-hint-text)' }}>Vaihto vireillä — valitse kenttäpelaaja joka tulee ulos</span>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
          Kentällä ({onFieldPlayers.length}/{FORMAT_SIZES[config.format]})
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {onFieldPlayers.map((p) => (
            <LivePlayerCard key={p.id} player={p} variant="onField" isPending={false} onTap={() => handlePlayerTap(p)} />
          ))}
        </div>

        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
              Vaihtopenkit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {benchPlayers.map((p) => (
                <LivePlayerCard key={p.id} player={p} variant="bench" isPending={p.id === pendingSubId} onTap={() => handlePlayerTap(p)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-4 py-3 flex gap-3" style={{ backgroundColor: 'var(--match-dark)', borderColor: 'var(--match-border)' }}>
        <button
          onClick={() => { setIsRunning((r) => !r); setShowEndConfirm(false); }}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px]"
          style={{
            backgroundColor: isRunning ? 'var(--match-dark-mid)' : 'var(--match-active)',
            color: isRunning ? 'var(--match-text-primary)' : '#fff',
          }}
        >
          {isRunning ? '⏸ Tauko' : '▶ Jatka'}
        </button>
        <button
          onClick={handleEndPeriod}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px] flex items-center justify-center gap-2"
          style={{
            backgroundColor: showEndConfirm ? 'var(--match-out-border)' : 'var(--match-dark-mid)',
            color: showEndConfirm ? '#fff' : 'var(--match-text-muted)',
          }}
        >
          <StopCircle size={16} />
          {showEndConfirm ? 'Vahvista lopetus' : 'Lopeta erä'}
        </button>
      </div>

      {/* Period end overlay */}
      {showPeriodEnd && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'var(--match-dark)' }}>
          <div className="text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--match-active)' }}>Erä päättyi!</p>
            <p className="text-4xl font-bold" style={{ color: 'var(--match-text-primary)' }}>{currentPeriod}. erä</p>
            <p className="text-sm mt-4" style={{ color: 'var(--match-text-muted)' }}>Siirrytään erätaukoon...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Player card ──────────────────────────────────────────────────────────────

interface LivePlayerCardProps {
  player: MatchPlayer;
  variant: 'onField' | 'bench';
  isPending: boolean;
  onTap: () => void;
}

function LivePlayerCard({ player, variant, isPending, onTap }: LivePlayerCardProps) {
  const mins = Math.floor(player.accumulatedSeconds / 60);
  const secs = player.accumulatedSeconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  let bgColor: string;
  let borderColor: string;
  if (isPending) {
    bgColor = 'var(--match-out-bg)';
    borderColor = 'var(--match-out-border)';
  } else if (variant === 'onField') {
    bgColor = 'var(--match-field-bg)';
    borderColor = 'var(--match-field-border)';
  } else {
    bgColor = 'transparent';
    borderColor = 'var(--match-border)';
  }

  return (
    <button
      onClick={onTap}
      className="w-full rounded-xl p-3 text-left transition-all min-h-[80px] border-2"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: isPending ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-field-num)' : 'var(--match-text-muted)' }}>
          #{player.number}
        </span>
        {player.isGoalkeeper && (
          <span className="text-xs font-bold bg-yellow-400 text-yellow-900 rounded px-1">MV</span>
        )}
      </div>
      <p className="text-sm font-semibold leading-tight" style={{ color: isPending ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-field-name)' : 'var(--match-text-muted)' }}>
        {player.name}
      </p>
      <p className="text-xs mt-1 font-mono tabular-nums" style={{ color: isPending ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-active)' : 'var(--match-text-muted)' }}>
        {timeStr}
      </p>
    </button>
  );
}
