import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GAMMA_API_KEY = Deno.env.get('GAMMA_API_KEY');

interface GammaTheme {
  id: string;
  name: string;
  type: 'standard' | 'custom';
  colorKeywords?: string[];
  toneKeywords?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching Gamma themes...');
    
    if (!GAMMA_API_KEY) {
      throw new Error('GAMMA_API_KEY not configured');
    }

    // Fetch all themes with pagination
    const allThemes: GammaTheme[] = [];
    let nextCursor: string | null = null;
    
    do {
      const url = new URL('https://public-api.gamma.app/v1.0/themes');
      url.searchParams.set('limit', '50');
      if (nextCursor) url.searchParams.set('after', nextCursor);
      
      console.log(`Fetching themes from: ${url.toString()}`);
      
      const response = await fetch(url.toString(), {
        headers: { 'X-API-KEY': GAMMA_API_KEY },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gamma API error: ${response.status} - ${errorText}`);
        throw new Error(`Gamma API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Fetched ${data.data?.length || 0} themes, hasMore: ${data.hasMore}`);
      
      allThemes.push(...(data.data || []));
      nextCursor = data.hasMore ? data.nextCursor : null;
    } while (nextCursor);
    
    console.log(`Total themes fetched: ${allThemes.length}`);
    
    return new Response(JSON.stringify({ themes: allThemes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching themes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
