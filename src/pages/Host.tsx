import { useState, useMemo } from 'react';
import { useAuctionData, auctionChannel } from '@/hooks/useAuctionData';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { BidTracker } from '@/components/BidTracker';
import { AddPlayerModal } from '@/components/AddPlayerModal';
import { EditPlayerModal } from '@/components/EditPlayerModal';
import { AcceleratedAuction } from '@/components/AcceleratedAuction';
import { RandomTeamGenerator } from '@/components/RandomTeamGenerator';
import { Pencil, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AuctionPlayer = Database['public']['Tables']['auction_players']['Row'];

const PASSCODE = 'IPL2026';

export default function HostPanel() {
  const [authenticated, setAuthenticated] = useState(() => {
    return localStorage.getItem('host_auth') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const { toast } = useToast();

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 w-full max-w-sm">
          <h1 className="font-display font-bold text-2xl text-foreground mb-4 text-center">Host Login</h1>
          <p className="text-sm text-muted-foreground mb-4 text-center">Enter the auction passcode</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (passcode === PASSCODE) {
              localStorage.setItem('host_auth', 'true');
              setAuthenticated(true);
            } else {
              toast({ title: 'Wrong passcode', variant: 'destructive' });
            }
          }}>
            <Input
              type="password"
              value={passcode}
              onChange={e => setPasscode(e.target.value)}
              placeholder="Enter passcode"
              className="mb-4"
            />
            <Button type="submit" className="w-full">Enter Auction Room</Button>
          </form>
        </div>
      </div>
    );
  }

  return <HostDashboard />;
}

function HostDashboard() {
  const {
    teams,
    auctionPlayers,
    currentPlayer,
    auctionLog,
    refetch,
    soldPlayersByTeam,
  } = useAuctionData();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSet, setFilterSet] = useState('all');
  const [editPlayer, setEditPlayer] = useState<AuctionPlayer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AuctionPlayer | null>(null);

  const setNumbers = useMemo(() => {
    const sets = new Map<number, { name: string; count: number }>();
    auctionPlayers.forEach(p => {
      const num = p.set_number ?? -1;
      if (!sets.has(num)) {
        sets.set(num, { name: p.set_name || `Set ${num}`, count: 0 });
      }
      sets.get(num)!.count++;
    });
    return Array.from(sets.entries()).sort((a, b) => a[0] - b[0]);
  }, [auctionPlayers]);

  const filteredPlayers = useMemo(() => {
    return auctionPlayers.filter(p => {
      const matchSearch = !search || p.player_name.toLowerCase().includes(search.toLowerCase());
      const matchRole = filterRole === 'all' || p.role === filterRole;
      const matchStatus = filterStatus === 'all' || p.status === filterStatus;
      const matchSet = filterSet === 'all' || String(p.set_number) === filterSet;
      return matchSearch && matchRole && matchStatus && matchSet;
    }).slice(0, 100);
  }, [auctionPlayers, search, filterRole, filterStatus, filterSet]);

  // Get unique roles from the dataset
  const uniqueRoles = useMemo(() => {
    const roles = new Set<string>();
    auctionPlayers.forEach(p => { if (p.role) roles.add(p.role); });
    return Array.from(roles).sort();
  }, [auctionPlayers]);

  const setAsCurrent = async (playerId: string) => {
    auctionChannel.send({
      type: 'broadcast',
      event: 'auction:player_status',
      payload: { playerId, status: 'current' }
    });

    await supabase.from('auction_players').update({ status: 'available', current_bid: null, leading_team_id: null, timer_started_at: null } as any).eq('status', 'current');
    const player = auctionPlayers.find(p => p.id === playerId);
    const baseCr = player ? player.base_price / 100 : 0;
    await supabase.from('auction_players').update({ status: 'current', current_bid: baseCr, leading_team_id: null, timer_started_at: null } as any).eq('id', playerId);
    
    auctionChannel.send({ type: 'broadcast', event: 'auction:refresh' });
    toast({ title: 'Player set as current' });
  };

  const undoLastSale = async () => {
    if (auctionLog.length === 0) return;
    const last = auctionLog[0];

    if (last.action === 'unsold') {
      await supabase.from('auction_log').delete().eq('id', last.id);
      if (last.player_id) {
        await supabase.from('auction_players').update({ status: 'available', current_bid: null, leading_team_id: null } as any).eq('id', last.player_id);
      }
      toast({ title: `Undo: ${last.player_name} set back to available` });
      return;
    }

    if (last.action === 'sold') {
      if (last.player_id) {
        await supabase.from('auction_players').update({
          status: 'available',
          sold_to_team: null,
          sold_price: null,
          current_bid: null,
          leading_team_id: null,
        } as any).eq('id', last.player_id);
      }
      if (last.team_id && last.sold_price) {
        const team = teams.find(t => t.id === last.team_id);
        if (team) {
          await supabase.from('teams').update({
            spent_budget: Math.max(0, team.spent_budget - last.sold_price),
          }).eq('id', last.team_id);
        }
      }
    } else {
      if (last.player_id) {
        await supabase.from('auction_players').update({ status: 'available', current_bid: null, leading_team_id: null } as any).eq('id', last.player_id);
      }
    }

    await supabase.from('auction_log').delete().eq('id', last.id);
    auctionChannel.send({ type: 'broadcast', event: 'auction:refresh' });
    toast({ title: `Undid: ${last.player_name} (${last.action})` });
  };

  const [showRestartConfirm, setShowRestartConfirm] = useState(false);

  const restartAuction = async () => {
    await supabase.from('auction_players').update({
      status: 'available',
      sold_to_team: null,
      sold_price: null,
      current_bid: null,
      leading_team_id: null,
    } as any).neq('status', 'available');
    await supabase.from('teams').update({ spent_budget: 0 }).gt('spent_budget', 0);
    await supabase.from('auction_log').delete().gte('created_at', '2000-01-01');

    // Clear team owner assignments
    localStorage.removeItem('auction_team_owners');
    auctionChannel.send({
      type: 'broadcast',
      event: 'team:assignment:update',
      payload: { assignments: {} }
    });

    setShowRestartConfirm(false);
    auctionChannel.send({ type: 'broadcast', event: 'auction:refresh' });
    toast({ title: 'Auction restarted! All data has been reset.' });
  };

  return (
    <div className="min-h-screen p-4 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-foreground">Auctioneer Control Panel</h1>
          <p className="text-xs text-muted-foreground">Manage the live auction</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/">
            <Button variant="outline" size="sm" className="text-xs">View Dashboard</Button>
          </Link>
          <Button variant="destructive" size="sm" className="text-xs" onClick={undoLastSale}>
            ↩ Undo Last
          </Button>
          <Button variant="outline" size="sm" className="text-xs border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => setShowRestartConfirm(true)}>
            🔄 Restart Auction
          </Button>
        </div>
      </div>

      {/* Restart Confirmation Dialog */}
      {showRestartConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full space-y-4">
            <h2 className="font-display font-bold text-lg text-foreground">⚠️ Restart Auction?</h2>
            <p className="text-sm text-muted-foreground">
              This will reset <strong>all players</strong> to available, clear <strong>all sales</strong>, reset <strong>all team budgets</strong>, and delete the <strong>auction log</strong>. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={restartAuction}>Yes, Restart</Button>
              <Button variant="outline" className="flex-1" onClick={() => setShowRestartConfirm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Bid Tracker + Accelerated Auction + Team Budgets */}
        <div className="lg:col-span-1 space-y-4">
          {currentPlayer ? (
            <BidTracker currentPlayer={currentPlayer} teams={teams} onComplete={() => {}} />
          ) : (
            <div className="bg-card border border-border rounded-lg p-4 text-center text-sm text-muted-foreground">
              No player currently being auctioned. Select one from the player list.
            </div>
          )}

          {/* Accelerated Auction */}
          <AcceleratedAuction auctionPlayers={auctionPlayers} onComplete={() => {}} />

          {/* Random Team Generator */}
          <RandomTeamGenerator teams={teams} onSaved={() => {}} />

          {/* Team Budget Monitor */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="font-display font-bold text-sm mb-2">Team Budgets</h3>
            <div className="space-y-1">
              {teams.map(t => {
                const remaining = t.total_budget - t.spent_budget;
                const sold = soldPlayersByTeam(t.id);
                return (
                  <div key={t.id} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="font-medium">{t.short_name}</span>
                      <span className="text-muted-foreground">({sold.length}/{t.player_slots})</span>
                    </div>
                    <span style={{ color: t.color }} className="font-medium">₹{remaining.toFixed(2)} Cr</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Player Browser */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-lg">
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm">Player Browser</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {auctionPlayers.length} players · {filteredPlayers.length} shown
                  </span>
                </div>
                <AddPlayerModal onAdded={refetch} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Search player..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 min-w-[150px] h-8 text-xs"
                />
                <Select value={filterSet} onValueChange={setFilterSet}>
                  <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">All Sets</SelectItem>
                    {setNumbers.map(([num, { name, count }]) => (
                      <SelectItem key={num} value={String(num)}>{name} ({count})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {uniqueRoles.map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="unsold">Unsold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="text-left p-2">Set</th>
                    <th className="text-left p-2">Player</th>
                    <th className="text-left p-2">Country</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-right p-2">Base</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-center p-2">Action</th>
                    <th className="text-center p-2">Update</th>
                    <th className="text-center p-2">Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.map(p => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-2">{p.set_name || p.set_number}</td>
                      <td className="p-2 font-medium">{p.player_name}</td>
                      <td className="p-2">{p.country}</td>
                      <td className="p-2">{p.role}</td>
                      <td className="p-2 text-right">₹{p.base_price}L</td>
                      <td className="p-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          p.status === 'available' ? 'bg-primary/20 text-primary' :
                          p.status === 'sold' ? 'bg-sold/20 text-sold' :
                          p.status === 'current' ? 'bg-live/20 text-live' :
                          'bg-unsold/20 text-unsold'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        {(p.status === 'available' || p.status === 'unsold') && (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setAsCurrent(p.id)}>
                            Set Current
                          </Button>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setEditPlayer(p)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </td>
                      <td className="p-2 text-center">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(p)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Player Modal */}
      {editPlayer && (
        <EditPlayerModal
          player={editPlayer}
          open={!!editPlayer}
          onOpenChange={(open) => { if (!open) setEditPlayer(null); }}
          onUpdated={refetch}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg p-6 max-w-sm w-full space-y-4">
            <h2 className="font-display font-bold text-lg text-foreground">Delete Player?</h2>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <strong>{deleteConfirm.player_name}</strong>? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1" onClick={async () => {
                await supabase.from('auction_players').delete().eq('id', deleteConfirm.id);
                toast({ title: `🗑️ ${deleteConfirm.player_name} deleted` });
                setDeleteConfirm(null);
                refetch();
              }}>Yes, Delete</Button>
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
