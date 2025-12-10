import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const { imageUrls, prompt, generalPrompt = "", characterName, characterId, aspectRatio = "1:1" } = await req.json();

    // Get user_id from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    if (!imageUrls?.length)
      return new Response(JSON.stringify({ error: "imageUrls array is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });

    if (!prompt)
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });

    // Limitar a 6 imagens para evitar erro do modelo
    const limitedImageUrls = imageUrls.slice(0, 6);
    console.log(`Using ${limitedImageUrls.length} images from ${imageUrls.length} total`);

    // Usar o prompt como enviado (já inclui prompt geral se necessário)
    const enhancedPrompt = prompt;
    console.log("Enhanced prompt:", enhancedPrompt);

    // Criar registro no banco imediatamente com status 'pending'
    const { data: dbRecord, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        character_name: characterName || "Unknown",
        character_id: characterId || null,
        prompt: enhancedPrompt,
        image_url: "", // Será preenchido pelo webhook
        status: "pending",
        user_id: userId,
        request_params: {
          image_input: limitedImageUrls,
          prompt: enhancedPrompt,
          generalPrompt,
          characterName,
          characterId,
          aspectRatio
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to create database record: ${dbError.message}`);
    }

    console.log("Database record created:", dbRecord.id);

    // Iniciar predição assíncrona no Replicate com webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;
    console.log("Starting async prediction with webhook:", webhookUrl);

    const prediction = await replicate.predictions.create({
      version: "google/nano-banana",
      input: {
        prompt: enhancedPrompt,
        image_input: limitedImageUrls,
        aspect_ratio: aspectRatio,
        output_format: "png",
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log("Prediction created:", prediction.id);

    // Atualizar registro com prediction_id e status 'processing'
    const { error: updateError } = await supabase
      .from("generated_images")
      .update({
        prediction_id: prediction.id,
        status: "processing"
      })
      .eq("id", dbRecord.id);

    if (updateError) {
      console.error("Error updating prediction_id:", updateError);
    }

    // Retornar imediatamente para o frontend
    return new Response(JSON.stringify({ 
      recordId: dbRecord.id,
      predictionId: prediction.id,
      status: "processing"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
