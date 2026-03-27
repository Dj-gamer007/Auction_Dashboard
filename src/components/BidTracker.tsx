import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { auctionChannel } from '@/hooks/useAuctionData';
import type { Database } from '@/integrations/supabase/types';

function playSoldSound() {
  const ctx = new AudioContext();
  const hit = ctx.createOscillator();
  const hitGain = ctx.createGain();
  hit.type = 'square';
  hit.frequency.setValueAtTime(200, ctx.currentTime);
  hit.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);
  hitGain.gain.setValueAtTime(0.6, ctx.currentTime);
  hitGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
  hit.connect(hitGain).connect(ctx.destination);
  hit.start(ctx.currentTime);
  hit.stop(ctx.currentTime + 0.2);

  const chime = ctx.createOscillator();
  const chimeGain = ctx.createGain();
  chime.type = 'sine';
  chime.frequency.setValueAtTime(523, ctx.currentTime + 0.25);
  chime.frequency.setValueAtTime(659, ctx.currentTime + 0.4);
  chime.frequency.setValueAtTime(784, ctx.currentTime + 0.55);
  chimeGain.gain.setValueAtTime(0.3, ctx.currentTime + 0.25);
  chimeGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.9);
  chime.connect(chimeGain).connect(ctx.destination);
  chime.start(ctx.currentTime + 0.25);
  chime.stop(ctx.currentTime + 0.9);
}

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface Props {
  currentPlayer: AuctionPlayer;
  teams: Team[];
  onComplete: () => void;
}

const BID_INCREMENTS = [
  { label: '+5L', value: 0.05 },
  { label: '+10L', value: 0.10 },
  { label: '+20L', value: 0.20 },
  { label: '+25L', value: 0.25 },
  { label: '+50L', value: 0.50 },
  { label: '+1 Cr', value: 1.00 },
];

export function BidTracker({ currentPlayer, teams, onComplete }: Props) {
  const { toast } = useToast();
  const [selectedTeam, setSelectedTeam] = useState('');
  const [soldPrice, setSoldPrice] = useState('');

  const [optimisticBid, setOptimisticBid] = useState<number | null>(null);
  const [optimisticTeamId, setOptimisticTeamId] = useState<string | null>(null);

  const currentBid = optimisticBid !== null ? optimisticBid : (currentPlayer as any).current_bid as number | null;
  const leadingTeamId = optimisticTeamId !== null ? optimisticTeamId : (currentPlayer as any).leading_team_id as string | null;
  const basePriceCr = currentPlayer.base_price / 100;
  const displayBid = currentBid ?? basePriceCr;

  const leadingTeam = teams.find(t => t.id === leadingTeamId);

  const incrementBid = async (amount: number) => {
    const newBid = displayBid + amount;
    const newTeamId = selectedTeam || leadingTeamId;

    // 1. Optimistic local update (instant 0ms Host UI reflex)
    setOptimisticBid(newBid);
    setOptimisticTeamId(newTeamId);
    setSoldPrice(newBid.toFixed(2));

    // 2. Broadcast precisely to viewers via WebSockets (instant <50ms Viewer UI reflex)
    auctionChannel.send({
      type: 'broadcast',
      event: 'auction:sync_bid',
      payload: { playerId: currentPlayer.id, currentBid: newBid, leadingTeamId: newTeamId }
    });

    // 3. Persist async to database (background)
    await supabase.from('auction_players').update({
      current_bid: newBid,
      leading_team_id: newTeamId,
    } as any).eq('id', currentPlayer.id);
  };

  const resetBid = async () => {
    setOptimisticBid(null);
    setOptimisticTeamId(null);
    
    await supabase.from('auction_players').update({
      current_bid: basePriceCr,
      leading_team_id: null,
      timer_started_at: null,
    } as any).eq('id', currentPlayer.id);
    
    auctionChannel.send({
      type: 'broadcast',
      event: 'auction:sync_bid',
      payload: { playerId: currentPlayer.id, currentBid: null, leadingTeamId: null }
    });

    setSelectedTeam('');
    onComplete();
  };

  const confirmSale = async () => {
    const price = soldPrice ? parseFloat(soldPrice) : displayBid;
    const teamId = selectedTeam || leadingTeamId;
    if (!teamId || !price) {
      toast({ title: 'Select a team and ensure bid is set', variant: 'destructive' });
      return;
    }

    const team = teams.find(t => t.id === teamId);
    if (!team) {
      toast({ title: 'Invalid team selected', variant: 'destructive' });
      return;
    }

    try {
      // Optimistically trigger global UI transition immediately
      auctionChannel.send({
        type: 'broadcast',
        event: 'auction:player_status',
        payload: { 
          playerId: currentPlayer.id, 
          status: 'sold',
          soldToTeam: teamId,
          soldPrice: price
        }
      });

      const { error: playerError } = await supabase.from('auction_players').update({
        status: 'sold' as any,
        sold_to_team: teamId,
        sold_price: price,
        current_bid: null,
        leading_team_id: null,
        timer_started_at: null,
      } as any).eq('id', currentPlayer.id);

      if (playerError) throw playerError;

      const { error: teamError } = await supabase.from('teams').update({
        spent_budget: team.spent_budget + price,
      }).eq('id', teamId);

      if (teamError) throw teamError;

      const { error: logError } = await supabase.from('auction_log').insert({
        player_id: currentPlayer.id,
        team_id: teamId,
        player_name: currentPlayer.player_name,
        team_name: team.short_name,
        sold_price: price,
        action: 'sold',
      });

      if (logError) throw logError;

      setSoldPrice('');
      setSelectedTeam('');
      playSoldSound();

      // Universal force sync backstop
      auctionChannel.send({ type: 'broadcast', event: 'auction:refresh' });
      toast({ title: `${currentPlayer.player_name} sold to ${team.short_name} for ₹${price.toFixed(2)} Cr!` });
    } catch (err: any) {
      console.error('Sale error:', err);
      toast({ title: 'Error confirming sale', description: err.message, variant: 'destructive' });
    }
  };

  const markUnsold = async () => {
    try {
      // Optimistically trigger global UI transition immediately
      auctionChannel.send({
        type: 'broadcast',
        event: 'auction:player_status',
        payload: { 
          playerId: currentPlayer.id, 
          status: 'unsold'
        }
      });

      const { error: playerError } = await supabase.from('auction_players').update({
        status: 'unsold' as any,
        current_bid: null,
        leading_team_id: null,
        timer_started_at: null,
      } as any).eq('id', currentPlayer.id);

      if (playerError) throw playerError;

      const { error: logError } = await supabase.from('auction_log').insert({
        player_id: currentPlayer.id,
        player_name: currentPlayer.player_name,
        action: 'unsold',
      });

      if (logError) throw logError;

      // Universal force sync backstop
      auctionChannel.send({ type: 'broadcast', event: 'auction:refresh' });
      toast({ title: `${currentPlayer.player_name} marked as unsold` });
    } catch (err: any) {
      console.error('Unsold error:', err);
      toast({ title: 'Error marking as unsold', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      {/* Player Info */}
      <div className="flex items-center gap-4">
        {(currentPlayer as any).image_url && (currentPlayer as any).image_url !== 'none' && (
          <img 
            src={(currentPlayer as any).image_url} 
            alt={currentPlayer.player_name} 
            className="w-16 h-16 rounded-lg object-cover border border-border"
          />
        )}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-live live-pulse" />
            <span className="text-xs font-bold text-live uppercase tracking-wider">Now Auctioning</span>
          </div>
          <h2 className="font-display font-bold text-xl text-foreground leading-tight">{currentPlayer.player_name}</h2>
          <p className="text-xs text-muted-foreground">
            {currentPlayer.role} | {currentPlayer.country} | Base: ₹{currentPlayer.base_price >= 100 ? `${basePriceCr.toFixed(2)} Cr` : `${currentPlayer.base_price} L`}
          </p>
        </div>
      </div>

      {/* Live Bid Tracker */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">Current Bid</div>
            <div className="font-display font-bold text-2xl text-live">₹{displayBid.toFixed(2)} Cr</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Leading Bidder</div>
            <div className="font-display font-bold text-sm" style={leadingTeam ? { color: leadingTeam.color } : {}}>
              {leadingTeam ? leadingTeam.short_name : 'None'}
            </div>
          </div>
        </div>

        {/* Team selector for bid */}
        <Select value={selectedTeam} onValueChange={setSelectedTeam}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select bidding team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.short_name} — ₹{(t.total_budget - t.spent_budget).toFixed(2)} Cr left
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bid Increment Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {BID_INCREMENTS.map(inc => (
            <Button
              key={inc.label}
              size="sm"
              onClick={() => incrementBid(inc.value)}
              className="h-10 font-bold text-sm bg-accent text-accent-foreground hover:bg-accent/80"
            >
              {inc.label}
            </Button>
          ))}
        </div>

        <Button variant="outline" size="sm" className="w-full text-xs" onClick={resetBid}>
          ↺ Reset Bid to Base
        </Button>
      </div>

      {/* Confirm Sale */}
      <div className="space-y-2">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sold Price (auto-filled, editable)</label>
          <input
            type="number"
            step="0.05"
            min="0"
            value={soldPrice || displayBid.toFixed(2)}
            onChange={e => setSoldPrice(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={confirmSale} className="flex-1">✅ Confirm Sale</Button>
          <Button variant="outline" onClick={markUnsold} className="flex-1">❌ Unsold</Button>
        </div>
      </div>
    </div>
  );
}
