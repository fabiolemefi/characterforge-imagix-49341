import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GAMMA_API_KEY = Deno.env.get('GAMMA_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const TEMPLATE_ID = 'g_si92vfr170fkppw';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const supabaseClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { text, sourceType, originalFilename, recordId } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required');
    }

    console.log(`[generate-slides] Starting generation for user ${user.id}, source: ${sourceType}`);

    // Call Gamma API to create from template
    const gammaResponse = await fetch('https://api.gamma.app/v1.0/generations/from-template', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GAMMA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gammaId: TEMPLATE_ID,
        text: text.substring(0, 400000), // Max 400k chars
      }),
    });

    if (!gammaResponse.ok) {
      const errorData = await gammaResponse.text();
      console.error('[generate-slides] Gamma API error:', errorData);
      
      // Update record with error
      await supabaseClient
        .from('slide_generations')
        .update({ 
          status: 'failed', 
          error_message: `Gamma API error: ${gammaResponse.status}` 
        })
        .eq('id', recordId);
      
      throw new Error(`Gamma API error: ${gammaResponse.status}`);
    }

    const gammaData = await gammaResponse.json();
    console.log('[generate-slides] Gamma response:', JSON.stringify(gammaData));

    const generationId = gammaData.id;

    // Update record with generation ID
    await supabaseClient
      .from('slide_generations')
      .update({ 
        generation_id: generationId,
        status: 'processing'
      })
      .eq('id', recordId);

    // Poll for completion (max 60 seconds)
    let completed = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!completed && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(`https://api.gamma.app/v1.0/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GAMMA_API_KEY}`,
        },
      });

      if (!statusResponse.ok) {
        console.error(`[generate-slides] Status check failed: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`[generate-slides] Status check ${attempts}:`, statusData.status);

      if (statusData.status === 'completed') {
        completed = true;
        
        // Update record with success
        await supabaseClient
          .from('slide_generations')
          .update({ 
            status: 'completed',
            gamma_url: statusData.url || `https://gamma.app/docs/${generationId}`,
          })
          .eq('id', recordId);

        return new Response(JSON.stringify({ 
          success: true,
          generationId,
          url: statusData.url || `https://gamma.app/docs/${generationId}`,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else if (statusData.status === 'failed') {
        await supabaseClient
          .from('slide_generations')
          .update({ 
            status: 'failed',
            error_message: statusData.error || 'Generation failed'
          })
          .eq('id', recordId);

        throw new Error(statusData.error || 'Generation failed');
      }
    }

    // Timeout
    if (!completed) {
      await supabaseClient
        .from('slide_generations')
        .update({ 
          status: 'failed',
          error_message: 'Generation timed out'
        })
        .eq('id', recordId);

      throw new Error('Generation timed out');
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[generate-slides] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
