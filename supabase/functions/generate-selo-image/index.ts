import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const replicateApiKey = Deno.env.get("REPLICATE_API_KEY")!;
    const siteUrl = Deno.env.get("SITE_URL") || "https://eficiencia-ai.lovable.app";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const replicate = new Replicate({ auth: replicateApiKey });

    const { imageBase64, sealType } = await req.json();

    if (!imageBase64 || !sealType) {
      return new Response(
        JSON.stringify({ error: "imageBase64 e sealType são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode e upload da imagem
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const fileName = `uploads/${crypto.randomUUID()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("efi-selo")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Erro no upload da imagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: publicUrlData } = supabase.storage.from("efi-selo").getPublicUrl(fileName);
    const uploadedImageUrl = publicUrlData.publicUrl;

    // URLs dos assets estáticos do site
    const cenarioUrl = `${siteUrl}/cenario_bg.png`;
    const farolUrl = `${siteUrl}/farol.png`;

    console.log("URLs:", { uploadedImageUrl, cenarioUrl, farolUrl });

    // Criar registro pendente
    const { data: record, error: insertError } = await supabase
      .from("generated_images")
      .insert({
        character_name: "EfiSelo",
        prompt: "Estilo Pixar com selo",
        image_url: uploadedImageUrl,
        status: "pending",
        source: "efi-selo",
        seal_type: sealType,
        request_params: { sealType, uploadedImageUrl },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar registro" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Chamar Replicate
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    const prediction = await replicate.predictions.create({
      model: "openai/gpt-image-1.5",
      input: {
        prompt: "Desenhe a pessoa da imagem 1 em estilo pixar desenho infantil, preservando a pose, penteado e acessórios da imagem 1 e com o logo da imagem 3 estampado na camiseta cinza escuro. NÃO ALTERE EM NADA O LOGO DA IMAGEM 3. IMPORTANTE: com o fundo da quarta imagem atrás do personagem.",
        quality: "low",
        background: "auto",
        moderation: "auto",
        aspect_ratio: "1:1",
        input_images: [uploadedImageUrl, cenarioUrl, farolUrl],
        output_format: "png",
        input_fidelity: "low",
        number_of_images: 1,
        output_compression: 90,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    });

    console.log("Prediction created:", prediction.id);

    // Atualizar registro com prediction_id
    await supabase
      .from("generated_images")
      .update({ prediction_id: prediction.id, status: "processing" })
      .eq("id", record.id);

    return new Response(
      JSON.stringify({ success: true, recordId: record.id, predictionId: prediction.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
