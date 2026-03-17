import { useEffect, useMemo, useState } from 'react';
import { CountdownTimeParts } from '../types/countdown';
import { getCountdownParts } from '../utils/countdown';

export function useCountdownTimer(targetDate: Date | null) {
  const targetKey = useMemo(
    () => (targetDate ? targetDate.getTime() : null),
    [targetDate]
  );

  const [timeParts, setTimeParts] = useState<CountdownTimeParts>(() =>
    getCountdownParts(targetDate)
  );

  useEffect(() => {
    setTimeParts(getCountdownParts(targetDate));

    if (!targetDate) {
      return;
    }

    const interval = setInterval(() => {
      setTimeParts(getCountdownParts(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, targetKey]);

  return timeParts;
}