import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

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

    // Use google/nano-banana for image editing
    const output = await replicate.run("google/nano-banana", {
      input: {
        prompt: prompt,
        image_input: [imageUrl],
        aspect_ratio: "1:1",
        output_format: "png",
      },
    });

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
