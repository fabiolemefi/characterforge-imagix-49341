import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

  const userAgent = req.headers.get("user-agent");
  console.log(`[og-site-metadata] User-Agent: ${userAgent}`);

  // Se não for crawler, retorna instrução para redirecionar
  if (!isCrawler(userAgent)) {
    console.log(`[og-site-metadata] Not a crawler, returning redirect instruction`);
    return new Response(JSON.stringify({ redirect: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[og-site-metadata] Crawler detected, fetching site settings`);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );

  const { data: settings, error } = await supabase
    .from("site_settings")
    .select("*")
    .limit(1)
    .single();

  if (error || !settings) {
    console.log(`[og-site-metadata] Settings not found: ${error?.message}`);
    return new Response("Not found", { 
      status: 404,
      headers: corsHeaders 
    });
  }

  console.log(`[og-site-metadata] Settings found:`, settings);

  const ogTitle = escapeHtml(settings.og_title || "Martech Efí");
  const ogDescription = escapeHtml(settings.og_description || "");
  const ogImage = settings.og_image_url || "";
  const favicon = settings.favicon_url || "";
  const twitterCard = settings.twitter_card || "summary_large_image";
  const pageUrl = "https://martech-efi.lovable.app";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle}</title>
  <meta name="description" content="${ogDescription}">
  ${favicon ? `<link rel="icon" href="${favicon}">` : ''}
  
  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  ${ogImage ? `<meta property="og:image:width" content="1200">` : ''}
  ${ogImage ? `<meta property="og:image:height" content="630">` : ''}
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ''}
  
  <!-- Redirect para SPA -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
</head>
<body>
  <h1>${ogTitle}</h1>
  <p>${ogDescription}</p>
  <p>Redirecionando...</p>
</body>
</html>`;

  console.log(`[og-site-metadata] Returning HTML with metatags for crawler`);

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
