import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { StopCircle, ArrowLeftRight, ArrowRight, X, Settings } from 'lucide-react';
import { useMatchTimer } from '../hooks/useMatchTimer';
import type { MatchSessionState, MatchPlayer, SubEntry, GoalEntry } from '../types/matchSession';
import { fmtTime, FORMAT_SIZES } from '../types/matchSession';

export function MatchLive() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: matchId } = useParams<{ id: string }>();

  const locationState = location.state as (MatchSessionState & { tournamentId?: string }) | null;
  const session = locationState;
  const tournamentId = locationState?.tournamentId;

  const [isRunning, setIsRunning] = useState(true);
  const [players, setPlayers] = useState<MatchPlayer[]>(session?.players ?? []);
  const [scores, setScores] = useState(session?.scores ?? { home: 0, away: 0 });
  const [substitutions, setSubstitutions] = useState<SubEntry[]>(session?.substitutions ?? []);
  const [goalEntries, setGoalEntries] = useState<GoalEntry[]>(session?.goalEntries ?? []);
  const [opponentGoalTimes, setOpponentGoalTimes] = useState<number[]>(session?.opponentGoalTimes ?? []);
  const [periodHistory] = useState(session?.periodHistory ?? []);
  const [showPeriodEnd, setShowPeriodEnd] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [pendingScorerTeam, setPendingScorerTeam] = useState<'home' | 'away' | null>(null);
  const [selectingNewGk, setSelectingNewGk] = useState(false);
  const [trackScorers, setTrackScorers] = useState(session?.config?.trackScorers ?? false);
  const [jokerActive, setJokerActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [subMode, setSubMode] = useState(false);
  const [subPairs, setSubPairs] = useState<{ out: MatchPlayer | 'joker'; in: MatchPlayer }[]>([]);
  const [pendingOut, setPendingOut] = useState<MatchPlayer | 'joker' | null>(null);

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
    navigate(`/matches/${matchId}/break`, { state: { ...updatedSession, tournamentId } });
  }

  const isHome = config?.location === 'home';

  function scoreChange(team: 'home' | 'away', delta: number) {
    const isOurGoal = (isHome && team === 'home') || (!isHome && team === 'away');
    if (delta < 0) {
      setScores((s) => ({ ...s, [team]: Math.max(0, s[team] + delta) }));
      if (!isOurGoal) setOpponentGoalTimes((prev) => prev.slice(0, -1));
      return;
    }
    if (trackScorers && isOurGoal) {
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

  function openSubMode(preselectedOut?: MatchPlayer) {
    setSubPairs([]);
    setPendingOut(preselectedOut ?? null);
    setSubMode(true);
  }

  function cancelSubMode() {
    setSubMode(false);
    setSubPairs([]);
    setPendingOut(null);
  }

  function handleSubPickIn(inPlayer: MatchPlayer) {
    if (pendingOut === null) return;
    setSubPairs((prev) => [...prev, { out: pendingOut, in: inPlayer }]);
    setPendingOut(null);
  }

  function removeSubPair(index: number) {
    setSubPairs((prev) => prev.filter((_, i) => i !== index));
  }

  function confirmSubstitutions() {
    if (subPairs.length === 0) return;
    const minute = Math.floor(matchSeconds / 60);
    const gkWentOut = subPairs.some((pair) => pair.out !== 'joker' && (pair.out as MatchPlayer).isGoalkeeper);
    const outIds = new Set(subPairs.filter((p) => p.out !== 'joker').map((p) => (p.out as MatchPlayer).id));
    const inIds = new Set(subPairs.map((p) => p.in.id));
    setSubstitutions((s) => [
      ...s,
      ...subPairs.map(({ out, in: inP }) => ({
        outId: out === 'joker' ? 'joker' : (out as MatchPlayer).id,
        inId: inP.id,
        matchMinute: minute,
        period: currentPeriod,
      })),
    ]);
    setPlayers((prev) =>
      prev.map((p) => {
        if (outIds.has(p.id)) return { ...p, onField: false };
        if (inIds.has(p.id)) return { ...p, onField: true };
        return p;
      })
    );
    cancelSubMode();
    if (gkWentOut) setSelectingNewGk(true);
  }

  function handlePlayerTap(player: MatchPlayer) {
    if (player.onField) openSubMode(player);
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
          <button onClick={() => navigate(tournamentId ? '/matches?tab=tournaments' : '/matches', tournamentId ? { state: { tournamentId } } : undefined)} style={{ color: 'var(--match-active)' }} className="underline">
            Takaisin otteluihin
          </button>
        </div>
      </div>
    );
  }

  const onFieldPlayers = players.filter((p) => p.onField).sort((a, b) => a.number - b.number);
  const benchPlayers = players.filter((p) => !p.onField).sort((a, b) => a.number - b.number);
  const fieldLimit = FORMAT_SIZES[config.format] + (jokerActive ? 1 : 0);

  return (
    <div className="min-h-dvh flex flex-col select-none" style={{ backgroundColor: 'var(--match-dark)' }}>

      {/* Scoreboard header */}
      <div className="px-3 pt-10 pb-3 relative" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
        <button
          onClick={() => setShowSettings(true)}
          className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
          style={{ color: 'var(--match-text-muted)' }}
        >
          <Settings size={16} />
        </button>
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
        <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
          Kentällä ({onFieldPlayers.length}/{fieldLimit}){jokerActive ? ' ⚡' : ''}
        </p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {onFieldPlayers.map((p) => (
            <LivePlayerCard key={p.id} player={p} variant="onField" goals={goalEntries.filter((g) => g.playerId === p.id).length} onTap={() => handlePlayerTap(p)} />
          ))}
        </div>

        {benchPlayers.length > 0 && (
          <>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: 'var(--match-text-muted)' }}>
              Vaihtopenkit
            </p>
            <div className="grid grid-cols-3 gap-2">
              {benchPlayers.map((p) => (
                <LivePlayerCard key={p.id} player={p} variant="bench" goals={goalEntries.filter((g) => g.playerId === p.id).length} onTap={() => {}} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t px-3 py-3 flex gap-2" style={{ backgroundColor: 'var(--match-dark)', borderColor: 'var(--match-border)' }}>
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
        <div className="flex-1 relative">
          <button
            onClick={() => openSubMode()}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px] flex items-center justify-center gap-1.5"
            style={{ backgroundColor: 'var(--match-dark-mid)', color: 'var(--match-text-primary)' }}
          >
            <ArrowLeftRight size={15} />
            Vaihto
          </button>
          {jokerActive && onFieldPlayers.length < fieldLimit && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold pointer-events-none" style={{ backgroundColor: '#facc15', color: '#713f12' }}>
              ⚡
            </span>
          )}
        </div>
        <button
          onClick={handleEndPeriod}
          className="flex-1 py-3 rounded-xl font-semibold text-sm transition-colors min-h-[48px] flex items-center justify-center gap-1.5"
          style={{
            backgroundColor: showEndConfirm ? 'var(--match-out-border)' : 'var(--match-dark-mid)',
            color: showEndConfirm ? '#fff' : 'var(--match-text-muted)',
          }}
        >
          <StopCircle size={15} />
          {showEndConfirm ? 'Vahvista' : 'Lopeta erä'}
        </button>
      </div>

      {/* In-game settings */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="rounded-t-2xl p-5" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold" style={{ color: 'var(--match-text-primary)' }}>Pelinasetukset</p>
              <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg" style={{ color: 'var(--match-text-muted)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              {/* Track scorers */}
              <button
                onClick={() => setTrackScorers((v) => !v)}
                className="w-full flex items-center justify-between rounded-xl border p-4 transition-colors"
                style={{ backgroundColor: trackScorers ? 'var(--match-field-bg)' : 'var(--match-dark)', borderColor: trackScorers ? 'var(--match-field-border)' : 'var(--match-border)' }}
              >
                <div className="text-left">
                  <p className="text-sm font-semibold" style={{ color: 'var(--match-text-primary)' }}>Seuraa maalintekijöitä</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--match-text-muted)' }}>Valitaan pelaaja aina kun oma joukkue tekee maalin</p>
                </div>
                <div className="w-12 h-6 rounded-full flex-shrink-0 ml-4 relative transition-colors" style={{ backgroundColor: trackScorers ? 'var(--match-active)' : '#334155' }}>
                  <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: trackScorers ? '28px' : '4px' }} />
                </div>
              </button>
              {/* Joker */}
              {config.jokerRule && (
                <button
                  onClick={() => setJokerActive((v) => !v)}
                  className="w-full flex items-center justify-between rounded-xl border p-4 transition-colors"
                  style={{ backgroundColor: jokerActive ? 'rgba(250,204,21,0.08)' : 'var(--match-dark)', borderColor: jokerActive ? '#facc15' : 'var(--match-border)' }}
                >
                  <div className="text-left">
                    <p className="text-sm font-semibold" style={{ color: 'var(--match-text-primary)' }}>⚡ Jokeri-pelaaja (+1)</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--match-text-muted)' }}>
                      {jokerActive ? `Kentällä max ${fieldLimit} pelaajaa — käytä Vaihto-nappia` : 'Lisää yksi ylimääräinen pelaaja kentälle'}
                    </p>
                  </div>
                  <div className="w-12 h-6 rounded-full flex-shrink-0 ml-4 relative transition-colors" style={{ backgroundColor: jokerActive ? '#facc15' : '#334155' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: jokerActive ? '28px' : '4px' }} />
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Substitution sheet */}
      {subMode && (() => {
        const usedOutIds = new Set(subPairs.filter((p) => p.out !== 'joker').map((p) => (p.out as MatchPlayer).id));
        const usedInIds = new Set(subPairs.map((p) => p.in.id));
        const availableOut = onFieldPlayers.filter((p) => !usedOutIds.has(p.id));
        const availableIn = benchPlayers.filter((p) => !usedInIds.has(p.id));
        const jokerAlreadyInBatch = subPairs.some((p) => p.out === 'joker');
        const jokerEligible = config.jokerRule && jokerActive && !jokerAlreadyInBatch && onFieldPlayers.length < fieldLimit;
        const isPickingIn = pendingOut !== null;
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
            <div className="rounded-t-2xl p-5 max-h-[85dvh] flex flex-col" style={{ backgroundColor: 'var(--match-dark-mid)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-3 shrink-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--match-text-primary)' }}>Vaihto</p>
                <button onClick={cancelSubMode} className="p-1 rounded-lg" style={{ color: 'var(--match-text-muted)' }}>
                  <X size={18} />
                </button>
              </div>

              {/* Confirmed pairs list */}
              {subPairs.length > 0 && (
                <div className="mb-3 space-y-1.5 shrink-0">
                  {subPairs.map((pair, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-xl px-3 py-2 border" style={{ backgroundColor: 'var(--match-dark)', borderColor: 'var(--match-border)' }}>
                      <span className="text-xs font-semibold shrink-0" style={{ color: pair.out === 'joker' ? '#facc15' : 'var(--match-out-text)' }}>
                        {pair.out === 'joker' ? '⚡ Jokeri' : `#${(pair.out as MatchPlayer).number} ${(pair.out as MatchPlayer).name}`}
                      </span>
                      <ArrowRight size={12} className="shrink-0" style={{ color: 'var(--match-text-muted)' }} />
                      <span className="text-xs font-semibold flex-1" style={{ color: 'var(--match-field-name)' }}>#{pair.in.number} {pair.in.name}</span>
                      <button onClick={() => removeSubPair(i)} className="shrink-0 p-0.5 rounded" style={{ color: 'var(--match-text-muted)' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Current pair indicator */}
              {isPickingIn && (
                <div className="flex items-center gap-3 mb-3 shrink-0">
                  {pendingOut === 'joker' ? (
                    <div className="flex-1 rounded-xl px-3 py-2 border-2" style={{ borderColor: '#facc15', backgroundColor: 'rgba(250,204,21,0.08)' }}>
                      <p className="text-xs font-bold" style={{ color: '#facc15' }}>⚡ Jokeri</p>
                    </div>
                  ) : (
                    <div className="flex-1 rounded-xl px-3 py-2 border-2" style={{ borderColor: 'var(--match-out-border)', backgroundColor: 'var(--match-out-bg)' }}>
                      <p className="text-xs font-bold" style={{ color: 'var(--match-out-text)' }}>#{(pendingOut as MatchPlayer).number} {(pendingOut as MatchPlayer).name}</p>
                    </div>
                  )}
                  <ArrowRight size={16} className="shrink-0" style={{ color: 'var(--match-text-muted)' }} />
                  <div className="flex-1 rounded-xl px-3 py-2.5 border-2 border-dashed" style={{ borderColor: 'var(--match-border)' }}>
                    <p className="text-xs" style={{ color: 'var(--match-text-muted)' }}>Valitse sisään</p>
                  </div>
                </div>
              )}

              {/* Scrollable player grid */}
              <div className="flex-1 overflow-y-auto min-h-0">
                {!isPickingIn ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>
                      {subPairs.length > 0 ? 'Lisää vaihto — kuka lähtee ulos?' : 'Kuka lähtee ulos?'}
                    </p>
                    {jokerEligible && (
                      <button
                        onClick={() => setPendingOut('joker')}
                        className="w-full mb-3 rounded-xl p-3 text-left border-2 flex items-center gap-3 transition-colors"
                        style={{ backgroundColor: 'rgba(250,204,21,0.08)', borderColor: '#facc15' }}
                      >
                        <span className="text-xl">⚡</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: '#facc15' }}>Jokeri — lisää pelaaja kentälle</p>
                          <p className="text-xs" style={{ color: 'var(--match-text-muted)' }}>Ei poista ketään, +1 pelaaja kentälle</p>
                        </div>
                      </button>
                    )}
                    {availableOut.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableOut.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setPendingOut(p)}
                            className="rounded-xl p-3 text-left border-2 min-h-[72px] transition-colors"
                            style={{ backgroundColor: 'var(--match-field-bg)', borderColor: 'var(--match-field-border)' }}
                          >
                            <p className="text-xs font-bold" style={{ color: 'var(--match-field-num)' }}>#{p.number}</p>
                            <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: 'var(--match-field-name)' }}>{p.name}</p>
                            {p.isGoalkeeper && <span className="text-[10px] font-bold" style={{ color: '#facc15' }}>MV</span>}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm py-4" style={{ color: 'var(--match-text-muted)' }}>Kaikki kentälliset pelaajat on jo valittu</p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--match-text-muted)' }}>Kuka tulee sisään?</p>
                    {availableIn.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2">
                        {availableIn.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => handleSubPickIn(p)}
                            className="rounded-xl p-3 text-left border-2 min-h-[72px] transition-colors"
                            style={{ backgroundColor: 'var(--match-dark)', borderColor: 'var(--match-border)' }}
                          >
                            <p className="text-xs font-bold" style={{ color: 'var(--match-text-muted)' }}>#{p.number}</p>
                            <p className="text-sm font-semibold leading-tight mt-0.5" style={{ color: 'var(--match-text-primary)' }}>{p.name}</p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-sm py-4" style={{ color: 'var(--match-text-muted)' }}>Ei pelaajia penkillä</p>
                    )}
                    <button
                      onClick={() => setPendingOut(null)}
                      className="w-full mt-3 py-2.5 rounded-xl text-sm border"
                      style={{ borderColor: 'var(--match-border)', color: 'var(--match-text-muted)', backgroundColor: 'var(--match-dark)' }}
                    >
                      ← Takaisin
                    </button>
                  </>
                )}
              </div>

              {/* Bottom actions */}
              {subPairs.length > 0 && !isPickingIn && (
                <div className="flex gap-3 mt-4 shrink-0">
                  <button
                    onClick={cancelSubMode}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold border"
                    style={{ borderColor: 'var(--match-border)', backgroundColor: 'var(--match-dark)', color: 'var(--match-text-muted)' }}
                  >
                    Peruuta
                  </button>
                  <button
                    onClick={confirmSubstitutions}
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    style={{ backgroundColor: 'var(--match-active)', color: '#fff' }}
                  >
                    Vahvista ({subPairs.length})
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
  goals: number;
  onTap: () => void;
}

function LivePlayerCard({ player, variant, goals, onTap }: LivePlayerCardProps) {
  const mins = Math.floor(player.accumulatedSeconds / 60);
  const secs = player.accumulatedSeconds % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const bgColor = variant === 'onField' ? 'var(--match-field-bg)' : 'transparent';
  const borderColor = variant === 'onField'
    ? (player.isGoalkeeper ? '#facc15' : 'var(--match-field-border)')
    : 'var(--match-border)';
  const textColor = variant === 'onField' ? 'var(--match-field-name)' : 'var(--match-text-muted)';
  const numColor = variant === 'onField' ? 'var(--match-field-num)' : 'var(--match-text-muted)';

  return (
    <button
      onClick={onTap}
      className="w-full rounded-xl p-3 text-left transition-all min-h-[80px] border-2 relative"
      style={{ backgroundColor: bgColor, borderColor }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold" style={{ color: numColor }}>#{player.number}</span>
        {player.isGoalkeeper && (
          <span className="text-xs font-bold rounded px-1 border" style={{ backgroundColor: 'transparent', borderColor: '#facc15', color: '#facc15' }}>MV</span>
        )}
      </div>
      <p className="text-sm font-semibold leading-tight" style={{ color: textColor }}>
        {player.name}
      </p>
      <div className="flex items-center justify-between mt-1">
        <p className="text-xs font-mono tabular-nums" style={{ color: variant === 'onField' ? 'var(--match-active)' : 'var(--match-text-muted)' }}>
          {timeStr}
        </p>
        {goals > 0 && (
          <span className="text-xs font-bold" style={{ color: 'var(--match-active)' }}>⚽ {goals}</span>
        )}
      </div>
    </button>
  );
}
