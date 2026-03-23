import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';

type Team = Database['public']['Tables']['teams']['Row'];
type RetainedPlayer = Database['public']['Tables']['retained_players']['Row'];

interface Props {
  teams: Team[];
  retainedByTeam: (teamId: string) => RetainedPlayer[];
}

export function RetainedPlayersPanel({ teams, retainedByTeam }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-card border border-border rounded-lg">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full flex items-center justify-between p-3 h-auto">
            <span className="font-display font-bold text-sm">🔒 Retained Players</span>
            <span className="text-xs text-muted-foreground">{open ? '▲ Hide' : '▼ Show'}</span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-2">
            {teams.map(team => {
              const retained = retainedByTeam(team.id);
              if (retained.length === 0) return null;
              return (
                <div key={team.id} className="text-xs">
                  <span className="font-medium" style={{ color: team.color }}>{team.short_name}</span>
                  <span className="text-muted-foreground"> ({retained.length}): </span>
                  <span className="text-muted-foreground">
                    {retained.map(p => p.player_name).join(' | ')}
                  </span>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
