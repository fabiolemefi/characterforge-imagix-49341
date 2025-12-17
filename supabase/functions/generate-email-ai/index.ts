import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM_PROMPT = `Você é um especialista em criação de emails marketing profissionais HTML.

REGRAS OBRIGATÓRIAS DE COMPOSIÇÃO E ESTRUTURAL:
1. SEMPRE COMEÇAR com bloco tipo "header" (geralmente chamado "Header") com content: null
2. SEMPRE adicionar bloco de imagem logo após Header como banner/hero com content: null
3. USAR "Title" + "Paragrafo" SEMPRE: Cada título deve ser seguido por parágrafo rico explicativo
4. Para parágrafos: DESENVOLVER conteúdo substancial com pelo menos 2-3 frases interessantes, usando <strong>, <em>, <br> para formatação HTML
5. Usar bloco de imagem (ilustrativa) antes de seções importantes para quebrar texto
6. Usar botão APENAS quando existir ação específica e URL conhecida
7. Usar divisor entre tópicos DIFERENTES (não overuse)
8. SEMPRE TERMINAR com bloco de assinatura/signature

CAMPOS OBRIGATÓRIOS NO JSON DE RESPOSTA:
- name: Nome curto e objetivo do email (máx 60 chars)
- subject: Assunto breve e atrativo (40-60 chars ideal, máx 78 chars)
- preview_text: Texto preheader complementar (40-130 chars) que continua/complementa o assunto
- category: Categoria do email (ex: "Páscoa", "Black Friday", "Newsletter")
- blocks: Array de blocos conforme descrito abaixo

FORMATO OBRIGATÓRIO DE CADA BLOCO (CRÍTICO!):
Cada bloco DEVE ter EXATAMENTE esta estrutura JSON:
{
  "name": "NomeExato do bloco conforme listado acima (case-sensitive)",
  "category": "categoria do bloco conforme listado acima",
  "content": { campos específicos do bloco } ou null
}

NUNCA use "type" no lugar de "name". Use SEMPRE "name" para identificar o bloco.
SEMPRE inclua o campo "category" em cada bloco.

BOAS PRÁTICAS DE SUBJECT E PREVIEW_TEXT:
- Subject: Breve, direto, cria urgência/curiosidade, usa emojis se apropriado, foca no benefício principal
- Preview_text: Complementa o subject (não repete!), adiciona contexto/detalhe, convence a abrir o email
- Juntos devem formar uma frase coerente e atrativa na caixa de entrada

IMPORTANTE SOBRE FORMATAÇÕES:
- O usuário pode enviar o conteúdo com formatações HTML (<strong>, <em>, <h1>, <h2>, <ul>, <ol>, <li>)
- Você DEVE preservar e interpretar essas formatações ao montar o conteúdo dos blocos
- Textos com <strong> ou <b> devem manter o negrito
- Textos com <em> ou <i> devem manter o itálico
- Listas <ul> e <ol> com <li> devem ser convertidas em parágrafos ou preservadas conforme o contexto
- Títulos <h1> e <h2> devem ser usados em blocos de título apropriadamente

IMPORTANTE: Retorne APENAS o JSON válido, sem markdown, sem explicações.`;

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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }

    // Fetch active blocks from database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const { data: blocks, error: blocksError } = await supabaseClient
      .from("email_blocks")
      .select("name, category, ai_instructions")
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (blocksError) {
      console.error("Erro ao buscar blocos:", blocksError);
      throw new Error("Erro ao buscar blocos do banco de dados");
    }

    // Build dynamic blocks description
    let blocksDescription = "BLOCOS DISPONÍVEIS NO BANCO DE DADOS:\n";
    
    if (blocks && blocks.length > 0) {
      blocks.forEach((block, index) => {
        const instruction = block.ai_instructions || "Sem instruções específicas";
        blocksDescription += `${index + 1}. ${block.name} (categoria: ${block.category}) - ${instruction}\n`;
      });
    } else {
      blocksDescription += "Nenhum bloco configurado no banco de dados.\n";
    }

    // Combine base prompt with dynamic blocks
    const DYNAMIC_SYSTEM_PROMPT = `${blocksDescription}\n\n${BASE_SYSTEM_PROMPT}`;

    console.log("Gerando email com IA (OpenAI) para:", description.substring(0, 100) + "...");
    console.log("Blocos disponíveis:", blocks?.length || 0);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: DYNAMIC_SYSTEM_PROMPT },
          { 
            role: "user", 
            content: `DESCRIÇÃO DO EMAIL:
${description}

Lembre-se de usar exatamente os nomes dos blocos listados acima (case-sensitive).
Sempre começar com bloco de header e terminar com bloco de assinatura/signature.
Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown.` 
          }
        ],
        temperature: 0.7,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Erro na API OpenAI:", errorData);
      throw new Error(`Erro na API OpenAI: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta OpenAI recebida");

    const responseText = data.choices[0]?.message?.content || "";
    
    // Remove markdown code blocks if present
    let cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    cleanedText = cleanedText.trim();

    console.log("Texto processado:", cleanedText.substring(0, 200) + "...");

    // Parse JSON
    const emailStructure = JSON.parse(cleanedText);

    // Validate structure
    if (!emailStructure.name || !emailStructure.subject || !emailStructure.preview_text || !emailStructure.blocks || !Array.isArray(emailStructure.blocks)) {
      throw new Error("Estrutura de resposta inválida da IA - campos obrigatórios: name, subject, preview_text, blocks");
    }

    // Normalize blocks: convert "type" to "name" and infer missing category
    emailStructure.blocks = emailStructure.blocks.map((block: any) => {
      // Use "name" if present, otherwise fallback to "type"
      const blockName = block.name || block.type;
      
      // Find category from DB if not specified
      let blockCategory = block.category;
      if (!blockCategory && blockName) {
        const matchingDbBlock = blocks?.find(b => 
          b.name.toLowerCase() === blockName.toLowerCase()
        );
        blockCategory = matchingDbBlock?.category || "content";
      }
      
      return {
        name: blockName,
        category: blockCategory || "content",
        content: block.content || null
      };
    });

    console.log("Blocos normalizados:", emailStructure.blocks.map((b: any) => `${b.name}(${b.category})`).join(", "));

    // Find header and signature blocks from DB to ensure correct naming
    const headerBlock = blocks?.find(b => b.category === "header");
    const signatureBlock = blocks?.find(b => b.name.toLowerCase().includes("signature") || b.name.toLowerCase().includes("assinatura"));

    // Ensure first block is a header type
    const firstBlock = emailStructure.blocks[0];
    if (!firstBlock || firstBlock.category !== "header") {
      emailStructure.blocks.unshift({
        name: headerBlock?.name || "Header",
        category: "header",
        content: null,
      });
      console.log("Adicionado Header no início");
    }

    // Ensure last block is signature type
    const lastBlock = emailStructure.blocks[emailStructure.blocks.length - 1];
    const isSignature = lastBlock?.name?.toLowerCase().includes("signature") || 
                        lastBlock?.name?.toLowerCase().includes("assinatura");
    if (!lastBlock || !isSignature) {
      emailStructure.blocks.push({
        name: signatureBlock?.name || "Signature",
        category: "content",
        content: null,
      });
      console.log("Adicionada Signature no final");
    }

    console.log("Estrutura final gerada com", emailStructure.blocks.length, "blocos");

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
