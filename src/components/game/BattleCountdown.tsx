import { useEffect, useState } from 'react';

export function BattleCountdown({ startedAt, timeoutSeconds, onExpire }: { startedAt: string, timeoutSeconds: number, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(timeoutSeconds);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const elapsed = (now - start) / 1000;
      const remaining = Math.max(0, timeoutSeconds - elapsed);
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);
    
    // Initial calculation
    const now = new Date().getTime();
    const elapsed = (now - start) / 1000;
    const remaining = Math.max(0, timeoutSeconds - elapsed);
    setTimeLeft(remaining);
    
    if (remaining <= 0) {
      clearInterval(interval);
      onExpire();
    }

    return () => clearInterval(interval);
  }, [startedAt, timeoutSeconds, onExpire]);

  return (
    <div className={`font-mono font-bold text-lg ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-accent'}`}>
      {Math.ceil(timeLeft)}s
    </div>
  );
}
