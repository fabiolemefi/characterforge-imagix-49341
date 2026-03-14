import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Export all generated images
    const { data: images, error } = await supabase
      .from("generated_images")
      .select("*")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Also export characters and plugin for context
    const { data: characters } = await supabase
      .from("plugin_characters")
      .select("id, name, general_prompt, plugin_id, position, is_active");

    const { data: characterImages } = await supabase
      .from("character_images")
      .select("*")
      .order("position", { ascending: true });

    const { data: plugins } = await supabase
      .from("plugins")
      .select("*");

    const exportData = {
      exported_at: new Date().toISOString(),
      source_project: "dbxaamdirxjrbolsegwz",
      summary: {
        total_generated_images: images?.length || 0,
        total_characters: characters?.length || 0,
        total_character_reference_images: characterImages?.length || 0,
        total_plugins: plugins?.length || 0,
      },
      migration_notes: {
        image_urls: "All image_url values point to the source project's plugin-images bucket. For full independence, download each image and re-upload to the new project's bucket, then update the URLs.",
        character_ids: "The character_id in generated_images references plugin_characters. Use the same UUIDs when inserting characters in the new project to maintain relationships.",
        user_ids: "user_id references profiles in the source project. Set to null or map to new project users.",
        re_upload_script: "Use the image_url to fetch each image, upload to new bucket, and UPDATE the record with the new URL.",
      },
      plugins: plugins || [],
      characters: characters || [],
      character_images: characterImages || [],
      generated_images: (images || []).map(img => ({
        id: img.id,
        character_id: img.character_id,
        character_name: img.character_name,
        prompt: img.prompt,
        image_url: img.image_url,
        status: img.status,
        source: img.source,
        seal_type: img.seal_type,
        created_at: img.created_at,
        prediction_id: img.prediction_id,
        request_params: img.request_params,
        retry_count: img.retry_count,
      })),
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": "attachment; filename=efimagem-export.json",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
