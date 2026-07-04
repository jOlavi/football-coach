import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { StopCircle } from 'lucide-react';
import { useMatchTimer } from '../hooks/useMatchTimer';
import type { MatchSessionState, MatchPlayer, SubEntry, GoalEntry } from '../types/matchSession';
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
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>(session?.goalEntries ?? []);
  const [opponentGoalTimes, setOpponentGoalTimes] = useState<number[]>(session?.opponentGoalTimes ?? []);
  const [periodHistory] = useState(session?.periodHistory ?? []);
  const [showPeriodEnd, setShowPeriodEnd] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [pendingOutIds, setPendingOutIds] = useState<string[]>([]);
  const [pendingScorerTeam, setPendingScorerTeam] = useState<'home' | 'away' | null>(null);
  const [selectingNewGk, setSelectingNewGk] = useState(false);

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
  const initialPeriodSeconds = session?.periodSeconds ?? 0;

  const handlePeriodEnd = useCallback(() => {
    setIsRunning(false);
    setShowPeriodEnd(true);
  }, []);

  const { matchSeconds, periodSeconds, resetPeriodClock } = useMatchTimer(
    isRunning, initialMatchSeconds, initialPeriodSeconds, periodLength, handlePeriodEnd,
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
      periodSeconds,
      goalEntries,
      opponentGoalTimes,
    };
    navigate(`/matches/${matchId}/break`, { state: updatedSession });
  }

  const isHome = config?.location === 'home';

  function scoreChange(team: 'home' | 'away', delta: number) {
    const isOurGoal = (isHome && team === 'home') || (!isHome && team === 'away');
    if (delta < 0) {
      setScores((s) => ({ ...s, [team]: Math.max(0, s[team] + delta) }));
      if (!isOurGoal) setOpponentGoalTimes((prev) => prev.slice(0, -1));
      return;
    }
    if (config?.trackScorers && isOurGoal) {
      setPendingScorerTeam(team);
    } else {
      setScores((s) => ({ ...s, [team]: s[team] + 1 }));
      if (!isOurGoal) {
        setOpponentGoalTimes((prev) => [...prev, Math.floor(matchSeconds / 60)]);
      }
    }
  }

  function handleScorerSelected(playerId: string | null) {
    if (!pendingScorerTeam) return;
    setScores((s) => ({ ...s, [pendingScorerTeam]: s[pendingScorerTeam] + 1 }));
    if (playerId) {
      setGoalEntries((prev) => [
        ...prev,
        { playerId, period: currentPeriod, matchMinute: Math.floor(matchSeconds / 60) },
      ]);
    }
    setPendingScorerTeam(null);
  }

  function handlePlayerTap(player: MatchPlayer) {
    if (player.onField) {
      setPendingOutIds((prev) =>
        prev.includes(player.id)
          ? prev.filter((id) => id !== player.id)
          : [...prev, player.id]
      );
    } else {
      if (pendingOutIds.length > 0) {
        const outId = pendingOutIds[0];
        const minute = Math.floor(matchSeconds / 60);
        setSubstitutions((s) => [
          ...s,
          { outId, inId: player.id, matchMinute: minute, period: currentPeriod },
        ]);
        const gkWentOut = players.some((p) => p.id === outId && p.isGoalkeeper);
        setPlayers((prev) =>
          prev.map((p) => {
            if (p.id === outId) return { ...p, onField: false };
            if (p.id === player.id) return { ...p, onField: true };
            return p;
          })
        );
        setPendingOutIds((prev) => prev.slice(1));
        if (gkWentOut) setSelectingNewGk(true);
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

  return (
    <div className="min-h-dvh flex flex-col select-none" style={{ backgroundColor: 'var(--match-dark)' }}>

      {/* Scoreboard header */}
      <div className="px-3 pt-10 pb-3" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <div className="relative flex items-center justify-center mb-2 min-h-[36px]">
          <span className="absolute left-0 text-sm font-semibold" style={{ color: 'var(--match-text-muted)' }}>
            {currentPeriod}. erä / {config.periods}
          </span>
          <span className="text-3xl font-mono font-bold tabular-nums" style={{ color: 'var(--match-text-primary)' }}>
            {fmtTime(periodSeconds)}
          </span>
          <span className="absolute right-0 text-xs font-mono" style={{ color: 'var(--match-text-muted)' }}>
            ⏱ {fmtTime(matchSeconds)}
          </span>
        </div>

        <div className="flex items-center justify-center gap-2">
          <div className="text-center flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--match-text-muted)' }}>
              {isHome ? (config.teamName ?? 'Kotijoukkue') : config.opponent}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <button onClick={() => scoreChange('home', -1)} className="w-9 h-9 rounded-full text-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-primary)' }}>−</button>
              <span className="text-4xl font-bold min-w-[2.5rem] text-center tabular-nums" style={{ color: 'var(--match-text-primary)' }}>{scores.home}</span>
              <button onClick={() => scoreChange('home', 1)} className="w-9 h-9 rounded-full text-white text-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--match-active)' }}>+</button>
            </div>
          </div>
          <span className="text-xl font-bold flex-shrink-0" style={{ color: 'var(--match-text-muted)' }}>–</span>
          <div className="text-center flex-1 min-w-0">
            <p className="text-xs font-semibold mb-1 truncate" style={{ color: 'var(--match-text-muted)' }}>
              {isHome ? config.opponent : (config.teamName ?? 'Kotijoukkue')}
            </p>
            <div className="flex items-center justify-center gap-1.5">
              <button onClick={() => scoreChange('away', -1)} className="w-9 h-9 rounded-full text-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--match-dark)', color: 'var(--match-text-primary)' }}>−</button>
              <span className="text-4xl font-bold min-w-[2.5rem] text-center tabular-nums" style={{ color: 'var(--match-text-primary)' }}>{scores.away}</span>
              <button onClick={() => scoreChange('away', 1)} className="w-9 h-9 rounded-full text-white text-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--match-active)' }}>+</button>
            </div>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="flex-1 px-3 pt-4 pb-24 overflow-y-auto">
        {pendingOutIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ backgroundColor: 'var(--match-out-bg)', borderColor: 'var(--match-out-border)' }}>
            <span className="text-xs" style={{ color: 'var(--match-out-text)' }}>
              {pendingOutIds.length} pelaaja{pendingOutIds.length > 1 ? 'a' : ''} vaihtoon — valitse penkiltä sisään tuleva
            </span>
          </div>
        )}

        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
          Kentällä ({onFieldPlayers.length}/{FORMAT_SIZES[config.format]})
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {onFieldPlayers.map((p) => (
            <LivePlayerCard key={p.id} player={p} variant="onField" isPendingOut={pendingOutIds.includes(p.id)} pendingOutIndex={pendingOutIds.indexOf(p.id)} goals={goalEntries.filter((g) => g.playerId === p.id).length} onTap={() => handlePlayerTap(p)} />
          ))}
        </div>

        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
              Vaihtopenkit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {benchPlayers.map((p) => (
                <LivePlayerCard key={p.id} player={p} variant="bench" isPendingOut={false} pendingOutIndex={-1} goals={goalEntries.filter((g) => g.playerId === p.id).length} onTap={() => handlePlayerTap(p)} />
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

      {/* New goalkeeper picker */}
      {selectingNewGk && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-t-2xl p-5" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
            <p className="text-sm font-semibold text-center mb-1" style={{ color: 'var(--match-text-primary)' }}>
              Valitse uusi maalivahti
            </p>
            <p className="text-xs text-center mb-4" style={{ color: 'var(--match-text-muted)' }}>
              Maalivahti poistui kentältä
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3 max-h-64 overflow-y-auto">
              {onFieldPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPlayers((prev) =>
                      prev.map((pl) => ({ ...pl, isGoalkeeper: pl.id === p.id }))
                    );
                    setSelectingNewGk(false);
                  }}
                  className="rounded-xl p-3 text-left border-2 min-h-[72px]"
                  style={{ backgroundColor: 'var(--match-field-bg)', borderColor: 'var(--match-field-border)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--match-field-num)' }}>#{p.number}</p>
                  <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: 'var(--match-field-name)' }}>{p.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Scorer picker */}
      {pendingScorerTeam && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-t-2xl p-5" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
            <p className="text-sm font-semibold text-center mb-4" style={{ color: 'var(--match-text-muted)' }}>
              Kuka teki maalin?
            </p>
            <div className="grid grid-cols-3 gap-2 mb-3 max-h-64 overflow-y-auto">
              {onFieldPlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleScorerSelected(p.id)}
                  className="rounded-xl p-3 text-left border-2 min-h-[72px]"
                  style={{ backgroundColor: 'var(--match-field-bg)', borderColor: 'var(--match-field-border)' }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--match-field-num)' }}>#{p.number}</p>
                  <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: 'var(--match-field-name)' }}>{p.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => handleScorerSelected(null)}
              className="w-full py-3 rounded-xl text-sm font-semibold border"
              style={{ backgroundColor: 'var(--match-dark)', borderColor: '#334155', color: 'var(--match-text-muted)' }}
            >
              Ohita — ei tiedossa
            </button>
          </div>
        </div>
      )}

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
  isPendingOut: boolean;
  pendingOutIndex: number;
  goals: number;
  onTap: () => void;
}

function LivePlayerCard({ player, variant, isPendingOut, pendingOutIndex, goals, onTap }: LivePlayerCardProps) {
  const mins = Math.floor(player.accumulatedSeconds / 60);
  const secs = player.accumulatedSeconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  let bgColor: string;
  let borderColor: string;
  if (isPendingOut) {
    bgColor = 'var(--match-out-bg)';
    borderColor = 'var(--match-out-border)';
  } else if (variant === 'onField') {
    bgColor = 'var(--match-field-bg)';
    borderColor = player.isGoalkeeper ? '#facc15' : 'var(--match-field-border)';
  } else {
    bgColor = 'transparent';
    borderColor = 'var(--match-border)';
  }

  const textColor = isPendingOut ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-field-name)' : 'var(--match-text-muted)';
  const numColor = isPendingOut ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-field-num)' : 'var(--match-text-muted)';

  return (
    <button
      onClick={onTap}
      className="w-full rounded-xl p-3 text-left transition-all min-h-[80px] border-2 relative"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: numColor }}>
          #{player.number}
        </span>
        <div className="flex items-center gap-1">
          {isPendingOut && pendingOutIndex >= 0 && (
            <span className="text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ backgroundColor: 'var(--match-out-border)', color: '#fff' }}>
              {pendingOutIndex + 1}
            </span>
          )}
          {player.isGoalkeeper && (
            <span className="text-xs font-bold rounded px-1 border" style={{ backgroundColor: 'transparent', borderColor: '#facc15', color: '#facc15' }}>MV</span>
          )}
        </div>
      </div>
      <p className="text-sm font-semibold leading-tight" style={{ color: textColor }}>
        {player.name}
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs font-mono tabular-nums" style={{ color: isPendingOut ? 'var(--match-out-text)' : variant === 'onField' ? 'var(--match-active)' : 'var(--match-text-muted)' }}>
          {timeStr}
        </p>
        {goals > 0 && (
          <span className="text-xs font-bold" style={{ color: isPendingOut ? 'var(--match-out-text)' : 'var(--match-active)' }}>
            ⚽ {goals}
          </span>
        )}
      </div>
    </button>
  );
}
