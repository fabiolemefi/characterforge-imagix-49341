import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Lista de User-Agents de crawlers conhecidos
const CRAWLER_USER_AGENTS = [
  "facebookexternalhit",
  "Facebot",
  "Twitterbot",
  "LinkedInBot",
  "WhatsApp",
  "Slackbot",
  "TelegramBot",
  "Discordbot",
  "Pinterest",
  "Googlebot",
];

function isCrawler(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return CRAWLER_USER_AGENTS.some(crawler => 
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const userAgent = req.headers.get("user-agent");

  console.log(`[og-metadata] Request for slug: ${slug}, User-Agent: ${userAgent}`);

  if (!slug) {
    return new Response(JSON.stringify({ error: "Missing slug parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Se não for crawler, retorna instrução para redirecionar
  if (!isCrawler(userAgent)) {
    console.log(`[og-metadata] Not a crawler, returning redirect instruction`);
    return new Response(JSON.stringify({ redirect: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[og-metadata] Crawler detected, fetching campaign data`);

  // Busca dados da campanha
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: campaign, error } = await supabase
    .from("image_campaigns")
    .select("title, subtitle, og_title, og_description, og_image_url, logo_url, background_image_url")
    .eq("slug", slug)
    .single();

  if (error || !campaign) {
    console.log(`[og-metadata] Campaign not found: ${error?.message}`);
    return new Response("Not found", { 
      status: 404,
      headers: corsHeaders 
    });
  }

  console.log(`[og-metadata] Campaign found:`, campaign);

  const ogTitle = escapeHtml(campaign.og_title || campaign.title || "Martech Efí");
  const ogDescription = escapeHtml(campaign.og_description || campaign.subtitle || "");
  const ogImage = campaign.og_image_url || campaign.logo_url || campaign.background_image_url || "";
  const pageUrl = `https://martech-efi.lovable.app/gerar/${slug}`;

  // Retorna HTML com metatags corretas para crawlers
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle}</title>
  <meta name="description" content="${ogDescription}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  ${ogImage ? `<meta property="og:image:width" content="1200">` : ''}
  ${ogImage ? `<meta property="og:image:height" content="630">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Redirect para SPA após carregar -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <h1>${ogTitle}</h1>
  <p>${ogDescription}</p>
  <p>Redirecionando...</p>
</body>
</html>`;

  console.log(`[og-metadata] Returning HTML with metatags for crawler`);

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
