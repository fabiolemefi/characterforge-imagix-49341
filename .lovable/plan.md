
# Plano: Implementar Metatags Dinâmicas para Compartilhamento

## Problema Identificado

As metatags configuradas no admin (`og_title`, `og_description`, `og_image_url`) estão sendo salvas corretamente no banco de dados, mas **não aparecem nas previews de compartilhamento** (WhatsApp, Facebook, LinkedIn, Twitter).

**Causa raiz:** Crawlers de redes sociais não executam JavaScript. Eles leem apenas o HTML estático do `index.html`, que contém as metatags padrão do site.

## Dados Atuais no Banco

| Campo | Valor |
|-------|-------|
| og_title | Martech - Crie seu selo de estratégista Efí |
| og_description | Faça parte desse movimento! Crie agora mesmo seu selo... |
| og_image_url | https://...supabase.co/storage/.../aaasssdffa.png |

Esses dados estão corretos, mas os crawlers nunca os veem.

---

## Solução: Edge Function de Prerendering

Criar uma edge function que:
1. Detecta se a requisição vem de um crawler (via User-Agent)
2. Se for crawler: retorna HTML estático com metatags corretas
3. Se for usuário normal: redireciona para a SPA

### Arquitetura

```text
Requisição para /gerar/:slug
          │
          ▼
    Edge Function
          │
     ┌────┴────┐
     ▼         ▼
  Crawler?    Usuário
     │         │
     ▼         ▼
HTML com    Redireciona
metatags    para SPA
corretas
```

---

## Implementação

### 1. Criar Edge Function `og-metadata`

**Arquivo:** `supabase/functions/og-metadata/index.ts`

```typescript
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const userAgent = req.headers.get("user-agent");

  // Se não for crawler, retorna instrução para redirecionar
  if (!isCrawler(userAgent)) {
    return new Response(JSON.stringify({ redirect: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
    return new Response("Not found", { status: 404 });
  }

  const ogTitle = campaign.og_title || campaign.title || "Martech Efí";
  const ogDescription = campaign.og_description || campaign.subtitle || "";
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

  return new Response(html, {
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
});
```

---

### 2. Alternativa: Usar Middleware no Frontend

Como alternativa mais simples (mas menos efetiva), podemos garantir que o `react-helmet` está funcionando corretamente e confiar que alguns crawlers modernos já executam JavaScript.

**Verificar no `ImageCampaignPublic.tsx`:**
- Garantir que o Helmet está no topo do componente
- Adicionar fallback para `og:url` com a URL canônica

---

## Limitações Conhecidas

| Crawler | Executa JS? |
|---------|-------------|
| WhatsApp | ❌ Não |
| Facebook | ⚠️ Parcialmente |
| Twitter | ❌ Não |
| LinkedIn | ❌ Não |
| Google | ✅ Sim |

A maioria dos crawlers de redes sociais **não executa JavaScript**, então a Edge Function é a solução mais robusta.

---

## Próximos Passos

1. Criar a Edge Function `og-metadata`
2. Testar com ferramenta de debug do Facebook: https://developers.facebook.com/tools/debug/
3. Testar com Card Validator do Twitter: https://cards-dev.twitter.com/validator

---

## Nota Técnica

Esta é uma limitação inerente a SPAs (Single Page Applications). Frameworks como Next.js resolvem isso com Server-Side Rendering (SSR), mas isso não está disponível no Lovable. A Edge Function é a melhor alternativa disponível.
