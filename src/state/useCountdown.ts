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
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const tick = () => {
      const secondsLeft = Math.max(0, Math.round((endTimestampRef.current - Date.now()) / 1000));
      setRemainingSeconds(secondsLeft);
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

  const progress = totalSeconds > 0 ? 1 - remainingSeconds / totalSeconds : 0;

  return { remainingSeconds, totalSeconds, progress, addMinutes };
}
