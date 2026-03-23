import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getWikipediaImage(playerName: string): Promise<string | null> {
  try {
    // Search for the player's Wikipedia page
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(playerName)}&prop=pageimages&format=json&pithumbsize=300&redirects=1`;
    const res = await fetch(searchUrl);
    const data = await res.json();
    const pages = data.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as any;
    if (page?.thumbnail?.source) {
      return page.thumbnail.source;
    }

    // Try with "(cricketer)" suffix
    const searchUrl2 = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(playerName + ' (cricketer)')}&prop=pageimages&format=json&pithumbsize=300&redirects=1`;
    const res2 = await fetch(searchUrl2);
    const data2 = await res2.json();
    const pages2 = data2.query?.pages;
    if (!pages2) return null;

    const page2 = Object.values(pages2)[0] as any;
    return page2?.thumbnail?.source || null;
  } catch (e) {
    console.error(`Failed to fetch image for ${playerName}:`, e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get players without images
    const { data: players, error } = await supabase
      .from('auction_players')
      .select('id, player_name')
      .is('image_url', null)
      .limit(50);

    if (error) throw error;
    if (!players || players.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No players need images', updated: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let updated = 0;
    const results: { name: string; found: boolean }[] = [];

    for (const player of players) {
      const imageUrl = await getWikipediaImage(player.player_name);
      if (imageUrl) {
        await supabase.from('auction_players').update({ image_url: imageUrl }).eq('id', player.id);
        updated++;
        results.push({ name: player.player_name, found: true });
      } else {
        // Set a placeholder so we don't retry
        await supabase.from('auction_players').update({ image_url: 'none' }).eq('id', player.id);
        results.push({ name: player.player_name, found: false });
      }

      // Rate limit - small delay between requests
      await new Promise(r => setTimeout(r, 200));
    }

    return new Response(JSON.stringify({ success: true, updated, total: players.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
