import { useMemo } from 'react';
import type { Database } from '@/integrations/supabase/types';

type Team = Database['public']['Tables']['teams']['Row'];
type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];
type RetainedPlayer = Database['public']['Tables']['retained_players']['Row'];

interface Props {
  teams: Team[];
  auctionPlayers: AuctionPlayer[];
  retainedPlayers: RetainedPlayer[];
}

export function AuctionSummary({ teams, auctionPlayers, retainedPlayers }: Props) {
  const soldPlayers = useMemo(() => auctionPlayers.filter(p => p.status === 'sold'), [auctionPlayers]);
  const unsoldPlayers = useMemo(() => auctionPlayers.filter(p => p.status === 'unsold'), [auctionPlayers]);

  const teamSummaries = useMemo(() => {
    return teams.map(team => {
      const bought = soldPlayers.filter(p => p.sold_to_team === team.id);
      const retained = retainedPlayers.filter(p => p.team_id === team.id);
      const totalSpent = bought.reduce((sum, p) => sum + (p.sold_price ?? 0), 0);
      const overseas = bought.filter(p => p.country !== 'India').length;
      const purseLeft = team.total_budget - team.spent_budget;
      const mostExpensive = bought.sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0))[0];

      return {
        team,
        bought,
        retained,
        totalSpent,
        overseas,
        purseLeft,
        totalSquad: bought.length + retained.length,
        mostExpensive,
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [teams, soldPlayers, retainedPlayers]);

  const topBuys = useMemo(() => {
    return [...soldPlayers]
      .sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0))
      .slice(0, 10);
  }, [soldPlayers]);

  const totalSpentAll = soldPlayers.reduce((s, p) => s + (p.sold_price ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-4 border-b border-border">
        <h2 className="font-display font-bold text-3xl text-primary">🏆 Auction Summary</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {soldPlayers.length} players sold • {unsoldPlayers.length} unsold • ₹{totalSpentAll.toFixed(2)} Cr total spend
        </p>
      </div>

      {/* Team-wise Summary Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="p-3 bg-secondary/50 border-b border-border">
          <h3 className="font-display font-bold text-sm text-foreground">Team-wise Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left p-3 font-display font-semibold text-muted-foreground">Team</th>
                <th className="text-center p-3 font-display font-semibold text-muted-foreground">Bought</th>
                <th className="text-center p-3 font-display font-semibold text-muted-foreground">Squad</th>
                <th className="text-center p-3 font-display font-semibold text-muted-foreground">✈️ Overseas</th>
                <th className="text-right p-3 font-display font-semibold text-muted-foreground">Spent</th>
                <th className="text-right p-3 font-display font-semibold text-muted-foreground">Purse Left</th>
                <th className="text-left p-3 font-display font-semibold text-muted-foreground">Top Buy</th>
              </tr>
            </thead>
            <tbody>
              {teamSummaries.map(({ team, bought, retained, totalSpent, overseas, purseLeft, totalSquad, mostExpensive }) => (
                <tr key={team.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {team.logo_url && (
                        <img src={team.logo_url} alt={team.short_name} className="w-6 h-6 object-contain" />
                      )}
                      <span
                        className="font-display font-bold text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: team.color, color: '#fff' }}
                      >
                        {team.short_name}
                      </span>
                      <span className="text-xs text-muted-foreground hidden md:inline">{team.name}</span>
                    </div>
                  </td>
                  <td className="text-center p-3 font-semibold text-foreground">{bought.length}</td>
                  <td className="text-center p-3 font-semibold text-foreground">{totalSquad}</td>
                  <td className="text-center p-3 text-foreground">{overseas}</td>
                  <td className="text-right p-3 font-bold text-sold">₹{totalSpent.toFixed(2)} Cr</td>
                  <td className="text-right p-3 text-primary font-semibold">₹{purseLeft.toFixed(2)} Cr</td>
                  <td className="p-3 text-xs">
                    {mostExpensive ? (
                      <span>
                        <span className="text-foreground">{mostExpensive.player_name}</span>
                        <span className="text-sold ml-1">(₹{mostExpensive.sold_price?.toFixed(2)})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Buys */}
      {topBuys.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-3 bg-secondary/50 border-b border-border">
            <h3 className="font-display font-bold text-sm text-foreground">🔥 Top 10 Most Expensive Buys</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-center p-3 font-display font-semibold text-muted-foreground w-10">#</th>
                  <th className="text-left p-3 font-display font-semibold text-muted-foreground">Player</th>
                  <th className="text-left p-3 font-display font-semibold text-muted-foreground">Role</th>
                  <th className="text-left p-3 font-display font-semibold text-muted-foreground">Country</th>
                  <th className="text-left p-3 font-display font-semibold text-muted-foreground">Team</th>
                  <th className="text-right p-3 font-display font-semibold text-muted-foreground">Price</th>
                </tr>
              </thead>
              <tbody>
                {topBuys.map((player, i) => {
                  const team = teams.find(t => t.id === player.sold_to_team);
                  return (
                    <tr key={player.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="text-center p-3 font-display font-bold text-muted-foreground">{i + 1}</td>
                      <td className="p-3 font-semibold text-foreground">{player.player_name}</td>
                      <td className="p-3 text-muted-foreground">{player.role ?? '—'}</td>
                      <td className="p-3 text-muted-foreground">{player.country ?? '—'}</td>
                      <td className="p-3">
                        {team ? (
                          <span
                            className="font-display font-bold text-xs px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: team.color, color: '#fff' }}
                          >
                            {team.short_name}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="text-right p-3 font-bold text-sold">₹{player.sold_price?.toFixed(2)} Cr</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Unsold Players */}
      {unsoldPlayers.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="p-3 bg-secondary/50 border-b border-border">
            <h3 className="font-display font-bold text-sm text-foreground">❌ Unsold Players ({unsoldPlayers.length})</h3>
          </div>
          <div className="p-3 flex flex-wrap gap-1.5">
            {unsoldPlayers.map(p => (
              <span key={p.id} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                {p.player_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
