import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) throw new Error("REPLICATE_API_KEY is not set");

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

    const output = await replicate.run(
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

    return new Response(JSON.stringify({ output }), {
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
