import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];
type Team = Database['public']['Tables']['teams']['Row'];

interface Props { players: AuctionPlayer[]; teams: Team[] }

export function TopBuys({ players, teams }: Props) {
  const topBuys = useMemo(() =>
    players.filter(p => p.status === 'sold' && p.sold_price != null)
      .sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0)).slice(0, 3),
    [players]);

  const medals = ['🥇','🥈','🥉'];

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-foreground">🔥 Top 3 Buys</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Highest price</span>
      </div>
      <div className="p-2 space-y-1.5">
        {topBuys.length === 0 && <div className="text-xs text-muted-foreground text-center py-4">No sales yet</div>}
        {topBuys.map((player, i) => {
          const team = teams.find(t => t.id === player.sold_to_team);
          return (
            <div key={player.id} className="text-xs py-2 px-2.5 rounded-lg bg-muted/30 flex items-center justify-between gap-2">
              <span className="text-base leading-none shrink-0">{medals[i]}</span>
              <span className="font-semibold text-foreground truncate flex-1">{player.player_name}</span>
              {team && <span className="font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: team.color, color: '#fff' }}>{team.short_name}</span>}
              <span className="text-sold font-black shrink-0">₹{player.sold_price?.toFixed(2)} Cr</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
