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

// Text modes supported by Gamma API
type TextMode = 'generate' | 'condense' | 'preserve';

// Process image tags in text - replace [img1], [img2], etc. with actual URLs
function processImageTags(text: string, imagesMap: Record<string, string>): { processedText: string; unusedTags: string[] } {
  // Find all image tags in the text
  const tagRegex = /\[img\d+\]/gi;
  const foundTags = text.match(tagRegex) || [];
  const unusedTags: string[] = [];
  
  let processedText = text;
  
  if (!imagesMap || Object.keys(imagesMap).length === 0) {
    // All tags are unused if no images provided
    return { processedText, unusedTags: foundTags };
  }
  
  // Replace tags like [img1], [img2], etc.
  for (const [tag, url] of Object.entries(imagesMap)) {
    const regex = new RegExp(`\\[${tag}\\]`, 'gi');
    processedText = processedText.replace(regex, url);
  }
  
  // Check for any remaining unreplaced tags
  const remainingTags = processedText.match(tagRegex) || [];
  unusedTags.push(...remainingTags);

  console.log(`[generate-slides] Processed ${Object.keys(imagesMap).length} image tags, ${unusedTags.length} unused`);
  return { processedText, unusedTags };
}

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

    const { text, sourceType, originalFilename, recordId, imagesMap, textMode = 'preserve' } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required');
    }

    console.log(`[generate-slides] Starting generation for user ${user.id}, source: ${sourceType}, textMode: ${textMode}`);
    console.log(`[generate-slides] Images provided: ${imagesMap ? Object.keys(imagesMap).length : 0}`);

    // Process image tags in the text
    const { processedText, unusedTags } = processImageTags(text, imagesMap || {});
    
    if (unusedTags.length > 0) {
      console.log(`[generate-slides] Warning: ${unusedTags.length} image tags without images: ${unusedTags.join(', ')}`);
    }

    // Remove backticks from image URLs (Gamma API requires plain URLs)
    const cleanText = processedText.replace(/`(https?:\/\/[^`]+)`/g, '$1');
    console.log(`[generate-slides] Cleaned backticks from URLs`);

    const hasUserImages = imagesMap && Object.keys(imagesMap).length > 0;

    // Build request body for Create from Template API
    const requestBody: Record<string, unknown> = {
      gammaId: 'g_si92vfr170fkppw', // EFI template ID
      prompt: cleanText.substring(0, 400000), // Max 400k chars
    };
    
    // Only add imageOptions if user provided images
    if (hasUserImages) {
      requestBody.imageOptions = { source: 'web' };
    }

    console.log(`[generate-slides] Request body:`, JSON.stringify(requestBody, null, 2));

    // Call Gamma API - Create from Template endpoint
    const gammaResponse = await fetch('https://public-api.gamma.app/v1.0/generations/from-template', {
      method: 'POST',
      headers: {
        'X-API-KEY': GAMMA_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!gammaResponse.ok) {
      const errorData = await gammaResponse.text();
      console.error('[generate-slides] Gamma API error:', errorData);
      
      // Update record with error
      await supabaseClient
        .from('slide_generations')
        .update({ 
          status: 'failed', 
          error_message: `Gamma API error: ${gammaResponse.status} - ${errorData}` 
        })
        .eq('id', recordId);
      
      throw new Error(`Gamma API error: ${gammaResponse.status}`);
    }

    const gammaData = await gammaResponse.json();
    console.log('[generate-slides] Gamma response:', JSON.stringify(gammaData));

    const generationId = gammaData.generationId;
    console.log(`[generate-slides] Extracted generationId: ${generationId}`);

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

      const statusResponse = await fetch(`https://public-api.gamma.app/v1.0/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': GAMMA_API_KEY!,
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
        
        const gammaUrl = statusData.gammaUrl || `https://gamma.app/docs/${generationId}`;
        
        // Update record with success
        await supabaseClient
          .from('slide_generations')
          .update({ 
            status: 'completed',
            gamma_url: gammaUrl,
          })
          .eq('id', recordId);

        return new Response(JSON.stringify({ 
          success: true,
          generationId,
          url: gammaUrl,
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