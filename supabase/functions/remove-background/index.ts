import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { imageUrl, imageId } = await req.json();

    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    console.log('Starting async background removal for image:', imageUrl);

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Criar predição assíncrona
    console.log("Creating background removal prediction");
    const prediction = await replicate.predictions.create({
      version: "a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
      input: {
        image: imageUrl,
        format: "png",
        reverse: false,
        threshold: 0,
        background_type: "rgba",
      },
      webhook: `${SUPABASE_URL}/functions/v1/replicate-webhook`,
      webhook_events_filter: ["completed"],
    });

    console.log("Prediction created:", prediction.id);

    // Criar registro temporário na tabela com status 'processing'
    if (imageId) {
      const { error: updateError } = await supabase
        .from("generated_images")
        .update({
          status: 'processing',
          prediction_id: prediction.id,
        })
        .eq('id', imageId);

      if (updateError) {
        console.error("Error updating image status:", updateError);
      }
    }

    return new Response(
      JSON.stringify({ 
        predictionId: prediction.id,
        imageId: imageId,
        status: 'processing'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error removing background:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});
