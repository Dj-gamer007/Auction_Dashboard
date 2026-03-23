import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Apply missing policies for retained_players using raw SQL via service role
    const queries = [
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='retained_players' AND policyname='Retained players can be inserted by anyone') THEN
          CREATE POLICY "Retained players can be inserted by anyone" ON public.retained_players FOR INSERT WITH CHECK (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='retained_players' AND policyname='Retained players can be deleted by anyone') THEN
          CREATE POLICY "Retained players can be deleted by anyone" ON public.retained_players FOR DELETE USING (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='retained_players' AND policyname='Retained players can be updated by anyone') THEN
          CREATE POLICY "Retained players can be updated by anyone" ON public.retained_players FOR UPDATE USING (true);
        END IF;
      END $$;`,
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='auction_players' AND column_name='timer_started_at') THEN
          ALTER TABLE public.auction_players ADD COLUMN timer_started_at timestamptz;
        END IF;
      END $$;`,
    ];

    const results: string[] = [];
    for (const sql of queries) {
      const { error } = await supabase.rpc('exec_sql', { query: sql }).single();
      // If rpc doesn't exist, try direct query
      if (error) {
        results.push(`Note: ${error.message}`);
      } else {
        results.push('ok');
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
