import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];

interface Props {
  auctionPlayers: AuctionPlayer[];
  onComplete: () => void;
}

export function AcceleratedAuction({ auctionPlayers, onComplete }: Props) {
  const { toast } = useToast();

  const unsoldPlayers = useMemo(() =>
    auctionPlayers.filter(p => p.status === 'unsold'),
    [auctionPlayers]
  );

  const setAsCurrent = async (playerId: string) => {
    // Clear any current player first
    await supabase.from('auction_players').update({
      status: 'available', current_bid: null, leading_team_id: null
    } as any).eq('status', 'current');

    const player = auctionPlayers.find(p => p.id === playerId);
    const baseCr = player ? player.base_price / 100 : 0;
    await supabase.from('auction_players').update({
      status: 'current', current_bid: baseCr, leading_team_id: null
    } as any).eq('id', playerId);

    toast({ title: `${player?.player_name} set for accelerated auction` });
    onComplete();
  };

  if (unsoldPlayers.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-bold text-sm text-foreground">
          ⚡ Accelerated Auction
        </h3>
        <span className="text-[10px] bg-unsold/20 text-unsold px-1.5 py-0.5 rounded font-medium">
          {unsoldPlayers.length} unsold
        </span>
      </div>
      <div className="space-y-1 max-h-[200px] overflow-y-auto scrollbar-thin">
        {unsoldPlayers.map(p => (
          <div key={p.id} className="flex items-center justify-between text-xs py-1.5 px-2 rounded bg-muted/20 hover:bg-muted/40">
            <div>
              <span className="font-medium text-foreground">{p.player_name}</span>
              <span className="text-muted-foreground ml-1.5">{p.role} · ₹{p.base_price}L</span>
            </div>
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setAsCurrent(p.id)}>
              Re-Auction
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
