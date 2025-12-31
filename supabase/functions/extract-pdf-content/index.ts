import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not set");
    }

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    const body = await req.json();
    console.log("[extract-pdf-content] Request body:", JSON.stringify(body));

    // Validate required field
    if (!body.pdfUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required field: pdfUrl is required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    console.log("[extract-pdf-content] Extracting content from PDF:", body.pdfUrl);

    // Step 1: Call Replicate with datalab-to/marker model to extract raw markdown
    const markerOutput = await replicate.run("datalab-to/marker", {
      input: {
        file: body.pdfUrl,
        mode: "balanced",
        use_llm: true,
        paginate: false,
        force_ocr: false,
        skip_cache: false,
        format_lines: false,
        save_checkpoint: false,
        disable_ocr_math: false,
        include_metadata: false,
        strip_existing_ocr: false,
        disable_image_extraction: true,
      },
    });

    console.log("[extract-pdf-content] Marker response type:", typeof markerOutput);
    console.log("[extract-pdf-content] Marker response:", JSON.stringify(markerOutput).substring(0, 500));

    // Extract raw markdown from marker response
    let rawMarkdown = "";
    if (typeof markerOutput === "object" && markerOutput !== null) {
      if ("markdown" in markerOutput) {
        rawMarkdown = (markerOutput as { markdown: string }).markdown;
      } else if ("text" in markerOutput) {
        rawMarkdown = (markerOutput as { text: string }).text;
      } else if ("output" in markerOutput) {
        rawMarkdown = (markerOutput as { output: string }).output;
      } else if (Array.isArray(markerOutput)) {
        rawMarkdown = markerOutput.join("\n");
      } else {
        rawMarkdown = JSON.stringify(markerOutput);
      }
    } else if (typeof markerOutput === "string") {
      rawMarkdown = markerOutput;
    }

    console.log("[extract-pdf-content] Raw markdown length:", rawMarkdown.length);
    console.log("[extract-pdf-content] Raw markdown preview:", rawMarkdown.substring(0, 500));

    // Step 2: Use Gemini 3 Pro to clean and extract only email content
    const systemInstruction = `Você é um especialista em extrair conteúdos de email de documentos.

Analise o texto extraído de um PDF e identifique TODOS os emails presentes no documento.

COMO IDENTIFICAR EMAILS SEPARADOS:
1. Marcadores como "# Email - A", "# Email - B", "# Email", "Email D3", "Email D7", "Disparo X"
2. Cada email geralmente tem sua própria tabela de metadados (Assunto, Pré cabeçalho, Modalidade, Categoria)
3. Corpo do email geralmente começa após a tabela de metadados ou com "[logo"
4. Emails terminam com assinatura (Abraços, Equipe Efi Bank, Equipe Efí, etc.)

REGRAS DE EXTRAÇÃO PARA CADA EMAIL:
1. MANTENHA a tabela com Assunto, Pré cabeçalho, Modalidade, Categoria se existirem e tiverem valores
2. REMOVA linhas da tabela que estão vazias ou sem valor preenchido
3. REMOVA:
   - Títulos de páginas/documentos repetitivos (como "Disparo pontual", "Solicitação de cartão PJ")
   - Ícones e imagens decorativas (como "Icon representing...")
   - Links de navegação do documento (como "[Adicionar capa]")
   - Informações de Push e Inapp (apenas emails)
   - Referências a links do Notion/Figma/outros sistemas
   - Prévia no Figma se não for conteúdo relevante

FORMATO DE SAÍDA:
- Separe cada email com a linha: ---EMAIL_SEPARATOR---
- Para cada email, retorne diretamente a tabela de metadados (se existir) seguida do corpo
- NÃO adicione cabeçalhos como "Email sobre [título]" ou "Email A:"
- NÃO adicione linhas de separação "----------------------------------------------------------"

EXEMPLO DE SAÍDA:
| Assunto: | Seu Cartão PJ com 500 pontos grátis |
| Pré cabeçalho: | Garanta o seu cartão Visa Platinum... |
| Modalidade: | Efí Empresas |
| Categoria: | Cartão |

Pedro, seu negócio merece: limite de crédito à altura + 500 pontos grátis no cartão

Por confiar no Efí Bank desde %%DataAbertura%%...

Abraços,
Equipe Efí Bank
---EMAIL_SEPARATOR---
| Assunto: | %%LimiteDisponivel%% de limite pré-aprovado |
| Pré cabeçalho: | Exclusivo para você... |
| Modalidade: | Efí Empresas |
| Categoria: | Cartão |

[conteúdo do próximo email]

Abraços,
Equipe Efí Bank

RETORNE APENAS o conteúdo dos emails separados, sem explicações ou comentários.
Se houver apenas 1 email, retorne apenas seu conteúdo sem separador.`;

    console.log("[extract-pdf-content] Cleaning markdown with Gemini 3 Pro...");

    const geminiOutput = await replicate.run("google/gemini-3-pro", {
      input: {
        prompt: rawMarkdown,
        system_instruction: systemInstruction,
        temperature: 0.3,
        top_p: 0.95,
        max_output_tokens: 65535,
        videos: []
      },
    });

    console.log("[extract-pdf-content] Gemini response type:", typeof geminiOutput);
    console.log("[extract-pdf-content] Gemini response preview:", JSON.stringify(geminiOutput).substring(0, 500));

    // Extract cleaned markdown from Gemini response
    let markdown = "";
    if (typeof geminiOutput === "string") {
      markdown = geminiOutput;
    } else if (Array.isArray(geminiOutput)) {
      markdown = geminiOutput.join("");
    } else if (typeof geminiOutput === "object" && geminiOutput !== null) {
      if ("text" in geminiOutput) {
        markdown = (geminiOutput as { text: string }).text;
      } else if ("output" in geminiOutput) {
        markdown = (geminiOutput as { output: string }).output;
      } else {
        // Fallback to raw markdown if Gemini response is unexpected
        console.log("[extract-pdf-content] Unexpected Gemini response format, using raw markdown");
        markdown = rawMarkdown;
      }
    } else {
      // Fallback to raw markdown
      console.log("[extract-pdf-content] Could not parse Gemini response, using raw markdown");
      markdown = rawMarkdown;
    }

    console.log("[extract-pdf-content] Final cleaned markdown length:", markdown.length);
    console.log("[extract-pdf-content] Final markdown preview:", markdown.substring(0, 300));

    return new Response(
      JSON.stringify({ 
        success: true,
        markdown,
        length: markdown.length
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[extract-pdf-content] Error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: String(error)
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
