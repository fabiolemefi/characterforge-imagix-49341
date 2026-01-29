import "https://deno.land/std@0.168.0/dotenv/load.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLACEHOLDER_IMAGE = 'https://dbxaamdirxjrbolsegwz.supabase.co/storage/v1/object/public/efi-code-assets/library/sys/1769692921451-qtvxdp29lj.png';

// Função para substituir URLs de imagem pelo placeholder
const replaceImageUrls = (html: string): string => {
  return html
    // Substitui src="..." que aponta para imagens
    .replace(/src="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"/gi, `src="${PLACEHOLDER_IMAGE}"`)
    // Substitui srcset="..."
    .replace(/srcset="[^"]*"/gi, `srcset="${PLACEHOLDER_IMAGE}"`)
    // Substitui xlink:href="..." para SVGs
    .replace(/xlink:href="[^"]*\.(jpg|jpeg|png|gif|webp|svg)[^"]*"/gi, `xlink:href="${PLACEHOLDER_IMAGE}"`)
    // Substitui URLs em background-image inline
    .replace(/url\(['"]?[^'")\s]*\.(jpg|jpeg|png|gif|webp|svg)[^'")\s]*['"]?\)/gi, `url("${PLACEHOLDER_IMAGE}")`);
};

const SYSTEM_PROMPT = `Você é um especialista em análise de HTML para extração de blocos reutilizáveis.

Sua tarefa é receber um HTML completo (página inteira) e extrair blocos individuais que podem ser reutilizados em um editor visual de páginas.

## REGRAS CRÍTICAS:

1. **Identifique seções semânticas**: hero, header, footer, cards, features, testimonials, CTAs, forms, etc.

2. **Cada bloco deve ser INDEPENDENTE**: 
   - Deve funcionar sozinho, fora do contexto original
   - Não depender de estrutura pai específica
   - Ser reutilizável com diferentes containers

3. **REMOVA completamente**:
   - Tags <style> e todo CSS inline complexo
   - Tags <script> e qualquer JavaScript
   - Comentários HTML
   - Tags <html>, <head>, <body>, <meta>, <link>
   - Atributos onclick, onload, etc.

4. **MANTENHA**:
   - Classes CSS que referenciam CSS externo (Tailwind, Bootstrap, etc.)
   - Estrutura HTML semântica
   - Textos, imagens (src), links (href)
   - Atributos de acessibilidade (alt, aria-*)

5. **NOMEIE inteligentemente**: 
   - Baseado no conteúdo e propósito do bloco
   - Ex: "Hero com Imagem", "Grid de Features", "Card de Depoimento"

6. **CATEGORIZE corretamente**:
   - "layout" para seções estruturais (hero, header, footer, grids)
   - "texto" para blocos focados em conteúdo textual
   - "midia" para blocos com imagens/vídeos como foco
   - "interativo" para formulários, botões, CTAs

## FORMATO DE RESPOSTA:

Responda APENAS com JSON válido, sem markdown ou texto adicional:

{
  "blocks": [
    {
      "name": "Nome Descritivo do Bloco",
      "category": "layout|texto|midia|interativo",
      "description": "Breve descrição do propósito e conteúdo do bloco",
      "html_content": "<section class=\"...\">HTML limpo aqui</section>"
    }
  ]
}

## DICAS:

- Se o bloco for muito grande, divida em sub-blocos menores
- Priorize blocos que seriam úteis para reutilização
- Ignore elementos muito genéricos como divs vazias
- Se houver cards repetidos, extraia apenas UM como template`;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY não configurada');
    }

    const { html } = await req.json();
    
    if (!html || typeof html !== 'string') {
      return new Response(
        JSON.stringify({ error: 'HTML é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Truncate very large HTML to prevent token overflow
    const maxLength = 50000;
    const truncatedHtml = html.length > maxLength 
      ? html.substring(0, maxLength) + '\n<!-- HTML truncado por ser muito grande -->'
      : html;

    console.log(`Analisando HTML com ${truncatedHtml.length} caracteres...`);

    const openai = new OpenAI({ apiKey: openaiApiKey });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analise este HTML e extraia os blocos reutilizáveis:\n\n${truncatedHtml}` }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0]?.message?.content || '{"blocks":[]}';
    console.log('Resposta da IA recebida, parseando...');

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Erro ao parsear resposta:', parseError);
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Resposta da IA não é um JSON válido');
      }
    }

    // Validate and normalize response
    const blocks = Array.isArray(parsedResponse.blocks) ? parsedResponse.blocks : [];
    
    const normalizedBlocks = blocks.map((block: any, index: number) => ({
      name: block.name || `Bloco ${index + 1}`,
      category: ['layout', 'texto', 'midia', 'interativo'].includes(block.category) 
        ? block.category 
        : 'layout',
      description: block.description || '',
      html_content: replaceImageUrls(block.html_content || block.html || ''),
    })).filter((block: any) => block.html_content && block.html_content.trim().length > 0);

    console.log(`Extraídos ${normalizedBlocks.length} blocos válidos`);

    return new Response(
      JSON.stringify({ 
        blocks: normalizedBlocks,
        total: normalizedBlocks.length,
        truncated: html.length > maxLength
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao analisar HTML';
    console.error('Erro na análise:', errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        blocks: [] 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
