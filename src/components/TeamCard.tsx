import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { User, Pencil, Check, X, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { auctionChannel } from '@/hooks/useAuctionData';
import type { Database } from '@/integrations/supabase/types';

type Team           = Database['public']['Tables']['teams']['Row'];
type AuctionPlayer  = Database['public']['Tables']['auction_players']['Row'];
type RetainedPlayer = Database['public']['Tables']['retained_players']['Row'];

function brighten(hex: string): string {
  if (!hex || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  if ((0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.4) {
    const f = 1.5;
    const c = (n: number) => Math.min(255, Math.round(n * f + 50)).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
  }
  return hex;
}

// Read team owner assignments from localStorage
function getStoredOwners(): Record<string, string[]> {
  try {
    return JSON.parse(localStorage.getItem('auction_team_owners') || '{}');
  } catch { return {}; }
}

interface Props {
  team: Team;
  retained: RetainedPlayer[];
  soldPlayers: AuctionPlayer[];
  editable?: boolean;
}

export function TeamCard({ team, retained, soldPlayers, editable = false }: Props) {
  const navigate = useNavigate();
  const [storedOwners, setStoredOwners] = useState<Record<string, string[]>>(getStoredOwners);

  // Listen for WebSocket assignment broadcasts
  useEffect(() => {
    const handler = ({ payload }: any) => {
      if (payload?.assignments) {
        localStorage.setItem('auction_team_owners', JSON.stringify(payload.assignments));
        setStoredOwners(payload.assignments);
      }
    };
    auctionChannel.on('broadcast', { event: 'team:assignment:update' }, handler);
    return () => { /* channel cleanup handled by useAuctionData */ };
  }, []);

  // Also re-read localStorage on window focus (in case another tab updated it)
  useEffect(() => {
    const onFocus = () => setStoredOwners(getStoredOwners());
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const remaining    = team.total_budget - team.spent_budget;
  const totalPlayers = soldPlayers.length + retained.length;
  const overseasLeft = team.overseas_slots - soldPlayers.filter(p => p.country !== 'India').length - retained.filter(r => r.nationality !== 'India').length;
  const slotsLeft    = team.player_slots - totalPlayers;
  const isDark       = document.documentElement.classList.contains('dark') || !document.documentElement.classList.contains('light');
  const textColor    = isDark ? brighten(team.color) : team.color;

  // ── Owners come from retained_players AND localStorage assignments ──
  const ownerRows  = retained.filter(r => r.role === 'OWNER').map(r => r.player_name);
  const generatorNames = storedOwners[team.id] || [];
  const displayNames = Array.from(new Set([...ownerRows, ...generatorNames]));
  const ownerNames = displayNames.join(', ');

  // ── Edit state ──
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [saveOk,   setSaveOk]   = useState(false);
  const [saveErr,  setSaveErr]  = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setSaveOk(false); }, [retained]);

  function cancel(e?: React.MouseEvent) {
    e?.stopPropagation();
    setEditing(false);
    setDraft('');
    setSaveErr('');
  }

  async function save(e?: React.MouseEvent) {
    e?.stopPropagation();
    e?.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaveErr('');

    const { data, error: fnErr } = await supabase.functions.invoke('update-owner-name', {
      body: { team_id: team.id, owner_name: draft.trim() },
    });

    setSaving(false);

    if (fnErr || !data?.success) {
      const msg = data?.error || fnErr?.message || 'Save failed';
      setSaveErr(msg);
    } else {
      setEditing(false);
      setDraft('');
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === 'Enter')  save();
    if (e.key === 'Escape') cancel();
  }

  // ── SpreadSheet Data Logic ──
  const allPlayers = [
    ...retained.map(p => ({
      name: p.player_name,
      price: p.retention_price,
      overseas: p.nationality !== 'India' && p.nationality != null,
      role: p.role,
      isRetained: true,
    })),
    ...soldPlayers.map(p => ({
      name: p.player_name,
      price: p.sold_price,
      overseas: p.country !== 'India' && p.country != null,
      role: p.role,
      isRetained: false,
    })),
  ];

  const categories = [
    { label: 'BATSMEN', keys: ['BATTER', 'BATSMAN', 'BATSMEN', 'BAT'] },
    { label: 'WK-BATTER', keys: ['WICKETKEEPER', 'WK-BATTER', 'WK BATTER', 'WICKET-KEEPER', 'WK'] },
    { label: 'ALLROUNDER', keys: ['ALL-ROUNDER', 'ALLROUNDER', 'ALL ROUNDER', 'AR'] },
    { label: 'FAST BOWLER', keys: ['FAST BOWLER', 'PACER', 'PACE', 'SEAMER', 'FAST', 'BOWLER'] },
    { label: 'SPIN BOWLER', keys: ['SPINNER', 'SPIN', 'SPIN BOWLER'] },
  ];

  function categorizeRole(role: string | null): string {
    if (!role) return 'BATSMEN';
    const upper = role.toUpperCase().trim();
    
    if (upper.includes('WK') || upper.includes('WICKET')) return 'WK-BATTER';
    if (upper.includes('SPIN')) return 'SPIN BOWLER';
    if (upper.includes('ALL-ROUND') || upper.includes('ALLROUND') || upper.includes('AR')) return 'ALLROUNDER';
    if (upper.includes('FAST') || upper.includes('PACE') || upper.includes('SEAM')) return 'FAST BOWLER';
    if (upper.includes('BAT')) return 'BATSMEN';
    if (upper.includes('BOWL')) return 'FAST BOWLER';

    for (const cat of categories) {
      if (cat.keys.some(k => upper === k)) return cat.label;
    }
    return 'BATSMEN';
  }

  const enhancedPlayers = allPlayers.map(p => ({ ...p, roleCat: categorizeRole(p.role) }));
  
  const roleGroups = categories.map(cat => ({
    label: cat.label,
    players: enhancedPlayers.filter(p => p.roleCat === cat.label).sort((a,b) => (b.price||0) - (a.price||0))
  }));
  
  const topBuys = [...enhancedPlayers]
    .filter(p => p.price != null && !p.isRetained)
    .sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
    .slice(0, 5);

  function fmtPrice(price: number | null | undefined): string {
    if (price == null) return '-';
    // ensure trailing decimals are handled cleanly
    return (Math.round(price * 100) / 100).toString();
  }

  const overseasCount = allPlayers.filter(p => p.overseas).length;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl overflow-hidden border border-border/50 hover:border-border/80 transition-all h-full"
          style={{
            background: `linear-gradient(135deg, ${team.color}1a 0%, hsl(var(--card)) 55%)`,
            borderLeft: `4px solid ${team.color}`,
            cursor: 'pointer',
          }}
        >
          <div className="p-3 space-y-2.5">
            {/* ── Header ── */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {team.logo_url && (
                  <img src={team.logo_url} alt={team.short_name} className="w-8 h-8 object-contain shrink-0" />
                )}
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="font-display font-black text-xs px-2 py-0.5 rounded shrink-0"
                    style={{ backgroundColor: team.color, color: '#fff' }}
                  >
                    {team.short_name}
                  </span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:block">{team.name}</span>
                </div>
              </div>
              <span className="font-display font-bold text-sm text-foreground shrink-0">
                {totalPlayers}/{team.player_slots}
              </span>
            </div>

            {/* ── Owner name row ── */}
            <div className="min-h-[28px]" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-1 flex-wrap mt-1">
                {displayNames.length > 0
                  ? displayNames.map((name, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${team.color}22`, color: textColor, border: `1px solid ${team.color}44` }}
                      >
                        <User className="w-2.5 h-2.5 shrink-0" />
                        {name}
                      </span>
                    ))
                  : null
                }
                {saving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
              </div>
              {saveErr && <p className="text-[10px] text-destructive mt-0.5">{saveErr}</p>}
            </div>

            {/* ── Budget ── */}
            <div className="leading-none">
              <span className="font-display font-black text-2xl" style={{ color: textColor }}>
                ₹{remaining.toFixed(2)} Cr
              </span>
              <span className="text-xs text-muted-foreground/60 ml-1.5">purse left</span>
            </div>

            {/* ── Stats ── */}
            <div className="flex gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/20">
                🏏 {slotsLeft} slots left
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-accent/10 text-accent border border-accent/20">
                ✈️ {overseasLeft} overseas left
              </span>
            </div>

          </div>
        </motion.div>
      </DialogTrigger>
      
      <DialogContent className="max-w-[100vw] w-screen h-[100dvh] max-h-screen p-4 md:p-8 overflow-y-auto bg-card text-foreground border-none m-0 rounded-none !zoom-100 flex flex-col">
        <DialogTitle className="sr-only">{team.name} Squad Details</DialogTitle>
        
        <div className="flex flex-col gap-8 font-sans mt-2 max-w-[1600px] mx-auto w-full">
          
          {/* Header Panel matching Dark Mode Layout */}
          <div
            className="rounded-xl p-5 border border-border/50"
            style={{
              background: `linear-gradient(135deg, ${team.color}18 0%, hsl(var(--card)) 80%)`,
              borderLeft: `5px solid ${team.color}`,
            }}
          >
            <div className="flex flex-wrap items-center gap-4 mb-5">
              {team.logo_url && (
                <img src={team.logo_url} alt={team.short_name} className="w-10 h-10 object-contain" />
              )}
              <div>
                <h1 className="font-display font-bold text-xl md:text-2xl text-foreground leading-none">{team.name}</h1>
                <span
                  className="font-display font-bold text-[11px] px-2 py-0.5 rounded mt-1.5 inline-block"
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
                { label: 'Players',    value: `${allPlayers.length}/${team.player_slots}`, colored: false },
                { label: 'Overseas',   value: `${overseasCount}/${team.overseas_slots}`, colored: false },
              ].map(stat => (
                <div key={stat.label} className="bg-background/60 rounded-lg p-3 text-center border border-border/30">
                  <div className="text-[11px] text-muted-foreground mb-1">{stat.label}</div>
                  <div
                    className="font-display font-bold text-xl"
                    style={stat.colored ? { color: team.color } : {}}
                  >
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Buys Row */}
          {topBuys.length > 0 && (
            <div>
              <h2 className="font-display font-bold text-[15px] text-foreground mb-3">Top Buys</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {topBuys.map(p => (
                  <div
                    key={p.name}
                    className="rounded-xl border border-border/40 p-3 text-center"
                    style={{ background: `${team.color}12` }}
                  >
                    <div className="font-bold text-xs text-foreground leading-tight">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{p.roleCat}</div>
                    <div className="font-display font-bold text-[13px] mt-2" style={{ color: team.color }}>
                      ₹{fmtPrice(p.price)} Cr
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Squad Breakdown */}
          <div className="flex-1">
            <h2 className="font-display font-bold text-[15px] text-foreground mb-4">Squad Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {roleGroups.map(group => (
                  <div
                    key={group.label}
                    className="rounded-xl border border-border/40 p-3"
                    style={{ background: `${team.color}08` }}
                  >
                    {/* Category Header */}
                    <div className="flex items-center justify-between mb-3 border-b border-border/40 pb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: team.color }}>
                        {group.label}
                      </span>
                      <span
                        className="text-[10px] font-bold rounded px-1.5 py-0.5 inline-flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${team.color}25`, color: team.color }}
                      >
                        {group.players.length}
                      </span>
                    </div>
                    {/* Player Rows */}
                    <div className="space-y-1.5">
                      {group.players.map(p => (
                        <div key={p.name} className="flex items-center justify-between text-[13px]">
                          <span className="flex items-center gap-1.5 text-foreground/90 truncate pr-2">
                            {p.overseas && <span className="text-[10px]">✈️</span>}
                            {p.name}
                            {p.isRetained && (
                              <span className="text-[9px] font-bold bg-primary/20 text-primary px-1 rounded uppercase tracking-wider">RTM</span>
                            )}
                          </span>
                          <span className="font-bold whitespace-nowrap ml-2 shrink-0 text-right w-[45px]" style={{ color: team.color }}>
                            ₹{fmtPrice(p.price)} Cr
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
