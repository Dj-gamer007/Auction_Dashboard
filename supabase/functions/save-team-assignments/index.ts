import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Assignment {
  team_id: string;
  player_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    // Service role bypasses ALL RLS — guaranteed to work
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const assignments: Assignment[] = body.assignments ?? [];

    if (!assignments.length) {
      throw new Error('No assignments provided');
    }

    // 1. Delete all existing OWNER rows
    const { error: delErr } = await supabase
      .from('retained_players')
      .delete()
      .eq('role', 'OWNER');

    if (delErr) {
      console.error('Delete error:', delErr);
      throw new Error(`Delete failed: ${delErr.message}`);
    }

    // 2. Insert new owner assignments
    const rows = assignments.map((a: Assignment) => ({
      team_id: a.team_id,
      player_name: a.player_name,
      role: 'OWNER',
      nationality: 'India',
      retention_price: 0,
    }));

    const { error: insErr } = await supabase
      .from('retained_players')
      .insert(rows);

    if (insErr) {
      console.error('Insert error:', insErr);
      throw new Error(`Insert failed: ${insErr.message}`);
    }

    console.log(`Saved ${rows.length} team assignments`);

    return new Response(
      JSON.stringify({ success: true, count: rows.length }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('save-team-assignments error:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }
});
