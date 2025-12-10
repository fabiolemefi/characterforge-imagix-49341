import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse query parameters
    const url = new URL(req.url);
    const blockType = url.searchParams.get('type');

    console.log(`📋 Listing canva blocks${blockType ? ` with type: ${blockType}` : ''}`);

    // Build query - only active blocks for public API
    let query = supabase
      .from('canva_blocks')
      .select('id, name, block_type, html_content, thumbnail_url, created_at, updated_at')
      .eq('is_active', true)
      .order('block_type', { ascending: true })
      .order('name', { ascending: true });

    // Apply type filter if provided
    if (blockType) {
      query = query.eq('block_type', blockType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching blocks:', error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} blocks`);

    return new Response(
      JSON.stringify({
        success: true,
        data: data || [],
        count: data?.length || 0,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error:', errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
