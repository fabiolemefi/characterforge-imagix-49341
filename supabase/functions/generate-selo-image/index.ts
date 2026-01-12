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
    
    const { imageBase64, sealType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!sealType) {
      return new Response(JSON.stringify({ error: "sealType is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    console.log("Processing image upload for EfiSelo with seal:", sealType);

    // Extract base64 data (remove data:image/...;base64, prefix if present)
    const base64Data = imageBase64.includes(",") 
      ? imageBase64.split(",")[1] 
      : imageBase64;
    
    // Decode base64 to binary
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Upload user image to bucket
    const uploadFileName = `efi-selo/uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
    console.log("Uploading user image to:", uploadFileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("plugin-images")
      .upload(uploadFileName, binaryData, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Get public URL for user image
    const { data: { publicUrl: userImageUrl } } = supabase.storage
      .from("plugin-images")
      .getPublicUrl(uploadFileName);

    console.log("User image uploaded:", userImageUrl);

    // Get public URLs for static assets
    // These need to be publicly accessible - using Supabase project URL or fallback to raw URLs
    const cenarioUrl = `${SUPABASE_URL}/storage/v1/object/public/static-assets/cenario_bg.png`;
    const farolUrl = `${SUPABASE_URL}/storage/v1/object/public/static-assets/farol.png`;

    console.log("Static assets - Cenario:", cenarioUrl, "Farol:", farolUrl);

    // Build the prompt as specified
    const prompt = "Desenhe a pessoa da imagem 1 em estilo pixar desenho infantil, preservando a pose, penteado e acessórios da imagem 1 e com o logo da imagem 3 estampado na camiseta cinza escuro. NÃO ALTERE EM NADA O LOGO DA IMAGEM 3. IMPORTANTE: com o fundo da quarta imagem atrás do personagem.";

    // Create record in database with status 'pending'
    const { data: dbRecord, error: dbError } = await supabase
      .from("generated_images")
      .insert({
        character_name: "EfiSelo User",
        prompt: prompt,
        image_url: "",
        status: "pending",
        source: "efi-selo",
        seal_type: sealType,
        request_params: {
          user_image_url: userImageUrl,
          cenario_url: cenarioUrl,
          farol_url: farolUrl,
          seal_type: sealType,
          source: "efi-selo",
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error(`Failed to create database record: ${dbError.message}`);
    }

    console.log("Database record created:", dbRecord.id);

    // Build input for Replicate
    const replicateInput = {
      prompt: prompt,
      quality: "low",
      background: "auto",
      moderation: "auto",
      aspect_ratio: "1:1",
      input_images: [
        userImageUrl,
        cenarioUrl,
        farolUrl
      ],
      output_format: "png",
      input_fidelity: "low",
      number_of_images: 1,
      output_compression: 90
    };

    console.log("Replicate input:", JSON.stringify(replicateInput, null, 2));

    // Start async prediction with webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;
    console.log("Starting async prediction with webhook:", webhookUrl);

    const prediction = await replicate.predictions.create({
      model: "openai/gpt-image-1.5",
      input: replicateInput,
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log("Prediction created:", prediction.id);

    // Update record with prediction_id and status 'processing'
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

    // Return immediately for the frontend
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
