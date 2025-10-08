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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      throw new Error('imageUrl is required');
    }

    console.log('Removing background from image:', imageUrl);

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Remover background
    console.log("Removing background");
    const bgRemovedOutput = await replicate.run(
      "851-labs/background-remover:a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc",
      {
        input: {
          image: imageUrl,
          format: "png",
          reverse: false,
          threshold: 0,
          background_type: "rgba",
        },
      },
    );

    const finalImageUrl = typeof bgRemovedOutput === "string" ? bgRemovedOutput : bgRemovedOutput[0];
    console.log("Background removed image URL:", finalImageUrl);

    // Baixar a imagem
    console.log("Downloading processed image");
    const imageResponse = await fetch(finalImageUrl);
    if (!imageResponse.ok) throw new Error("Failed to download processed image");
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();

    // Fazer upload para o storage
    console.log("Uploading to Supabase storage");
    const fileName = `no-bg-${Date.now()}-${Math.random()}.png`;
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

    // Obter URL pública
    const {
      data: { publicUrl },
    } = supabase.storage.from("plugin-images").getPublicUrl(fileName);

    console.log("Final stored image URL:", publicUrl);

    return new Response(
      JSON.stringify({ output: publicUrl }),
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
