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

  // Handle GET requests for health check
  if (req.method === "GET") {
    return new Response(
      JSON.stringify({ status: "ok", version: "1.0.0" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!REPLICATE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const webhookData = await req.json();
    console.log("📩 Received webhook:", JSON.stringify(webhookData, null, 2));

    const { id: predictionId, status, output, error: predictionError } = webhookData;

    if (!predictionId) {
      console.error("❌ No prediction ID in webhook");
      return new Response(
        JSON.stringify({ error: "No prediction ID" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Check if this is a Marker prediction (step 1) or Gemini prediction (step 2)
    const { data: markerExtraction } = await supabase
      .from("pdf_extractions")
      .select("*")
      .eq("marker_prediction_id", predictionId)
      .single();

    const { data: geminiExtraction } = await supabase
      .from("pdf_extractions")
      .select("*")
      .eq("gemini_prediction_id", predictionId)
      .single();

    const extraction = markerExtraction || geminiExtraction;
    const isMarkerStep = !!markerExtraction;

    if (!extraction) {
      console.log("⚠️ No extraction found for prediction:", predictionId);
      return new Response(
        JSON.stringify({ message: "Extraction not found, might be from different process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`📋 Processing ${isMarkerStep ? "Marker" : "Gemini"} webhook for extraction:`, extraction.id);

    // Handle failed prediction
    if (status === "failed" || predictionError) {
      console.error("❌ Prediction failed:", predictionError);
      await supabase
        .from("pdf_extractions")
        .update({
          status: "failed",
          error_message: predictionError || "Prediction failed",
        })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ message: "Marked as failed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    if (status !== "succeeded") {
      console.log("⏳ Prediction not yet succeeded, status:", status);
      return new Response(
        JSON.stringify({ message: "Waiting for completion" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // STEP 1: Marker completed - extract raw markdown and start Gemini
    if (isMarkerStep) {
      console.log("📝 Marker completed, processing output...");

      // Extract markdown from Marker output
      let rawMarkdown = "";
      if (typeof output === "string") {
        rawMarkdown = output;
      } else if (output?.markdown) {
        rawMarkdown = output.markdown;
      } else if (Array.isArray(output)) {
        rawMarkdown = output.join("\n\n");
      } else if (output?.text) {
        rawMarkdown = output.text;
      } else {
        rawMarkdown = JSON.stringify(output);
      }

      console.log("📄 Raw markdown length:", rawMarkdown.length);

      // Update with raw markdown
      await supabase
        .from("pdf_extractions")
        .update({
          raw_markdown: rawMarkdown,
          status: "cleaning",
        })
        .eq("id", extraction.id);

      // Start Gemini for cleaning
      const systemInstruction = `Você é um especialista em extrair conteúdo de emails a partir de documentos.

REGRAS:
1. Identifique TODOS os emails presentes no documento
2. Para cada email, extraia o conteúdo COMPLETO
3. Mantenha títulos, subtítulos, corpo de texto, CTAs, e todo conteúdo relevante
4. Formate cada email em markdown limpo e legível
5. Separe cada email com uma linha horizontal (---)
6. IGNORE: cabeçalhos técnicos, metadados, footers legais, links de unsubscribe
7. MANTENHA: tom, estilo, formatação original do email

FORMATO DE SAÍDA:
Para cada email encontrado, formate assim:

## [Título/Assunto do Email]

[Conteúdo completo do email em markdown]

---

Se houver múltiplos emails, separe-os com ---`;

      const webhookUrl = `${SUPABASE_URL}/functions/v1/pdf-extraction-webhook`;

      const geminiPrediction = await replicate.predictions.create({
        model: "meta/meta-llama-3-70b-instruct",
        input: {
          prompt: `${systemInstruction}\n\n---\n\nDOCUMENTO PARA PROCESSAR:\n\n${rawMarkdown}`,
          max_tokens: 4096,
          temperature: 0.3,
        },
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      });

      console.log("🚀 Started Gemini prediction:", geminiPrediction.id);

      await supabase
        .from("pdf_extractions")
        .update({
          gemini_prediction_id: geminiPrediction.id,
        })
        .eq("id", extraction.id);

      return new Response(
        JSON.stringify({ message: "Marker done, Gemini started" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // STEP 2: Gemini completed - save cleaned markdown
    console.log("✨ Gemini completed, saving cleaned markdown...");

    let cleanedMarkdown = "";
    if (typeof output === "string") {
      cleanedMarkdown = output;
    } else if (Array.isArray(output)) {
      cleanedMarkdown = output.join("");
    } else {
      cleanedMarkdown = JSON.stringify(output);
    }

    console.log("📄 Cleaned markdown length:", cleanedMarkdown.length);

    await supabase
      .from("pdf_extractions")
      .update({
        cleaned_markdown: cleanedMarkdown,
        status: "completed",
      })
      .eq("id", extraction.id);

    console.log("✅ Extraction completed for:", extraction.id);

    return new Response(
      JSON.stringify({ message: "Extraction completed" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("❌ Error in pdf-extraction-webhook:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
