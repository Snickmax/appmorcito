import { useEffect, useState } from 'react';
import { ElapsedTime, getElapsedTime } from '../utils/date';

export function useElapsedTime(startDate: Date) {
  const [elapsedTime, setElapsedTime] = useState<ElapsedTime>(() =>
    getElapsedTime(startDate)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(getElapsedTime(startDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [startDate]);

  return elapsedTime;
}