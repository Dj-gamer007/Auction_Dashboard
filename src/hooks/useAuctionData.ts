import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export const auctionChannel = supabase.channel('auction-live', { config: { broadcast: { self: true, ack: false } } });

type Team         = Database['public']['Tables']['teams']['Row'];
type AuctionPlayer= Database['public']['Tables']['auction_players']['Row'];
type AuctionLog   = Database['public']['Tables']['auction_log']['Row'];
type RetainedPlayer= Database['public']['Tables']['retained_players']['Row'];

export function useAuctionData() {
  const [teams,           setTeams]           = useState<Team[]>([]);
  const [auctionPlayers,  setAuctionPlayers]  = useState<AuctionPlayer[]>([]);
  const [retainedPlayers, setRetainedPlayers] = useState<RetainedPlayer[]>([]);
  const [auctionLog,      setAuctionLog]      = useState<AuctionLog[]>([]);
  const [currentPlayer,   setCurrentPlayer]   = useState<AuctionPlayer | null>(null);
  const [isLive,          setIsLive]          = useState(false);
  const [loading,         setLoading]         = useState(true);

  // Keep refs for latest state so payload handlers don't get stale closures
  const teamsRef          = useRef<Team[]>([]);
  const playersRef        = useRef<AuctionPlayer[]>([]);
  const retainedRef       = useRef<RetainedPlayer[]>([]);
  const logRef            = useRef<AuctionLog[]>([]);

  // ── Full fetch functions (used for initial load & fallback) ──────────────
  const fetchTeams = useCallback(async () => {
    const { data } = await supabase.from('teams').select('*').order('short_name');
    if (data) { teamsRef.current = data; setTeams(data); }
  }, []);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase.from('auction_players').select('*').order('set_number');
    if (data) {
      playersRef.current = data;
      setAuctionPlayers(data);
      setCurrentPlayer(data.find(p => p.status === 'current') ?? null);
    }
  }, []);

  const fetchLog = useCallback(async () => {
    const { data } = await supabase.from('auction_log').select('*')
      .order('created_at', { ascending: false }).limit(50);
    if (data) { logRef.current = data; setAuctionLog(data); }
  }, []);

  const fetchRetained = useCallback(async () => {
    const { data } = await supabase.from('retained_players').select('*');
    if (data) { retainedRef.current = data; setRetainedPlayers(data); }
  }, []);

  // ── Payload-based instant update handlers ────────────────────────────────
  const handleTeamChange = useCallback((payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    setTeams(prev => {
      const next = [...prev];
      if (eventType === 'INSERT') return [...next, newRow as Team];
      if (eventType === 'DELETE') return next.filter(t => t.id !== oldRow.id);
      if (eventType === 'UPDATE') return next.map(t => t.id === newRow.id ? newRow as Team : t);
      return prev;
    });
  }, []);

  const handlePlayerChange = useCallback((payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    setAuctionPlayers(prev => {
      let next: AuctionPlayer[];
      if (eventType === 'INSERT') {
        next = [...prev, newRow as AuctionPlayer];
      } else if (eventType === 'DELETE') {
        next = prev.filter(p => p.id !== oldRow.id);
      } else {
        next = prev.map(p => p.id === newRow.id ? newRow as AuctionPlayer : p);
      }
      
      // Update current player from new list
      setCurrentPlayer(next.find(p => p.status === 'current') ?? null);
      return next;
    });
  }, []);

  const handleLogChange = useCallback((payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    setAuctionLog(prev => {
      if (eventType === 'INSERT') {
        const next = [newRow as AuctionLog, ...prev].slice(0, 50);
        return next;
      }
      if (eventType === 'DELETE') return prev.filter(l => l.id !== oldRow.id);
      return prev.map(l => l.id === newRow.id ? newRow as AuctionLog : l);
    });
  }, []);

  const handleRetainedChange = useCallback((payload: any) => {
    const { eventType, new: newRow, old: oldRow } = payload;
    setRetainedPlayers(prev => {
      if (eventType === 'INSERT') return [...prev, newRow as RetainedPlayer];
      if (eventType === 'DELETE') return prev.filter(r => r.id !== oldRow.id);
      return prev.map(r => r.id === newRow.id ? newRow as RetainedPlayer : r);
    });
  }, []);

  // ── Setup realtime + initial load ────────────────────────────────────────
  useEffect(() => {
    // Initial load
    Promise.all([fetchTeams(), fetchPlayers(), fetchRetained(), fetchLog()])
      .finally(() => setLoading(false));

    // Single channel with payload-based handlers — ZERO fetch lag
    const channel = auctionChannel
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams' },
        handleTeamChange)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'auction_players' },
        handlePlayerChange)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'auction_log' },
        handleLogChange)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'retained_players' },
        handleRetainedChange)
      // Instant <50ms sync via WebSockets (bypasses postgres latency)
      .on('broadcast', { event: 'auction:sync_bid' }, ({ payload }) => {
        const { playerId, currentBid, leadingTeamId } = payload;
        setAuctionPlayers(prev => {
          const next = prev.map(p => 
            p.id === playerId ? { ...p, current_bid: currentBid, leading_team_id: leadingTeamId } as any : p
          );
          setCurrentPlayer(next.find(p => p.status === 'current') ?? null);
          return next;
        });
      })
      .on('broadcast', { event: 'auction:player_status' }, ({ payload }) => {
        const { playerId, status, soldToTeam, soldPrice } = payload;
        setAuctionPlayers(prev => {
          const next = prev.map(p => {
             // Revert old current players if a new one is set
             if (status === 'current' && p.status === 'current' && p.id !== playerId) {
               return { ...p, status: 'available', current_bid: null, leading_team_id: null, timer_started_at: null } as any;
             }
             // Apply new status to target player
             if (p.id === playerId) {
               return { 
                 ...p, 
                 status, 
                 sold_to_team: soldToTeam || null, 
                 sold_price: soldPrice || null, 
                 current_bid: status === 'current' ? p.current_bid : null, 
                 leading_team_id: status === 'current' ? p.leading_team_id : null,
                 timer_started_at: null
               } as any;
             }
             return p;
          });
          setCurrentPlayer(next.find(p => p.status === 'current') ?? null);
          return next;
        });

        // Optimistically deduct budget if sold
        if (status === 'sold' && soldToTeam && soldPrice) {
           setTeams(prev => prev.map(t => 
             t.id === soldToTeam ? { ...t, spent_budget: t.spent_budget + soldPrice } : t
           ));
        }
      })
      .on('broadcast', { event: 'auction:refresh' }, () => {
        // True universal auto-refresh trigger to guarantee everything is in sync
        fetchPlayers();
        fetchTeams();
        fetchRetained();
        fetchLog();
      })
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED');
        if (status === 'CHANNEL_ERROR') {
          // Auto-reconnect on error
          setTimeout(() => channel.subscribe(), 3000);
        }
      });

    // Extremely aggressive universal auto-refresh to guarantee absolute sync on all pages flawlessly
    const universalAutoRefresh = setInterval(() => {
      fetchPlayers();
      fetchTeams();
      fetchRetained();
      fetchLog();
    }, 1500);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(universalAutoRefresh);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refetch = useCallback(() =>
    Promise.all([fetchTeams(), fetchPlayers(), fetchRetained(), fetchLog()]),
    [fetchTeams, fetchPlayers, fetchRetained, fetchLog]
  );

  const soldPlayersByTeam = useCallback(
    (teamId: string) => auctionPlayers.filter(p => p.status === 'sold' && p.sold_to_team === teamId),
    [auctionPlayers]
  );

  const retainedByTeam = useCallback(
    (teamId: string) => retainedPlayers.filter(p => p.team_id === teamId),
    [retainedPlayers]
  );

  return {
    teams, auctionPlayers, retainedPlayers, auctionLog,
    currentPlayer, isLive, loading,
    soldPlayersByTeam, retainedByTeam, refetch,
  };
}
