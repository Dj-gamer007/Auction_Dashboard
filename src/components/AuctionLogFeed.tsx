import { motion, AnimatePresence } from 'framer-motion';
import type { Database } from '@/integrations/supabase/types';

type AuctionLog = Database['public']['Tables']['auction_log']['Row'];

interface Props { log: AuctionLog[] }

export function AuctionLogFeed({ log }: Props) {
  const recent = [...log]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <h3 className="font-display font-bold text-sm text-foreground">Recent Sales</h3>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Last 5</span>
      </div>
      <div className="p-2 max-h-52 overflow-y-auto scrollbar-thin space-y-1">
        <AnimatePresence>
          {recent.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">No sales yet</div>
          )}
          {recent.map((entry) => (
            <motion.div key={entry.id} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
              className="text-xs py-1.5 px-2 rounded bg-muted/30 flex items-center gap-2">
              {entry.action === 'sold' ? (
                <>
                  <span className="text-sold shrink-0">✅</span>
                  <span className="font-medium text-foreground truncate">{entry.player_name}</span>
                  <span className="text-muted-foreground shrink-0">→</span>
                  <span className="font-bold shrink-0">{entry.team_name}</span>
                  <span className="text-sold font-bold ml-auto shrink-0">₹{entry.sold_price?.toFixed(2)} Cr</span>
                </>
              ) : (
                <>
                  <span className="text-unsold shrink-0">❌</span>
                  <span className="font-medium text-foreground truncate">{entry.player_name}</span>
                  <span className="text-unsold ml-auto shrink-0 font-bold">UNSOLD</span>
                </>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
