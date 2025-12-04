import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Declare EdgeRuntime for Deno
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

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
  const tagRegex = /\[img\d+\]/gi;
  const foundTags = text.match(tagRegex) || [];
  const unusedTags: string[] = [];
  
  let processedText = text;
  
  if (!imagesMap || Object.keys(imagesMap).length === 0) {
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

// Background polling function
async function pollForCompletion(
  generationId: string, 
  recordId: string, 
  supabaseClient: SupabaseClient
) {
  const maxAttempts = 90; // 90 × 2s = 180 seconds (3 minutes)
  
  console.log(`[generate-slides] Starting background polling for ${generationId}`);
  
  for (let attempts = 1; attempts <= maxAttempts; attempts++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const statusResponse = await fetch(`https://public-api.gamma.app/v1.0/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': GAMMA_API_KEY!,
        },
      });

      if (!statusResponse.ok) {
        console.error(`[generate-slides] Background status check failed: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`[generate-slides] Background status check ${attempts}: ${statusData.status}`);

      if (statusData.status === 'completed') {
        const gammaUrl = statusData.gammaUrl || `https://gamma.app/docs/${generationId}`;
        
        await (supabaseClient as SupabaseClient)
          .from('slide_generations')
          .update({ 
            status: 'completed',
            gamma_url: gammaUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        console.log(`[generate-slides] Generation completed: ${gammaUrl}`);
        return;
      }
      
      if (statusData.status === 'failed') {
        await (supabaseClient as SupabaseClient)
          .from('slide_generations')
          .update({ 
            status: 'failed',
            error_message: statusData.error || 'Generation failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', recordId);

        console.error(`[generate-slides] Generation failed: ${statusData.error}`);
        return;
      }
    } catch (error) {
      console.error(`[generate-slides] Background polling error:`, error);
    }
  }

  // Timeout after 3 minutes
  await (supabaseClient as SupabaseClient)
    .from('slide_generations')
    .update({ 
      status: 'failed',
      error_message: 'Generation timed out after 3 minutes',
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId);

  console.error(`[generate-slides] Generation timed out after 3 minutes`);
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

    const { 
      text, 
      sourceType, 
      originalFilename, 
      recordId, 
      imagesMap, 
      textMode = 'preserve',
      dimensions = 'fluid',
      exportAs,
      headerFooter,
      themeId,
      additionalInstructions,
    } = await req.json();

    if (!text || text.trim().length === 0) {
      throw new Error('Text content is required');
    }

    console.log(`[generate-slides] Starting generation for user ${user.id}, source: ${sourceType}, textMode: ${textMode}, dimensions: ${dimensions}`);
    console.log(`[generate-slides] Images provided: ${imagesMap ? Object.keys(imagesMap).length : 0}`);

    // Process image tags in the text
    const { processedText, unusedTags } = processImageTags(text, imagesMap || {});
    
    if (unusedTags.length > 0) {
      console.log(`[generate-slides] Warning: ${unusedTags.length} image tags without images: ${unusedTags.join(', ')}`);
    }

    // Remove backticks from image URLs
    const cleanText = processedText.replace(/`(https?:\/\/[^`]+)`/g, '$1');
    console.log(`[generate-slides] Cleaned backticks from URLs`);

    // Build cardOptions
    const cardOptions: Record<string, unknown> = {
      dimensions: dimensions || 'fluid',
    };

    // Add headerFooter if configured
    if (headerFooter && (headerFooter.showLogo || headerFooter.showCardNumber || headerFooter.footerText)) {
      const headerFooterConfig: Record<string, unknown> = {};
      
      if (headerFooter.showLogo) {
        headerFooterConfig.topRight = {
          type: 'image',
          source: 'themeLogo',
          size: 'sm',
        };
      }
      
      if (headerFooter.showCardNumber) {
        headerFooterConfig.bottomRight = {
          type: 'cardNumber',
        };
      }
      
      if (headerFooter.footerText) {
        headerFooterConfig.bottomLeft = {
          type: 'text',
          value: headerFooter.footerText,
        };
      }
      
      headerFooterConfig.hideFromFirstCard = headerFooter.hideFromFirstCard || false;
      headerFooterConfig.hideFromLastCard = headerFooter.hideFromLastCard || false;
      
      cardOptions.headerFooter = headerFooterConfig;
    }

    // Build request body for Generate from Text API (NOT Create from Template)
    const requestBody: Record<string, unknown> = {
      inputText: cleanText.substring(0, 400000), // Max 400k chars
      textMode: textMode as TextMode, // 'preserve', 'generate', or 'condense'
      format: 'presentation',
      cardSplit: 'inputTextBreaks', // Respect --- breaks in the text
      textOptions: {
        language: 'pt-br',
      },
      imageOptions: {
        source: 'noImages', // Only use images from URLs in the text
      },
      cardOptions,
    };

    // Add export option if specified
    if (exportAs && (exportAs === 'pdf' || exportAs === 'pptx')) {
      requestBody.exportAs = exportAs;
      console.log(`[generate-slides] Export as: ${exportAs}`);
    }

    // Add theme ID if specified
    if (themeId) {
      requestBody.themeId = themeId;
      console.log(`[generate-slides] Theme ID: ${themeId}`);
    }

    // Add additional instructions if specified
    if (additionalInstructions && additionalInstructions.trim()) {
      requestBody.additionalInstructions = additionalInstructions.trim();
      console.log(`[generate-slides] Additional instructions provided`);
    }

    console.log(`[generate-slides] Request body (truncated):`, JSON.stringify({
      ...requestBody,
      inputText: (requestBody.inputText as string).substring(0, 500) + '...'
    }, null, 2));

    // Call Gamma API - Generate from Text endpoint
    const gammaResponse = await fetch('https://public-api.gamma.app/v1.0/generations', {
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

    // Update record with generation ID and processing status
    await supabaseClient
      .from('slide_generations')
      .update({ 
        generation_id: generationId,
        status: 'processing'
      })
      .eq('id', recordId);

    // Start background polling (doesn't block the response)
    EdgeRuntime.waitUntil(pollForCompletion(generationId, recordId, supabaseClient));

    // Return immediately to the frontend
    return new Response(JSON.stringify({ 
      success: true,
      generationId,
      status: 'processing',
      message: 'Generation started. Status will update automatically.'
    }), {
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
