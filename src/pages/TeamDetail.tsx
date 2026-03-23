import { useParams, Link } from 'react-router-dom';
import { useAuctionData } from '@/hooks/useAuctionData';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useMemo } from 'react';

const ROLE_CATEGORIES = [
  { label: 'BATSMEN',     keys: ['BATTER', 'BATSMAN', 'BATSMEN', 'BAT'] },
  { label: 'WK BATTER',  keys: ['WICKETKEEPER', 'WK-BATTER', 'WK BATTER', 'WICKET-KEEPER', 'WK'] },
  { label: 'ALLROUNDER', keys: ['ALL-ROUNDER', 'ALLROUNDER', 'ALL ROUNDER', 'AR'] },
  { label: 'FAST BOWLER',keys: ['FAST BOWLER', 'PACER', 'PACE', 'SEAMER', 'FAST', 'BOWLER'] },
  { label: 'SPIN BOWLER', keys: ['SPINNER', 'SPIN', 'SPIN BOWLER'] },
];

function categorizeRole(role: string | null): string {
  if (!role) return 'BATSMEN';
  const upper = role.toUpperCase().trim();
  
  // 1. Strict priority for compound/overlapping words
  if (upper.includes('WK') || upper.includes('WICKET')) return 'WK-BATTER';
  if (upper.includes('SPIN')) return 'SPIN BOWLER';
  if (upper.includes('ALL-ROUND') || upper.includes('ALLROUND') || upper.includes('AR')) return 'ALLROUNDER';
  if (upper.includes('FAST') || upper.includes('PACE') || upper.includes('SEAM')) return 'FAST BOWLER';
  if (upper.includes('BAT')) return 'BATSMEN';
  if (upper.includes('BOWL')) return 'FAST BOWLER';

  // Fallback
  for (const cat of ROLE_CATEGORIES) {
    if (cat.keys.some(k => upper === k)) return cat.label;
  }
  return 'BATSMEN';
}

function fmtPrice(price: number | null | undefined): string {
  if (price == null) return '';
  return `₹${Math.round(price * 100) / 100}`;
}

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const { teams, soldPlayersByTeam, retainedByTeam, loading } = useAuctionData();

  const team = teams.find(t => t.id === teamId);
  const retained = teamId ? retainedByTeam(teamId) : [];
  const soldPlayers = teamId ? soldPlayersByTeam(teamId) : [];

  const remaining = team ? team.total_budget - team.spent_budget : 0;
  const totalPlayers = soldPlayers.length + retained.length;
  const overseasCount =
    soldPlayers.filter(p => p.country !== 'India').length +
    retained.filter(r => r.nationality !== 'India' && r.nationality != null).length;

  const allPlayers = useMemo(() => [
    ...retained.map(p => ({
      name: p.player_name,
      price: p.retention_price,
      overseas: p.nationality !== 'India' && p.nationality != null,
      role: categorizeRole(p.role),
      isRetained: true,
    })),
    ...soldPlayers.map(p => ({
      name: p.player_name,
      price: p.sold_price,
      overseas: p.country !== 'India' && p.country != null,
      role: categorizeRole(p.role),
      isRetained: false,
    })),
  ], [retained, soldPlayers]);

  const roleGroups = useMemo(() =>
    ROLE_CATEGORIES
      .map(cat => ({
        label: cat.label,
        players: allPlayers
          .filter(p => p.role === cat.label)
          .sort((a, b) => (b.price ?? 0) - (a.price ?? 0)),
      }))
      .filter(g => g.players.length > 0),
    [allPlayers]
  );

  const topBuys = useMemo(() =>
    [...soldPlayers]
      .filter(p => p.sold_price != null)
      .sort((a, b) => (b.sold_price ?? 0) - (a.sold_price ?? 0))
      .slice(0, 5),
    [soldPlayers]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="font-display text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="font-display text-xl text-muted-foreground mb-4">Team not found</div>
          <Link to="/"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 max-w-[1200px] mx-auto">
      <Link to="/">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
        </Button>
      </Link>

      {/* Team Header — matches image */}
      <div
        className="rounded-xl p-6 mb-6 border border-border/50"
        style={{
          background: `linear-gradient(135deg, ${team.color}18 0%, hsl(var(--card)) 80%)`,
          borderLeft: `5px solid ${team.color}`,
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          {team.logo_url && (
            <img src={team.logo_url} alt={team.short_name} className="w-14 h-14 object-contain" />
          )}
          <div>
            <h1 className="font-display font-bold text-3xl text-foreground">{team.name}</h1>
            <span
              className="font-display font-bold text-sm px-3 py-1 rounded mt-1 inline-block"
              style={{ backgroundColor: team.color, color: '#fff' }}
            >
              {team.short_name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Purse Left', value: `₹${remaining.toFixed(2)} Cr`, colored: true },
            { label: 'Spent',      value: `₹${team.spent_budget.toFixed(2)} Cr`, colored: false },
            { label: 'Players',    value: `${totalPlayers}/${team.player_slots}`, colored: false },
            { label: 'Overseas',   value: `${overseasCount}/${team.overseas_slots}`, colored: false },
          ].map(stat => (
            <div key={stat.label} className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
              <div className="text-xs text-muted-foreground mb-1">{stat.label}</div>
              <div
                className="font-display font-bold text-2xl"
                style={stat.colored ? { color: team.color } : {}}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Buys */}
      {topBuys.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display font-bold text-lg text-foreground mb-3">Top Buys</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {topBuys.map(p => (
              <div
                key={p.id}
                className="rounded-xl border border-border/40 p-3 text-center"
                style={{ background: `${team.color}12` }}
              >
                <div className="font-bold text-sm text-foreground leading-tight">{p.player_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.role}</div>
                <div className="font-display font-bold text-base mt-2" style={{ color: team.color }}>
                  {fmtPrice(p.sold_price)} Cr
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Squad Breakdown */}
      <h2 className="font-display font-bold text-lg text-foreground mb-3">Squad Breakdown</h2>
      {roleGroups.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          No players yet. They'll appear here once bought or retained.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roleGroups.map(group => (
            <div
              key={group.label}
              className="rounded-xl border border-border/40 p-4"
              style={{ background: `${team.color}08` }}
            >
              {/* Category Header */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: team.color }}>
                  {group.label}
                </span>
                <span
                  className="text-xs font-bold rounded px-2 py-0.5"
                  style={{ backgroundColor: `${team.color}25`, color: team.color }}
                >
                  {group.players.length}
                </span>
              </div>
              {/* Player rows */}
              <div className="space-y-2">
                {group.players.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 text-foreground">
                      {p.overseas && <span className="text-xs">✈️</span>}
                      {p.name}
                      {p.isRetained && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">RTM</span>
                      )}
                    </span>
                    {p.price != null && (
                      <span className="font-bold whitespace-nowrap ml-2" style={{ color: team.color }}>
                        {fmtPrice(p.price)} Cr
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
