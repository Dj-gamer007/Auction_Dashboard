import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const { team_id, owner_name }: { team_id: string; owner_name: string } = await req.json();
    if (!team_id) throw new Error('team_id is required');

    // Delete existing OWNER rows for this team
    const { error: delErr } = await admin
      .from('retained_players')
      .delete()
      .eq('team_id', team_id)
      .eq('role', 'OWNER');
    if (delErr) throw new Error(`Delete failed: ${delErr.message}`);

    // Insert new owner names (one row per name, comma-separated input)
    const names = (owner_name || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    if (names.length > 0) {
      const rows = names.map((name: string) => ({
        team_id,
        player_name: name,
        role: 'OWNER',
        nationality: 'India',
        retention_price: 0,
      }));
      const { error: insErr } = await admin.from('retained_players').insert(rows);
      if (insErr) throw new Error(`Insert failed: ${insErr.message}`);
    }

    return new Response(JSON.stringify({ success: true, names }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
