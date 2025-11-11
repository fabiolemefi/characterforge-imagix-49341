import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const webhookData = await req.json();
    
    console.log("Received webhook:", JSON.stringify(webhookData, null, 2));

    const predictionId = webhookData.id;
    const status = webhookData.status;
    const output = webhookData.output;
    const error = webhookData.error;

    if (!predictionId) {
      console.error("No prediction ID in webhook");
      return new Response(JSON.stringify({ error: "No prediction ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Buscar o registro no banco pelo prediction_id
    const { data: existingRecord, error: fetchError } = await supabase
      .from("generated_images")
      .select("*")
      .eq("prediction_id", predictionId)
      .single();

    if (fetchError || !existingRecord) {
      console.error("Failed to find record with prediction_id:", predictionId, fetchError);
      return new Response(JSON.stringify({ error: "Record not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    console.log("Found database record:", existingRecord.id);

    // Se a predição falhou
    if (status === "failed" || status === "canceled") {
      console.log("Prediction failed or canceled:", error);
      
      const { error: updateError } = await supabase
        .from("generated_images")
        .update({
          status: "failed",
          error_message: error || "Prediction failed or was canceled"
        })
        .eq("id", existingRecord.id);

      if (updateError) {
        console.error("Error updating record as failed:", updateError);
      }

      return new Response(JSON.stringify({ message: "Marked as failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Se a predição foi bem-sucedida
    if (status === "succeeded" && output) {
      console.log("Prediction succeeded, processing output");
      
      // O output pode ser uma string (URL) ou array de URLs
      const imageUrl = typeof output === "string" ? output : output[0];
      
      if (!imageUrl) {
        throw new Error("No image URL in output");
      }

      console.log("Downloading image from:", imageUrl);

      // Baixar a imagem
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const imageBlob = await imageResponse.blob();
      const imageBuffer = await imageBlob.arrayBuffer();

      // Upload para Supabase Storage
      const fileName = `generated-${Date.now()}-${Math.random()}.png`;
      console.log("Uploading to storage:", fileName);

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

      console.log("Image uploaded successfully:", publicUrl);

      // Atualizar registro no banco
      const { error: updateError } = await supabase
        .from("generated_images")
        .update({
          status: "completed",
          image_url: publicUrl,
          error_message: null
        })
        .eq("id", existingRecord.id);

      if (updateError) {
        console.error("Error updating record:", updateError);
        throw new Error(`Failed to update record: ${updateError.message}`);
      }

      console.log("Database record updated successfully");

      return new Response(JSON.stringify({ message: "Image processed successfully", url: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Status inesperado
    console.log("Unexpected status:", status);
    return new Response(JSON.stringify({ message: "Status received", status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
