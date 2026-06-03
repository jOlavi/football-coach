import { useState, useEffect, useRef, useCallback } from 'react';

export function useMatchTimer(
  isRunning: boolean,
  initialMatchSeconds: number,
  periodLength: number,
  onPeriodEnd: () => void,
) {
  const [matchSeconds, setMatchSeconds] = useState(initialMatchSeconds);
  const [periodSeconds, setPeriodSeconds] = useState(0);
  const calledRef = useRef(false);
  const cbRef = useRef(onPeriodEnd);
  useEffect(() => { cbRef.current = onPeriodEnd; });

  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setMatchSeconds((s) => s + 1);
      setPeriodSeconds((s) => {
        const next = s + 1;
        if (!calledRef.current && next >= periodLength * 60) {
          calledRef.current = true;
          queueMicrotask(() => cbRef.current());
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, periodLength]);

  const resetPeriodClock = useCallback(() => {
    setPeriodSeconds(0);
    calledRef.current = false;
  }, []);

  return { matchSeconds, periodSeconds, resetPeriodClock };
}
