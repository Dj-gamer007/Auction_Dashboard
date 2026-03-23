import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuctionData } from '@/hooks/useAuctionData';
import { TeamCard } from '@/components/TeamCard';
import { AuctionLogFeed } from '@/components/AuctionLogFeed';
import { AuctionSummary } from '@/components/AuctionSummary';
import { TopBuys } from '@/components/TopBuys';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const Index = () => {
  const {
    teams, auctionPlayers, retainedPlayers, auctionLog,
    currentPlayer, isLive, loading,
    soldPlayersByTeam, retainedByTeam, refetch,
  } = useAuctionData();

  const navigate = useNavigate();
  const [showSummary, setShowSummary] = useState(false);
  const wasLive = useRef(false);

  // Auto-navigate to /live when host sets a player as current
  useEffect(() => {
    if (currentPlayer && !wasLive.current) {
      wasLive.current = true;
      navigate('/live');
    }
    if (!currentPlayer) {
      wasLive.current = false;
    }
  }, [currentPlayer, navigate]);
  const [refreshing,  setRefreshing]  = useState(false);

  const byShort = useMemo(() => {
    const m: Record<string, typeof teams[number]> = {};
    teams.forEach(t => { m[t.short_name] = t; });
    return m;
  }, [teams]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-display text-xl font-bold text-primary">Loading Auction…</div>
          <div className="text-sm text-muted-foreground">Connecting to live data</div>
        </div>
      </div>
    );
  }

  const leftKeys  = ['CSK', 'MI', 'RR'];
  const midKeys   = ['DC', 'GT', 'KKR', 'LSG'];
  const rightKeys = ['PBKS', 'RCB', 'SRH'];

  const renderCard = (key: string) => {
    const t = byShort[key];
    if (!t) return null;
    return (
      <div key={key} className="w-full">
        <TeamCard
          team={t}
          retained={retainedByTeam(t.id)}
          soldPlayers={soldPlayersByTeam(t.id)}
          editable={true}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">

      {/* ── Top Bar ──────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-xl md:text-2xl text-foreground">
            IPL 2026 — Live Auction Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            {isLive ? (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                <Wifi className="w-3 h-3" />
                Live — real-time sync active
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-500">
                <WifiOff className="w-3 h-3" />
                Connecting…
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ThemeToggle />
          <Button
            variant={showSummary ? 'default' : 'outline'}
            size="sm" className="text-xs gap-1.5"
            onClick={() => setShowSummary(s => !s)}
          >
            {showSummary ? '← Live View' : '📊 Summary'}
          </Button>
          <Link to="/host">
            <Button variant="outline" size="sm" className="text-xs">Host Panel</Button>
          </Link>
          <Button
            variant="ghost" size="sm"
            className="text-xs gap-1"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
        </div>
      </div>

      {showSummary ? (
        <AuctionSummary teams={teams} auctionPlayers={auctionPlayers} retainedPlayers={retainedPlayers} />
      ) : (
        <>
          {/* ── Live Auction Panel — opens /live page ─── */}
          {currentPlayer && (
            <div className="mb-4">
              <div
                className="rounded-xl border-2 border-live/60 bg-card p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => navigate('/live')}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full bg-live animate-pulse shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-live uppercase tracking-widest">Now Auctioning</p>
                    <p className="font-display font-black text-xl text-foreground">{currentPlayer.player_name}</p>
                    <p className="text-xs text-muted-foreground">{currentPlayer.role} · {currentPlayer.country}</p>
                  </div>
                </div>
                <Button className="gap-2 bg-live hover:bg-live/90 text-white font-bold" onClick={e=>{e.stopPropagation();navigate('/live');}}>
                  🔴 View Live Auction
                </Button>
              </div>
            </div>
          )}

          {/* ── Team Overview ──────────────────────────── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-display font-bold text-sm text-foreground">Team Overview</h2>
              {currentPlayer && (
                <span className="text-[11px] font-bold text-red-500 flex items-center gap-1 animate-pulse">
                  🔴 LIVE — {currentPlayer.player_name} on auction
                </span>
              )}
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center md:items-stretch justify-center">
              <div className="flex flex-col gap-4 flex-1 w-full justify-center">
                {leftKeys.map(k => renderCard(k))}
              </div>
              <div className="flex flex-col gap-4 flex-1 w-full justify-center">
                {midKeys.map(k => renderCard(k))}
              </div>
              <div className="flex flex-col gap-4 flex-1 w-full justify-center">
                {rightKeys.map(k => renderCard(k))}
              </div>
            </div>
          </div>

          {/* ── Recent Sales + Top Buys ─────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuctionLogFeed log={auctionLog} />
            <TopBuys players={auctionPlayers} teams={teams} />
          </div>
        </>
      )}
    </div>
  );
};

export default Index;
