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

    const supabase = createClient(supabaseUrl, supabaseKey);
    const replicate = new Replicate({ auth: replicateApiKey });

    const body = await req.json();
    const { imageBase64, sealType, campaignId, sealAssetId } = body;

    console.log("Request received:", { sealType, campaignId, sealAssetId, hasImage: !!imageBase64 });

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "imageBase64 é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode e upload da imagem do usuário
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

    let prompt: string;
    let inputImages: string[] = [uploadedImageUrl];
    let source = "efi-selo";
    let campaignSlug: string | null = null;

    // Check if it's a campaign-based request
    if (campaignId) {
      console.log("Fetching campaign:", campaignId);
      
      // Fetch campaign data
      const { data: campaign, error: campaignError } = await supabase
        .from("image_campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();

      if (campaignError || !campaign) {
        console.error("Campaign error:", campaignError);
        return new Response(
          JSON.stringify({ error: "Campanha não encontrada" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Campaign found:", campaign.slug);
      campaignSlug = campaign.slug;

      // Fetch hidden assets (used as input images for the AI)
      const { data: hiddenAssets } = await supabase
        .from("image_campaign_assets")
        .select("image_url")
        .eq("campaign_id", campaignId)
        .eq("is_visible", false)
        .order("position", { ascending: true });

      // Add hidden assets to input images
      if (hiddenAssets && hiddenAssets.length > 0) {
        inputImages = [uploadedImageUrl, ...hiddenAssets.map(a => a.image_url)];
        console.log("Hidden assets added:", hiddenAssets.length);
      }

      // Use campaign prompt or default
      prompt = campaign.prompt || "Desenhe a pessoa da imagem em estilo artístico, preservando a pose, penteado e acessórios.";
      source = `campaign-${campaign.slug}`;
    } else {
      // Legacy mode - use hardcoded values
      const siteUrl = Deno.env.get("SITE_URL") || "https://eficiencia-ai.lovable.app";
      const cenarioUrl = `${siteUrl}/cenario_bg.png`;
      const farolUrl = `${siteUrl}/farol.png`;
      
      inputImages = [uploadedImageUrl, cenarioUrl, farolUrl];
      prompt = "Desenhe a pessoa da imagem 1 em estilo pixar desenho infantil, preservando a pose, penteado e acessórios da imagem 1 e com o logo da imagem 3 estampado na camiseta cinza escuro. NÃO ALTERE EM NADA O LOGO DA IMAGEM 3. IMPORTANTE: com o fundo da quarta imagem atrás do personagem.";
    }

    console.log("Prompt:", prompt);
    console.log("Input images count:", inputImages.length);

    // Criar registro pendente
    const { data: record, error: insertError } = await supabase
      .from("generated_images")
      .insert({
        character_name: campaignSlug || "EfiSelo",
        prompt: prompt,
        image_url: uploadedImageUrl,
        status: "pending",
        source: source,
        seal_type: sealType || sealAssetId,
        request_params: { sealType, sealAssetId, campaignId, uploadedImageUrl },
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

    console.log("Record created:", record.id);

    // Chamar Replicate
    const webhookUrl = `${supabaseUrl}/functions/v1/replicate-webhook`;
    
    const prediction = await replicate.predictions.create({
      model: "openai/gpt-image-1.5",
      input: {
        prompt: prompt,
        quality: "low",
        background: "auto",
        moderation: "auto",
        aspect_ratio: "1:1",
        input_images: inputImages,
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
