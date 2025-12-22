import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not set");
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const body = await req.json();
    console.log("[extract-pdf-content] Request body:", JSON.stringify(body));

    // Validate required field
    if (!body.pdfUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: pdfUrl is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("[extract-pdf-content] Extracting content from PDF:", body.pdfUrl);

    // Call Replicate with datalab-to/marker model
    const output = await replicate.run("datalab-to/marker", {
      input: {
        file: body.pdfUrl,
        mode: "balanced",
        use_llm: true,
        paginate: false,
        force_ocr: false,
        skip_cache: false,
        format_lines: false,
        save_checkpoint: false,
        disable_ocr_math: false,
        include_metadata: false,
        strip_existing_ocr: false,
        disable_image_extraction: true,
      },
    });

    console.log("[extract-pdf-content] Replicate response type:", typeof output);
    console.log("[extract-pdf-content] Replicate response:", JSON.stringify(output).substring(0, 500));

    // The marker model returns an object with markdown property
    let markdown = "";
    if (typeof output === "object" && output !== null) {
      // Try to get markdown from various possible response formats
      if ("markdown" in output) {
        markdown = (output as { markdown: string }).markdown;
      } else if ("text" in output) {
        markdown = (output as { text: string }).text;
      } else if ("output" in output) {
        markdown = (output as { output: string }).output;
      } else if (Array.isArray(output)) {
        markdown = output.join("\n");
      } else {
        // Try to stringify if it's an object we don't recognize
        markdown = JSON.stringify(output);
      }
    } else if (typeof output === "string") {
      markdown = output;
    }

    console.log("[extract-pdf-content] Extracted markdown length:", markdown.length);
    console.log("[extract-pdf-content] Markdown preview:", markdown.substring(0, 300));

    return new Response(
      JSON.stringify({ 
        success: true,
        markdown,
        length: markdown.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[extract-pdf-content] Error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
