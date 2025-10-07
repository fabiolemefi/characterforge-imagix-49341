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
    const { imageUrls, prompt } = await req.json();

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

    // Limitar a 3 imagens para evitar erro do modelo
    const limitedImageUrls = imageUrls.slice(0, 3);
    console.log(`Using ${limitedImageUrls.length} images from ${imageUrls.length} total`);

    // Etapa 1: Gerar imagem com nano-banana
    console.log("Step 1: Generating image with nano-banana");
    const generatedOutput = await replicate.run(
      "google/nano-banana",
      {
        input: {
          prompt,
          image_input: limitedImageUrls,
          aspect_ratio: "1:1",
          output_format: "png",
        },
      },
    );

    const generatedImageUrl = typeof generatedOutput === "string" ? generatedOutput : generatedOutput[0];
    console.log("Generated image URL:", generatedImageUrl);

    // Etapa 2: Remover background
    console.log("Step 2: Removing background");
    const bgRemovedOutput = await replicate.run(
      "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
      {
        input: {
          image: generatedImageUrl,
          format: "png",
          reverse: false,
          threshold: 0,
          background_type: "rgba",
        },
      },
    );

    const finalImageUrl = typeof bgRemovedOutput === "string" ? bgRemovedOutput : bgRemovedOutput[0];
    console.log("Background removed image URL:", finalImageUrl);

    // Etapa 3: Baixar a imagem
    console.log("Step 3: Downloading processed image");
    const imageResponse = await fetch(finalImageUrl);
    if (!imageResponse.ok) throw new Error("Failed to download processed image");
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Etapa 4: Fazer upload para o storage
    console.log("Step 4: Uploading to Supabase storage");
    const fileName = `generated-${Date.now()}-${Math.random()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("plugin-images")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload image: ${uploadError.message}`);
    }

    // Etapa 5: Obter URL pública
    const { data: { publicUrl } } = supabase.storage
      .from("plugin-images")
      .getPublicUrl(fileName);

    console.log("Final stored image URL:", publicUrl);

    return new Response(JSON.stringify({ output: publicUrl }), {
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
