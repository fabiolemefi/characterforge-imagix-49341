import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Replicate from "https://esm.sh/replicate@0.25.2";

const MAX_RETRIES = 3;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Return version info for direct access (GET requests or invalid JSON)
    if (req.method === "GET") {
      return new Response(JSON.stringify({
        last_updated: "2025-11-13T10:08:00Z"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

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

    console.log(`Processing webhook for prediction: ${predictionId}, status: ${status}`);

    // Try to find in test_ai_conversations first (most common case)
    let conversationRecord = null;
    let conversationError = null;

    // Retry up to 10 times with increasing delay (in case of timing issues)
    for (let i = 0; i < 10; i++) {
      const { data, error } = await supabase
        .from("test_ai_conversations")
        .select("*")
        .eq("prediction_id", predictionId)
        .maybeSingle();

      conversationRecord = data;
      conversationError = error;

      if (conversationRecord || error) break;

      // Wait with increasing delay: 200ms, 400ms, 600ms, etc
      const delay = 200 * (i + 1);
      console.log(`Conversation not found, retrying in ${delay}ms (attempt ${i + 1}/10)`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    // Try to find in generated_images (for image generation)
    const { data: imageRecord, error: imageError } = await supabase
      .from("generated_images")
      .select("*")
      .eq("prediction_id", predictionId)
      .maybeSingle();

    // If it's a conversation AI response
    if (conversationRecord) {
      console.log("Found conversation record:", conversationRecord.id);

      if (status === "succeeded" && output) {
        // Parse the AI response
        let responseText = "";
        if (Array.isArray(output)) {
          // Join array elements to reconstruct the JSON response
          responseText = output.join("");
        } else if (typeof output === "string") {
          responseText = output.replace(/\\n/g, "").replace(/\n/g, "");
        } else {
          responseText = JSON.stringify(output);
        }

        // Clean markdown if present
        responseText = responseText
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();

        try {
          const aiResponse = JSON.parse(responseText);

          // Validate response structure
          if (!aiResponse.message || !aiResponse.status || !aiResponse.extracted_data) {
            throw new Error("Invalid AI response structure");
          }

          // Ensure arrays are arrays
          if (aiResponse.extracted_data.test_types && !Array.isArray(aiResponse.extracted_data.test_types)) {
            aiResponse.extracted_data.test_types = [];
          }
          if (aiResponse.extracted_data.tools && !Array.isArray(aiResponse.extracted_data.tools)) {
            aiResponse.extracted_data.tools = [];
          }
          if (aiResponse.extracted_data.success_metric && !Array.isArray(aiResponse.extracted_data.success_metric)) {
            aiResponse.extracted_data.success_metric = [];
          }

          // Add AI message to conversation
          const currentMessages = (conversationRecord.messages || []) as any[];
          const aiMessage = {
            role: "assistant",
            content: aiResponse.message,
            timestamp: new Date().toISOString(),
          };
          const updatedMessages = [...currentMessages, aiMessage];

          // Update conversation in database
          const { error: updateError } = await supabase
            .from("test_ai_conversations")
            .update({
              messages: updatedMessages,
              extracted_data: aiResponse.extracted_data,
              status: aiResponse.status === "ready" ? "ready" : "draft",
              prediction_id: null, // Clear prediction_id
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationRecord.id);

          if (updateError) {
            console.error("Error updating conversation:", updateError);
            throw updateError;
          }

          console.log("Conversation updated successfully");
          return new Response(JSON.stringify({ message: "Conversation updated" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (parseError) {
          console.error("Error parsing AI response:", parseError);
          console.error("Raw response text:", responseText);

          // Add error message to conversation so user knows what happened
          const currentMessages = (conversationRecord.messages || []) as any[];
          const errorMessage = {
            role: "assistant",
            content: "Desculpe, tive um problema ao processar a resposta. Pode repetir o que você disse?",
            timestamp: new Date().toISOString(),
          };
          const updatedMessages = [...currentMessages, errorMessage];

          // Clear prediction_id and add error message to allow retry
          await supabase
            .from("test_ai_conversations")
            .update({
              messages: updatedMessages,
              prediction_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", conversationRecord.id);

          return new Response(JSON.stringify({ error: "Failed to parse AI response, retry message sent" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }
      } else if (status === "failed" || status === "canceled") {
        console.log("Prediction failed for conversation:", error);

        await supabase
          .from("test_ai_conversations")
          .update({
            prediction_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationRecord.id);

        return new Response(JSON.stringify({ message: "Prediction failed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ message: "Status received", status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // If it's an image generation (existing functionality)
    if (!imageRecord) {
      console.error("No record found with prediction_id:", predictionId);
      return new Response(JSON.stringify({ error: "Record not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const existingRecord = imageRecord;

    console.log("Found database record:", existingRecord.id);

    // Se a predição falhou
    if (status === "failed" || status === "canceled") {
      console.log("Prediction failed or canceled:", error);

      // Check if this is a retryable error (E6716 or similar transient errors)
      const isRetryableError = error && (
        error.includes("unexpected error handling prediction") ||
        error.includes("E6716") ||
        error.includes("Director:")
      );

      const currentRetryCount = existingRecord.retry_count || 0;

      // Auto-retry if retryable error and under max retries
      if (isRetryableError && currentRetryCount < MAX_RETRIES) {
        console.log(`Retryable error detected. Attempting retry ${currentRetryCount + 1}/${MAX_RETRIES}`);

        try {
          const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
          if (!REPLICATE_API_KEY) {
            throw new Error("REPLICATE_API_KEY not configured");
          }

          const replicate = new Replicate({ auth: REPLICATE_API_KEY });

          // Get original request params from the record
          const requestParams = existingRecord.request_params || {};
          const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;

          console.log("Creating new prediction with params:", JSON.stringify(requestParams));

          // Create new prediction with the same parameters
          const newPrediction = await replicate.predictions.create({
            model: "google/nano-banana",
            input: {
              prompt: requestParams.prompt,
              image_input: requestParams.image_input || requestParams.imageUrls,
              aspect_ratio: requestParams.aspectRatio || "1:1",
              output_format: "png",
            },
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
          });

          console.log("New prediction created:", newPrediction.id);

          // Update record with new prediction_id and increment retry count
          const { error: updateError } = await supabase
            .from("generated_images")
            .update({
              prediction_id: newPrediction.id,
              status: "processing",
              retry_count: currentRetryCount + 1,
              error_message: null,
            })
            .eq("id", existingRecord.id);

          if (updateError) {
            console.error("Error updating record for retry:", updateError);
            throw updateError;
          }

          console.log(`Retry initiated successfully (attempt ${currentRetryCount + 1})`);

          return new Response(JSON.stringify({ 
            message: "Retry initiated", 
            retry_count: currentRetryCount + 1,
            new_prediction_id: newPrediction.id 
          }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } catch (retryError) {
          console.error("Failed to initiate retry:", retryError);
          // Fall through to mark as failed
        }
      }

      // Mark as failed (no more retries or retry failed)
      const finalErrorMessage = currentRetryCount >= MAX_RETRIES 
        ? `Falha após ${MAX_RETRIES} tentativas: ${error || "Erro desconhecido"}`
        : error || "Prediction failed or was canceled";

      const { error: updateError } = await supabase
        .from("generated_images")
        .update({
          status: "failed",
          error_message: finalErrorMessage,
          prediction_id: null,
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
          error_message: null,
          prediction_id: null, // Limpar o prediction_id após processar
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
