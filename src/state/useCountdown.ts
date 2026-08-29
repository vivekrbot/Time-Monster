import { useCallback, useEffect, useRef, useState } from 'react';

type UseCountdownArgs = {
  initialMinutes: number;
  onComplete: () => void;
};

export function useCountdown({ initialMinutes, onComplete }: UseCountdownArgs) {
  const initialSeconds = initialMinutes * 60;
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  const endTimestampRef = useRef(Date.now() + initialSeconds * 1000);
  // Fixed at mount, never touched by addMinutes — the one thing elapsedSeconds is allowed
  // to depend on, so extending the timer can never move a tree that's already grown.
  const startTimestampRef = useRef(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startTimestampRef.current) / 1000)));
      if (secondsLeft <= 0 && !completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, []);

  const addMinutes = useCallback((minutes: number) => {
    endTimestampRef.current += minutes * 60 * 1000;
    setTotalSeconds((prev) => prev + minutes * 60);
    setRemainingSeconds((prev) => prev + minutes * 60);
  }, []);

  // Live value, unlike remainingSeconds which lags by up to one tick.
  const getRemainingMs = useCallback(() => Math.max(0, endTimestampRef.current - Date.now()), []);

  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  return { remainingSeconds, totalSeconds, progress, elapsedSeconds, addMinutes, getRemainingMs };
}
