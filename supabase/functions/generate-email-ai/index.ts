import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um especialista em criação de emails marketing profissionais HTML.

BLOCOS DISPONÍVEIS NO BANCO DE DADOS:
1. Header (categoria: header) - Cabeçalho com logo e categoria
2. Welcome (categoria: header) - Mensagem de boas-vindas com título personalizado
3. Image (categoria: content) - Imagem hero ou ilustrativa
4. Title (categoria: content) - Título de seção
5. Paragrafo (categoria: content) - Texto explicativo rico e detalhado em parágrafos
6. button (categoria: content) - Botão de call-to-action
7. Divisor (categoria: content) - Linha separadora
8. Signature (categoria: content) - Assinatura personalizada (opcional) ou despedida padrão

REGRAS OBRIGATÓRIAS DE COMPOSIÇÃO E ESTRATURAL:
1. SEMPRE COMEÇAR com "Header" (category: header, name: Header)
2. Após Header, usar "Image" como hero/banner quando houver tema visual forte
3. Usar "Welcome" SE houver mensagem de boas-vindas personalizada
4. USAR "Title" + "Paragrafo" SEMPRE: Cada título deve ser seguido por parágrafo rico explicativo
5. Para "Paragrafo": DESENVOLVER conteúdo substancial com pelo menos 2-3 frases interessantes, usando <strong>, <em>, <br> para formatação
6. Usar "Image" (ilustrativa) antes de seções importantes para quebrar texto
7. Usar "button" APENAS quando existir ação específica e URL conhecida
8. Usar "Divisor" entre tópicos DIFERENTES (não overuse)
9. Para "Signature": se houver assinatura específica na descrição, personalize com content:text (ex: "Atenciosamente,<br>Equipe Marketing"). Senão, usar content: null (mantém padrão)
10. SEMPRE TERMINAR com "Signature" (category: content, name: Signature)

FORMATO DE CONTEÚDO:
- Para "Header": forneça category (Palavra que resume o email)
- Para "Welcome": forneça title (texto principal de boas-vindas)
- Para "Title": forneça title (título da seção)
- Para "Paragrafo": forneça text (HTML rica: <p><strong>destacado</strong></p><p>mais conteúdo...</p>)
- Para "Signature": OPCIONAL: content.text (ex: "<p>Atenciosamente,<br><strong>Equipe Marketing</strong></p>") OU null
- Para "button": forneça button_text e url (apenas se houver ação específica)
- Para "Header", "Divisor", "Image": content: null

EXEMPLOS PRÁTICOS DE DESENVOLVIMENTO:

EXEMPLO 1 - Tema Páscoa com múltiplas seções:
[
  {"name": "Header", "category": "header", "content": "comunicado"},
  {"name": "Image", "category": "content", "content": null},
  {"name": "Welcome", "category": "header", "content": {"title": "Olá, Pedro!"}},
  {"name": "Title", "category": "content", "content": {"title": "Feliz Páscoa!"}},
  {"name": "Paragrafo", "category": "content", "content": {"text": "<p>O <strong>Coelhinho da Páscoa</strong> está chegando com novidades emocionantes para toda a família! Preparem-se para receber ovos deliciosos e surpresas encantadoras.</p><p>Nossos colaboradores receberão cestas especiais em casa com produtos frescos e artesanais, pensados com carinho para tornar sua Páscoa ainda mais especial.</p>"}},
  {"name": "Image", "category": "content", "content": null},
  {"name": "Title", "category": "content", "content": {"title": "Atualizar Endereço"}},
  {"name": "Paragrafo", "category": "content", "content": {"text": "<p>Para garantir a entrega da sua cesta, atualize seus dados cadastrais clicando abaixo.</p>"}},
  {"name": "button", "category": "content", "content": {"button_text": "Atualizar Endereço", "url": "https://empresa.com/atualizar"}},
  {"name": "Signature", "category": "content", "content": {"text": "<p>Abraços,<br><em>Equipe de RH</em></p>"}}
]

IMPORTANTE: Use o campo "name" exatamente como listado acima (case-sensitive)! Retorne APENAS o JSON válido, sem markdown, sem explicações.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { description } = await req.json();

    if (!description || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY não configurada");
    }

    console.log("Gerando email com IA para:", description);

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const output = await replicate.run("meta/meta-llama-3.1-405b-instruct", {
      input: {
        prompt: `${SYSTEM_PROMPT}

DESCRIÇÃO DO EMAIL:
${description}

Lembre-se de usar exatamente os nomes dos blocos listados: Header, Welcome, Title, Paragrafo, button, Divisor, Signature.
Sempre começar com Header e terminar com Signature.
Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown.`,
        temperature: 0.7,
        max_tokens: 3000,
        top_p: 0.9,
      },
    });

    console.log("Resposta da IA:", output);

    // Parse the output - it comes as an array of strings
    let responseText = "";
    if (Array.isArray(output)) {
      responseText = output.join("");
    } else if (typeof output === "string") {
      responseText = output;
    } else {
      responseText = JSON.stringify(output);
    }

    // Remove markdown code blocks if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    responseText = responseText.trim();

    console.log("Texto processado:", responseText);

    // Parse JSON
    const emailStructure = JSON.parse(responseText);

    // Validate structure
    if (!emailStructure.subject || !emailStructure.blocks || !Array.isArray(emailStructure.blocks)) {
      throw new Error("Estrutura de resposta inválida da IA");
    }

    // Ensure first block is Header and last is Signature
    const firstBlock = emailStructure.blocks[0];
    if (!firstBlock || firstBlock.name !== "Header") {
      emailStructure.blocks.unshift({
        name: "Header",
        category: "header",
        content: null,
      });
      console.log("Adicionado Header no início");
    }

    const lastBlock = emailStructure.blocks[emailStructure.blocks.length - 1];
    if (!lastBlock || lastBlock.name !== "Signature") {
      emailStructure.blocks.push({
        name: "Signature",
        category: "content",
        content: null,
      });
      console.log("Adicionada Signature no final");
    }

    console.log("Estrutura final:", JSON.stringify(emailStructure));

    return new Response(JSON.stringify(emailStructure), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erro na função generate-email-ai:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao gerar email com IA",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
