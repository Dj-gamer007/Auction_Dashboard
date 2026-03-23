import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { auctionChannel } from '@/hooks/useAuctionData';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface Props {
  player: AuctionPlayer | null;
  teams?: Team[];
  fullscreen?: boolean;
}

function playTickSound() {
  try {
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
  } catch {}
}

function playTimerEndSound() {
  try {
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
  } catch {}
}

export function CurrentPlayerSpotlight({ player, teams, fullscreen }: Props) {
  const [timerSeconds, setTimerSeconds] = useState(10);
  const [timerRunning, setTimerRunning] = useState(false);
  const [expireAt, setExpireAt] = useState<number | null>(null);
  const [lastBid, setLastBid] = useState<number | null>(null);
  const [highlightColor, setHighlightColor] = useState<string | null>(null);
  const lastPlayerIdRef = useRef<string | null>(null);

  const currentBid = (player as any)?.current_bid as number | null;
  const timerStartedAt = (player as any)?.timer_started_at as string | null;
  const leadingTeamId = (player as any).leading_team_id as string | null;
  const leadingTeam = teams?.find(t => t.id === leadingTeamId);

  // Auto-start timer when a NEW player becomes current
  // Works regardless of whether the host sends timer_started_at or not
  useEffect(() => {
    if (!player) {
      lastPlayerIdRef.current = null;
      setExpireAt(null);
      setTimerSeconds(10);
      setTimerRunning(false);
      return;
    }

    // If we received an explicit timer_started_at (from local host or DB), use it
    if (timerStartedAt) {
      setExpireAt(new Date(timerStartedAt).getTime() + 10000);
      lastPlayerIdRef.current = player.id;
      return;
    }

    // If this is a NEW player (different from last one), auto-start a 10s timer locally
    if (player.id !== lastPlayerIdRef.current) {
      lastPlayerIdRef.current = player.id;
      setExpireAt(Date.now() + 10000);
    }
  }, [player?.id, timerStartedAt]);

  // Flash highlight on bid increment AND reset timer to sync with host
  useEffect(() => {
    if (!player || !currentBid) return;
    if (lastBid !== null && currentBid !== lastBid) {
      setHighlightColor(leadingTeam?.color || '#22c55e');
      setTimeout(() => setHighlightColor(null), 500);
      // Reset timer to 10s on every bid change — keeps viewer timer synced with host
      setExpireAt(Date.now() + 10000);
    }
    setLastBid(currentBid);
  }, [currentBid, player, leadingTeam]);

  // Sync from precise websocket broadcast for instant <50ms updates
  useEffect(() => {
    let mounted = true;
    const sub = auctionChannel.on('broadcast', { event: 'auction:start' }, ({ payload }) => {
      if (!mounted) return;
      if (payload.playerId === player?.id) {
        setExpireAt(payload.expireAt);
      }
    });
    return () => { mounted = false; };
  }, [player?.id]);

  // Actual true-server-time countdown loop
  useEffect(() => {
    if (!expireAt) {
      setTimerRunning(false);
      return;
    }
    
    // Check remaining instantly
    const getRemaining = () => Math.max(0, Math.ceil((expireAt - Date.now()) / 1000));
    let remaining = getRemaining();
    setTimerSeconds(remaining);
    setTimerRunning(remaining > 0);

    if (remaining <= 0) return;

    const interval = setInterval(() => {
      const rem = getRemaining();
      setTimerSeconds(rem);
      
      // Auto-stop when hit 0
      if (rem <= 0) {
        setTimerRunning(false);
        playTimerEndSound();
        clearInterval(interval);
      } else if (rem <= 4) {
        playTickSound();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [expireAt]);

  if (!player) return null;

  const imageUrl = (player as any).image_url as string | null;
  const hasImage = imageUrl && imageUrl !== 'none';
  const basePriceInCr = player.base_price >= 100
    ? `₹${(player.base_price / 100).toFixed(2)} Cr`
    : `₹${player.base_price} L`;

  const currentBidDisplay = currentBid
    ? `₹${currentBid.toFixed(2)} Cr`
    : basePriceInCr;

  const isUrgent = timerSeconds <= 3 && timerSeconds > 0;
  const isExpired = timerSeconds === 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border-2 border-live/50 bg-card relative overflow-hidden ${
        fullscreen ? 'min-h-[60vh]' : 'min-h-[200px]'
      }`}
    >
      {/* Animated border glow */}
      <div className="absolute inset-0 rounded-xl border-2 border-live/30 live-pulse pointer-events-none" />

      <div className={`flex flex-col justify-center h-full ${
        fullscreen ? 'p-10 md:p-16 min-h-[60vh]' : 'p-6 md:p-8'
      }`}>
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`rounded-full bg-live live-pulse ${fullscreen ? 'w-4 h-4' : 'w-3 h-3'}`} />
            <span className={`font-bold text-live uppercase tracking-wider ${fullscreen ? 'text-lg' : 'text-sm'}`}>
              Live — Now Auctioning
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className={`text-muted-foreground ${fullscreen ? 'text-base' : 'text-sm'}`}>
              Set {player.set_name || player.set_number}
            </span>
            {/* Timer Display */}
            <div className={`font-display font-bold rounded-lg px-4 py-2 ${
              isExpired ? 'bg-destructive/20 text-destructive' :
              isUrgent ? 'bg-live/20 text-live live-pulse' :
              'bg-muted/50 text-foreground'
            } ${fullscreen ? 'text-3xl' : 'text-xl'}`}>
              {isExpired ? '⏰ TIME!' : `${timerSeconds}s`}
            </div>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isUrgent ? 'bg-live' : isExpired ? 'bg-destructive' : 'bg-primary'
            }`}
            style={{ width: `${(timerSeconds / 10) * 100}%` }}
          />
        </div>

        {/* Main content */}
        <div className="mt-6 flex flex-col md:flex-row md:items-end justify-between gap-6 flex-1">
          <div className="flex items-center gap-6">
            {hasImage && (
              <img
                src={imageUrl}
                alt={player.player_name}
                className={`rounded-xl object-cover border-2 border-border/50 ${
                  fullscreen ? 'w-40 h-40 md:w-52 md:h-52' : 'w-20 h-20'
                }`}
              />
            )}
            <div>
              <h2 className={`font-display font-bold text-foreground ${
                fullscreen ? 'text-6xl md:text-8xl' : 'text-4xl md:text-5xl'
              }`}>
                {player.player_name}
              </h2>
              <div className={`flex items-center gap-3 mt-3 text-muted-foreground flex-wrap ${
                fullscreen ? 'text-lg' : 'text-sm'
              }`}>
                <span className="font-medium text-foreground/80">{player.role}</span>
                <span>•</span>
                <span>{player.country}</span>
                {player.age && (
                  <>
                    <span>•</span>
                    <span>Age {player.age}</span>
                  </>
                )}
                {player.ipl_caps ? (
                  <>
                    <span>•</span>
                    <span>{player.ipl_caps} IPL Caps</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-end gap-8">
            {/* Base Price */}
            <div className="text-right">
              <div className={`text-muted-foreground ${fullscreen ? 'text-sm' : 'text-xs'}`}>Base Price</div>
              <div className={`font-display font-bold text-primary ${fullscreen ? 'text-2xl' : 'text-lg'}`}>
                {basePriceInCr}
              </div>
            </div>

            {/* Current Bid */}
            <div className="text-right">
              <div className={`text-muted-foreground ${fullscreen ? 'text-sm' : 'text-xs'}`}>Current Bid</div>
              <motion.div 
                animate={highlightColor ? { scale: 1.1, textShadow: `0 0 20px ${highlightColor}`, color: highlightColor } : { scale: 1, textShadow: "none" }}
                transition={{ duration: 0.3 }}
                className={`font-display font-bold ${highlightColor ? '' : 'text-live'} ${
                  fullscreen ? 'text-5xl md:text-7xl' : 'text-3xl md:text-4xl'
                }`}
              >
                {currentBidDisplay}
              </motion.div>
              {leadingTeam && (
                <motion.div 
                  animate={highlightColor ? { scale: 1.05, color: highlightColor } : { scale: 1, color: leadingTeam.color }}
                  className={`mt-1 font-medium ${fullscreen ? 'text-base' : 'text-xs'}`} 
                  style={{ color: leadingTeam.color }}
                >
                  ▲ {leadingTeam.short_name}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
