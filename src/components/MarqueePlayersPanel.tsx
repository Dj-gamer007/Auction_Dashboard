import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];

interface Props {
  auctionPlayers: AuctionPlayer[];
  onSetCurrent: (playerId: string) => void;
}

export function MarqueePlayersPanel({ auctionPlayers, onSetCurrent }: Props) {
  const [open, setOpen] = useState(true);

  // Filter marquee players by set_name containing "Marquee"
  const marqueeMatches = auctionPlayers.filter(p => 
    p.set_name?.toLowerCase().includes('marquee')
  );

  const available = marqueeMatches.filter(p => p.status === 'available');
  const sold = marqueeMatches.filter(p => p.status === 'sold');
  const unsold = marqueeMatches.filter(p => p.status === 'unsold');

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card border border-border rounded-lg">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
            <span className="font-display font-bold text-sm">⭐ Marquee Players ({available.length} available)</span>
            <span className="text-xs text-muted-foreground">{open ? '▲ Hide' : '▼ Show'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3">
            <div className="overflow-x-auto max-h-[300px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-1.5">Player</th>
                    <th className="text-left p-1.5">Role</th>
                    <th className="text-left p-1.5">Country</th>
                    <th className="text-right p-1.5">Base</th>
                    <th className="text-center p-1.5">Status</th>
                    <th className="text-center p-1.5">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {marqueeMatches.map(p => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-1.5 font-medium">{p.player_name}</td>
                      <td className="p-1.5">{p.role}</td>
                      <td className="p-1.5">{p.country}</td>
                      <td className="p-1.5 text-right">₹{p.base_price}L</td>
                      <td className="p-1.5 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.status === 'available' ? 'bg-primary/20 text-primary' :
                          p.status === 'sold' ? 'bg-sold/20 text-sold' :
                          p.status === 'current' ? 'bg-live/20 text-live' :
                          'bg-unsold/20 text-unsold'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-1.5 text-center">
                        {p.status === 'available' && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => onSetCurrent(p.id)}>
                            Set Current
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
              <span>✅ {sold.length} sold</span>
              <span>❌ {unsold.length} unsold</span>
              <span>🔵 {available.length} available</span>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
