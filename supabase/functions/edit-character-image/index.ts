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
    const { imageUrl, prompt, imageId } = await req.json();

    if (!imageUrl || !prompt) {
      throw new Error('imageUrl and prompt are required');
    }

    console.log('Starting image edit with prompt:', prompt);

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Buscar a versão mais recente do modelo nano-banana
    console.log("Getting latest version of nano-banana model");
    const model = await replicate.models.get("google", "nano-banana");
    const latestVersion = model.latest_version.id;
    console.log("Using version:", latestVersion);

    // Criar predição assíncrona
    console.log("Creating async prediction with nano-banana");
    const prediction = await replicate.predictions.create({
      version: latestVersion,
      input: {
        prompt: prompt,
        image_input: [imageUrl],
        aspect_ratio: "match_input_image",
        output_format: "png",
      },
      webhook: `${SUPABASE_URL}/functions/v1/replicate-webhook`,
      webhook_events_filter: ["completed"],
    });

    console.log("Prediction created:", prediction.id);

    // Criar ou atualizar registro na tabela generated_images
    let recordId = imageId;
    
    if (imageId) {
      // Atualizar registro existente
      const { error: updateError } = await supabase
        .from("generated_images")
        .update({
          prediction_id: prediction.id,
          status: "processing",
          request_params: { imageUrl, prompt, type: "edit" },
        })
        .eq("id", imageId);

      if (updateError) {
        console.error("Error updating record:", updateError);
        throw new Error(`Failed to update record: ${updateError.message}`);
      }
    } else {
      // Criar novo registro
      const { data: newRecord, error: insertError } = await supabase
        .from("generated_images")
        .insert({
          character_name: "Edited Image",
          prompt: prompt,
          image_url: imageUrl,
          prediction_id: prediction.id,
          status: "processing",
          request_params: { imageUrl, prompt, type: "edit" },
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating record:", insertError);
        throw new Error(`Failed to create record: ${insertError.message}`);
      }

      recordId = newRecord.id;
    }

    console.log("Record updated/created:", recordId);

    return new Response(
      JSON.stringify({ 
        recordId,
        predictionId: prediction.id,
        status: "processing" 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error editing image:', error);
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
