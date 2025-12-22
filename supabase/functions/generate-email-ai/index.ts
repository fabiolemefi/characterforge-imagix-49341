import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_SYSTEM_PROMPT = `Você é um especialista em criação de emails marketing profissionais HTML.

REGRAS OBRIGATÓRIAS DE COMPOSIÇÃO E ESTRUTURAL:
1. SEMPRE COMEÇAR com bloco tipo "header" (geralmente chamado "Header") com content: null
2. SEMPRE adicionar bloco de imagem logo após Header como banner/hero
3. USAR "Title" + "Paragrafo" SEMPRE: Cada título deve ser seguido por parágrafo rico explicativo
4. Para parágrafos: DESENVOLVER conteúdo substancial com pelo menos 2-3 frases interessantes, usando <strong>, <em>, <br> para formatação HTML
5. Usar bloco de imagem (ilustrativa) antes de seções importantes para quebrar texto
6. Usar botão APENAS quando existir ação específica e URL conhecida
7. Usar divisor entre tópicos DIFERENTES (não overuse)
8. SEMPRE TERMINAR com bloco de assinatura/signature

REGRA ESPECIAL PARA IMAGEM HERO (BANNER):
- O bloco de imagem que vem IMEDIATAMENTE APÓS o Header é a "hero image" (banner principal)
- Este bloco DEVE ter no campo content:
  - "isHeroImage": true
  - "heroPrompt": uma descrição em português da CENA/AÇÃO desejada para a imagem (NÃO descrever o personagem, apenas a ação/cenário)

CRÍTICO - O heroPrompt DEVE REFLETIR O TOM E CONTEXTO REAL DO EMAIL:
- Se o email é sobre ALERTA, GOLPE, FRAUDE, PERIGO ou PROBLEMA: a cena DEVE mostrar tensão, preocupação, desconfiança, alguém em situação de risco ou sendo enganado
- Se o email é PROMOCIONAL ou CELEBRATIVO: a cena deve mostrar alegria, celebração, conquista
- Se o email é INFORMATIVO ou EDUCATIVO: a cena deve ser neutra e profissional

EXEMPLOS DE heroPrompt por contexto (USE COMO REFERÊNCIA):
- Email sobre GOLPE DO PIX: "idoso preocupado olhando para o celular com expressão de dúvida e desconfiança, recebendo mensagem suspeita, ambiente tenso"
- Email sobre FRAUDE BANCÁRIA: "pessoa desconfiada ao telefone, tentando entender uma ligação suspeita, expressão de alerta e tensão"
- Email sobre SEGURANÇA DIGITAL: "pessoa analisando tela de computador com expressão séria, ambiente de escritório, postura defensiva"
- Email sobre ALERTA DE CONTA: "pessoa preocupada verificando extrato bancário, expressão de surpresa negativa, ambiente tenso"
- Email de DIA DOS NAMORADOS: "celebrando com buquê de flores, ambiente romântico com luz suave, expressão de alegria"
- Email de ANO NOVO (celebração): "brindando com família em festa, luzes e decoração festiva, sorrisos"
- Email de PROMOÇÃO: "pessoa animada fazendo compras, expressão de satisfação, ambiente de loja"

NUNCA transforme temas de ALERTA, GOLPE, FRAUDE ou PERIGO em cenas positivas, felizes ou acolhedoras. 
O heroPrompt DEVE SER FIEL ao contexto NEGATIVO ou POSITIVO do email.
Se o email fala de golpe, fraude ou problema, a cena DEVE refletir tensão, não felicidade

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
    const { description, datasetContent } = await req.json();

    if (!description || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Descrição é obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Dataset fornecido:", datasetContent ? `${datasetContent.length} caracteres` : "Não");

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY não configurada");
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

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

    // Build user prompt
    const userPrompt = datasetContent 
      ? `DATASET DE REFERÊNCIA (use como base para o conteúdo real do email):
---
${datasetContent}
---

DESCRIÇÃO DO EMAIL:
${description}

IMPORTANTE: Use o conteúdo do dataset acima como referência principal para extrair assuntos, pré-cabeçalhos, textos e informações do email. A descrição complementa o contexto.

Lembre-se de usar exatamente os nomes dos blocos listados acima (case-sensitive).
Sempre começar com bloco de header e terminar com bloco de assinatura/signature.
Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown.`
      : `DESCRIÇÃO DO EMAIL:
${description}

Lembre-se de usar exatamente os nomes dos blocos listados acima (case-sensitive).
Sempre começar com bloco de header e terminar com bloco de assinatura/signature.
Retorne APENAS o JSON válido, sem explicações adicionais, sem markdown.`;

    console.log("Gerando email com Gemini 3 Pro via Replicate para:", description.substring(0, 100) + "...");
    console.log("Blocos disponíveis:", blocks?.length || 0);

    // Call Gemini 3 Pro via Replicate
    const geminiOutput = await replicate.run("google/gemini-3-pro", {
      input: {
        prompt: userPrompt,
        system_instruction: DYNAMIC_SYSTEM_PROMPT,
        temperature: 0.7,
        top_p: 0.95,
        max_output_tokens: 8192,
      },
    });

    console.log("Resposta Gemini recebida, tipo:", typeof geminiOutput);

    // Process response (same pattern as extract-pdf-content)
    let responseText = "";
    if (typeof geminiOutput === "string") {
      responseText = geminiOutput;
    } else if (Array.isArray(geminiOutput)) {
      responseText = geminiOutput.join("");
    } else if (typeof geminiOutput === "object" && geminiOutput !== null) {
      if ("text" in geminiOutput) {
        responseText = (geminiOutput as any).text;
      } else if ("output" in geminiOutput) {
        responseText = (geminiOutput as any).output;
      } else {
        responseText = JSON.stringify(geminiOutput);
      }
    }
    
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

    // Mark hero image blocks (image blocks right after header)
    emailStructure.blocks = emailStructure.blocks.map((block: any, index: number) => {
      const prevBlock = emailStructure.blocks[index - 1];
      const isAfterHeader = prevBlock?.category === "header";
      const isImageBlock = block.name?.toLowerCase() === "image" || 
                           block.name?.toLowerCase().includes("image") ||
                           block.name?.toLowerCase() === "imagem";
      
      if (isAfterHeader && isImageBlock) {
        console.log("Marcando bloco de hero image:", block.name);
        return {
          ...block,
          content: {
            ...(block.content || {}),
            isHeroImage: true,
            heroPrompt: block.content?.heroPrompt || `ilustrando o tema: ${emailStructure.category || emailStructure.name}`
          }
        };
      }
      return block;
    });

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

    // Log hero image info
    const heroBlocks = emailStructure.blocks.filter((b: any) => b.content?.isHeroImage);
    console.log("Blocos de hero image encontrados:", heroBlocks.length);
    heroBlocks.forEach((b: any) => console.log("  - heroPrompt:", b.content?.heroPrompt));

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
