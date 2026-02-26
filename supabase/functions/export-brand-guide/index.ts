import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractBlockContent(block: any) {
  const content = block.content || {};
  const result: any = {
    type: block.block_type,
    position: block.position,
  };

  // Extract text content
  const textParts: string[] = [];
  const mediaUrls: string[] = [];

  // Handle different block types
  if (content.title) textParts.push(stripHtml(content.title));
  if (content.subtitle) textParts.push(stripHtml(content.subtitle));
  if (content.text) textParts.push(stripHtml(content.text));
  if (content.description) textParts.push(stripHtml(content.description));

  // Media
  if (content.media_url) mediaUrls.push(content.media_url);
  if (content.image_url) mediaUrls.push(content.image_url);
  if (content.video_url) mediaUrls.push(content.video_url);
  if (content.embed_url) mediaUrls.push(content.embed_url);

  // Columns (two_columns, three_columns)
  if (content.columns && Array.isArray(content.columns)) {
    content.columns.forEach((col: any, i: number) => {
      if (col.title) textParts.push(`[Coluna ${i + 1}] ${stripHtml(col.title)}`);
      if (col.description) textParts.push(stripHtml(col.description));
      if (col.image_url) mediaUrls.push(col.image_url);
    });
  }

  // Color palette
  if (content.colors && Array.isArray(content.colors)) {
    result.color_data = content.colors.map((c: any) => ({
      name: c.name || "",
      hex: c.hex || "",
      rgb: c.rgb || "",
      cmyk: c.cmyk || "",
      pantone: c.pantone || c.pms || "",
    }));
  }

  if (textParts.length > 0) {
    result.text_content = textParts.filter(Boolean).join("\n\n");
  }
  if (mediaUrls.length > 0) {
    result.media_urls = mediaUrls;
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch all data in parallel
    const [categoriesRes, pagesRes, blocksRes, homeBlocksRes] =
      await Promise.all([
        supabase
          .from("brand_guide_categories")
          .select("*")
          .eq("is_active", true)
          .order("position"),
        supabase
          .from("brand_guide_pages")
          .select("*")
          .eq("is_active", true)
          .order("position"),
        supabase.from("brand_guide_blocks").select("*").order("position"),
        // Home blocks have category_id set but no page_id
        supabase
          .from("brand_guide_blocks")
          .select("*")
          .is("page_id", null)
          .is("category_id", null)
          .order("position"),
      ]);

    const categories = categoriesRes.data || [];
    const pages = pagesRes.data || [];
    const allBlocks = blocksRes.data || [];

    // Build structured output
    const output: any = {
      exported_at: new Date().toISOString(),
      brand_guide: {
        home_blocks: (homeBlocksRes.data || []).map(extractBlockContent),
        categories: categories.map((cat: any) => {
          const catPages = pages.filter((p: any) => p.category_id === cat.id);
          const catBlocks = allBlocks.filter(
            (b: any) => b.category_id === cat.id && !b.page_id
          );

          return {
            name: cat.name,
            slug: cat.slug,
            icon: cat.icon,
            direct_blocks: catBlocks.map(extractBlockContent),
            pages: catPages.map((page: any) => {
              const pageBlocks = allBlocks.filter(
                (b: any) => b.page_id === page.id
              );
              return {
                name: page.name,
                slug: page.slug,
                blocks: pageBlocks.map(extractBlockContent),
              };
            }),
          };
        }),
      },
    };

    return new Response(JSON.stringify(output, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
