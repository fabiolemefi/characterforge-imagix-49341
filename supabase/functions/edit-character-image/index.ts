import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.31.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, prompt } = await req.json();

    if (!imageUrl || !prompt) {
      throw new Error('imageUrl and prompt are required');
    }

    console.log('Editing image with prompt:', prompt);

    const replicate = new Replicate({
      auth: Deno.env.get('REPLICATE_API_KEY'),
    });

    // Use instruct-pix2pix for image editing
    const output = await replicate.run(
      "timothybrooks/instruct-pix2pix:30c1d0b916a6f8efce20493a5ba90ab3786780427b98ee7b0465c10f66ee2b30",
      {
        input: {
          image: imageUrl,
          prompt: prompt,
          num_inference_steps: 20,
          guidance_scale: 7.5,
          image_guidance_scale: 1.5,
        }
      }
    );

    console.log('Image edited successfully');

    return new Response(
      JSON.stringify({ output }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error editing image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
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
