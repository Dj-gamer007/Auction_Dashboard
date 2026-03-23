import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuctionData } from '@/hooks/useAuctionData';
import { CurrentPlayerSpotlight } from '@/components/CurrentPlayerSpotlight';
import { ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function LiveAuction() {
  const navigate   = useNavigate();
  const { currentPlayer, teams, isLive, auctionLog } = useAuctionData();

  // Auto-return to dashboard when player is sold / unsold (no longer 'current')
  useEffect(() => {
    if (currentPlayer) return; // player is live — stay here
    // Small delay so the "SOLD!" animation can play before leaving
    const timer = setTimeout(() => navigate('/'), 2200);
    return () => clearTimeout(timer);
  }, [currentPlayer, navigate]);

  // Last sold player — shown briefly after auction ends
  const lastSold = auctionLog.find(l => l.action === 'sold');

  return (
    <div
      className="min-h-screen flex flex-col bg-background overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, hsl(var(--primary)/0.08) 0%, hsl(var(--background)) 60%)' }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border/40">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Button>

        <div className="flex items-center gap-2">
          {isLive ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-500">
              <Wifi className="w-3.5 h-3.5" /> Live sync active
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
              <WifiOff className="w-3.5 h-3.5" /> Connecting…
            </span>
          )}
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <AnimatePresence mode="wait">
            {currentPlayer ? (
              /* ── Live player spotlight ── */
              <motion.div
                key={currentPlayer.id}
                initial={{ opacity: 0, scale: 0.97, y: 20 }}
                animate={{ opacity: 1, scale: 1,    y: 0  }}
                exit={{   opacity: 0, scale: 1.02,  y: -20 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <CurrentPlayerSpotlight
                  player={currentPlayer}
                  teams={teams}
                  fullscreen={true}
                />
              </motion.div>
            ) : (
              /* ── Sold / returning animation ── */
              <motion.div
                key="returning"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{   opacity: 0 }}
                className="text-center space-y-4 py-20"
              >
                {lastSold ? (
                  <>
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: [0.5, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                      className="text-6xl"
                    >
                      🏏
                    </motion.div>
                    <h2 className="font-display font-black text-4xl text-foreground">
                      {lastSold.player_name}
                    </h2>
                    <p className="text-xl font-bold" style={{ color: 'hsl(var(--live))' }}>
                      SOLD to {lastSold.team_name} for ₹{lastSold.sold_price?.toFixed(2)} Cr
                    </p>
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Returning to dashboard…
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-5xl">⏸</div>
                    <h2 className="font-display font-bold text-2xl text-muted-foreground">
                      No player on auction
                    </h2>
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Returning to dashboard…
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
