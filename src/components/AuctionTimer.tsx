import { useState, useEffect, useCallback, useRef, useImperativeHandle, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw } from 'lucide-react';

export interface AuctionTimerHandle {
  start: () => void;
  reset: () => void;
  stop: () => void;
  isExpired: boolean;
}

interface Props {
  onTimerEnd?: () => void;
}

function playTickSound() {
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, ctx.currentTime);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.1);
}

function playTimerEndSound() {
  const ctx = new AudioContext();
  [0, 0.15, 0.3].forEach(offset => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1000, ctx.currentTime + offset);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + 0.12);
  });
}

export const AuctionTimer = forwardRef<AuctionTimerHandle, Props>(({ onTimerEnd }, ref) => {
  const [seconds, setSeconds] = useState(10);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stop();
    setSeconds(10);
  }, [stop]);

  const start = useCallback(() => {
    setSeconds(10);
    setRunning(true);
  }, []);

  useImperativeHandle(ref, () => ({
    start,
    reset,
    stop,
    get isExpired() { return seconds === 0; },
  }), [start, reset, stop, seconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          stop();
          playTimerEndSound();
          onTimerEnd?.();
          return 0;
        }
        if (prev <= 4) playTickSound();
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, stop, onTimerEnd]);

  const isUrgent = seconds <= 3 && seconds > 0;
  const isExpired = seconds === 0;

  return (
    <div className="bg-muted/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-muted-foreground uppercase">Bid Timer</span>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={() => running ? stop() : setRunning(true)}
            disabled={isExpired}
          >
            {running ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      <div className={`font-display font-bold text-center transition-colors ${
        isExpired ? 'text-destructive text-4xl' :
        isUrgent ? 'text-live text-5xl live-pulse' :
        'text-foreground text-4xl'
      }`}>
        {isExpired ? 'TIME!' : `${seconds}s`}
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            isUrgent ? 'bg-live' : 'bg-primary'
          }`}
          style={{ width: `${(seconds / 10) * 100}%` }}
        />
      </div>
    </div>
  );
});

AuctionTimer.displayName = 'AuctionTimer';
