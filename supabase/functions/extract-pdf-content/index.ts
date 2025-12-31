import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not set");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not set");
    }

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const { pdfUrl, fileName } = body;

    if (!pdfUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: pdfUrl" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("📄 Starting async PDF extraction for:", fileName || pdfUrl);

    // 1. Create extraction record in database
    const { data: extraction, error: insertError } = await supabase
      .from("pdf_extractions")
      .insert({
        file_name: fileName || "unknown.pdf",
        pdf_url: pdfUrl,
        status: "pending",
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating extraction record:", insertError);
      throw new Error("Failed to create extraction record");
    }

    console.log("✅ Created extraction record:", extraction.id);

    // 2. Start async Replicate prediction with webhook
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const webhookUrl = `${SUPABASE_URL}/functions/v1/pdf-extraction-webhook`;
    console.log("🔗 Webhook URL:", webhookUrl);

    const prediction = await replicate.predictions.create({
      model: "datalab-to/marker",
      input: {
        file: pdfUrl,
        output_format: "markdown",
        force_ocr: false,
        paginate_output: false,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    });

    console.log("🚀 Started Marker prediction:", prediction.id);

    // 3. Update extraction with prediction ID
    const { error: updateError } = await supabase
      .from("pdf_extractions")
      .update({
        marker_prediction_id: prediction.id,
        status: "extracting",
      })
      .eq("id", extraction.id);

    if (updateError) {
      console.error("❌ Error updating extraction with prediction ID:", updateError);
    }

    // 4. Return extraction ID immediately for polling
    return new Response(
      JSON.stringify({
        extractionId: extraction.id,
        predictionId: prediction.id,
        status: "extracting",
        message: "PDF extraction started. Poll for status.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in extract-pdf-content:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
