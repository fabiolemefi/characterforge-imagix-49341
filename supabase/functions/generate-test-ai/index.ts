import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback prompt if no assistant is found
const FALLBACK_SYSTEM_PROMPT = `Você é um assistente especializado em ajudar usuários. Responda em JSON com: { "message": "sua resposta", "status": "collecting", "extracted_data": {}, "next_question": null }`;
const FALLBACK_GREETING = "Olá! Como posso ajudar?";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Return version info for direct access (GET requests)
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      last_updated: "2025-12-11T18:00:00Z",
      version: "2.0.0-dynamic"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }

  try {
    const { messages, conversationId, assistantSlug = "test-creation" } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens são obrigatórias" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials não configuradas");
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch assistant configuration from database
    console.log(`[${conversationId}] Buscando assistente: ${assistantSlug}`);
    const { data: assistant, error: assistantError } = await supabase
      .from("ai_assistants")
      .select("*")
      .eq("slug", assistantSlug)
      .eq("is_active", true)
      .single();

    if (assistantError) {
      console.error(`[${conversationId}] Erro ao buscar assistente:`, assistantError);
    }

    // Use assistant config or fallback
    const systemPrompt = assistant?.system_prompt || FALLBACK_SYSTEM_PROMPT;
    const greetingMessage = assistant?.greeting_message || FALLBACK_GREETING;
    const modelConfig = assistant?.model_config || {
      model: "gpt-4-turbo-preview",
      temperature: 1.1,
      max_tokens: 2500,
      top_p: 0.95,
      frequency_penalty: 0.3,
      presence_penalty: 0.2
    };

    console.log(`[${conversationId}] Usando assistente: ${assistant?.name || 'fallback'}, modelo: ${modelConfig.model}`);

    // If messages array is empty, return initial greeting from config
    if (messages.length === 0) {
      console.log(`[${conversationId}] Retornando saudação inicial do assistente`);
      const initialResponse = {
        message: greetingMessage,
        status: "collecting",
        extracted_data: {
          nome_teste: null,
          hypothesis: null,
          test_types: [],
          tools: [],
          target_audience: null,
          tested_elements: null,
          success_metric: [],
          start_date: null,
          end_date: null,
        },
        next_question: null,
      };

      // Update conversation with assistant_id if found
      if (assistant && conversationId) {
        await supabase
          .from("test_ai_conversations")
          .update({ assistant_id: assistant.id })
          .eq("id", conversationId);
      }

      return new Response(JSON.stringify(initialResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`[${conversationId}] Gerando resposta com ${messages.length} mensagens`);

    // Buscar dados já coletados da conversa
    const { data: conversationData } = await supabase
      .from("test_ai_conversations")
      .select("extracted_data")
      .eq("id", conversationId)
      .single();
    
    const extractedData = conversationData?.extracted_data || {};

    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    // Função para otimizar o contexto (manter mensagens essenciais)
    function optimizeContext(messages: any[], maxMessages = 10) {
      if (messages.length <= maxMessages) {
        return messages;
      }
      // Manter primeira mensagem + últimas N mensagens
      return [
        messages[0],
        ...messages.slice(-maxMessages + 1)
      ];
    }

    // Otimizar contexto para economizar tokens
    const optimizedMessages = optimizeContext(messages, 10);

    // Adicionar dados já coletados ao contexto
    const dataContext = Object.keys(extractedData || {}).length > 0
      ? `\nDADOS JÁ COLETADOS:\n${JSON.stringify(extractedData, null, 2)}\n`
      : '';

    // Build conversation history for context
    const conversationHistory = optimizedMessages
      .map((msg: any) => `${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`)
      .join("\n\n");

    // Get last user message for smart extraction
    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop()?.content || "";

    // Build dynamic fields list from assistant configuration
    const fieldsSchema = assistant?.fields_schema || [];
    const fieldsToExtract = fieldsSchema.length > 0
      ? fieldsSchema.map((f: any) => `- ${f.name}: ${f.label || f.name}${f.required ? ' (OBRIGATÓRIO)' : ''}`).join("\n")
      : "- Extraia campos relevantes da mensagem";

    // Identify already filled fields
    const filledFields = Object.entries(extractedData || {})
      .filter(([_, value]) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
      .map(([key, _]) => key);
    
    // Get pending required and optional fields separately
    const pendingRequiredFields = fieldsSchema
      .filter((f: any) => f.required && !filledFields.includes(f.name))
      .map((f: any) => f.name);
    
    const pendingFieldsList = fieldsSchema
      .filter((f: any) => !filledFields.includes(f.name))
      .map((f: any) => `- ${f.name}: ${f.label || f.name}${f.required ? ' (OBRIGATÓRIO)' : ''}`)
      .join("\n");

    const requiredFieldNames = fieldsSchema
      .filter((f: any) => f.required)
      .map((f: any) => f.name)
      .join(", ");

    const userPrompt = `${systemPrompt}
${dataContext}
HISTÓRICO RECENTE DA CONVERSA:
${conversationHistory}

## CAMPOS QUE VOCÊ DEVE ATIVAMENTE BUSCAR NA ÚLTIMA MENSAGEM:
${fieldsToExtract}

## CAMPOS JÁ PREENCHIDOS: ${filledFields.join(", ") || "nenhum ainda"}

## CAMPOS PENDENTES (foque nestes):
${pendingFieldsList || "todos preenchidos"}

## 🚨 PRIORIDADE ABSOLUTA - PERGUNTE SOBRE CAMPOS PENDENTES:
${pendingRequiredFields.length > 0 
  ? `AINDA FALTAM CAMPOS OBRIGATÓRIOS: ${pendingRequiredFields.join(", ")}
Sua PRÓXIMA PERGUNTA DEVE ser sobre UM desses campos específicos.
NÃO faça perguntas genéricas sobre estratégia enquanto campos obrigatórios estiverem faltando.`
  : `Todos os campos obrigatórios estão preenchidos. Marque status="ready" e encerre.`}

## MAPA DE PERGUNTAS POR CAMPO PENDENTE (use como referência):
- motivo_demanda → "O que motivou essa demanda? Por que surgiu essa necessidade agora?"
- modalidade_conta → "Qual a modalidade da conta: Efí Empresas, Efí Agro, ou Efí Pessoal?"
- base_manual_ou_automatica → "A base será enviada manualmente pelo time ou gerada automaticamente pelo sistema?"
- prioridade_urgencia → "Qual a urgência dessa ação: precisa sair imediatamente ou pode esperar?"
- tipo_usuario → "São clientes PJ, PF, MEI ou outro tipo?"
- publico → "Qual é o segmento ou perfil desse público?"
- objetivo_final → "Qual o resultado esperado dessa comunicação?"
- acao_desejada → "Que ação você quer que o cliente tome?"
- tela_destino → "Para onde o cliente será direcionado?"
- conexao_com_estrategia → "Como isso se conecta com a estratégia maior?"
- metrica_de_negocio → "Como você vai medir o sucesso? Qual métrica?"
- desafios_comerciais → "Quais são os principais desafios comerciais?"

## PROCESSO DE ANÁLISE OBRIGATÓRIO (execute para CADA campo pendente):
1. Leia a última mensagem COMPLETAMENTE
2. Para CADA campo pendente, pergunte internamente: "Há informação sobre este campo no texto?"
3. Se SIM (mesmo que implícito) → extraia e inclua em extracted_data
4. Só deixe como null campos sem NENHUMA pista no texto

## REGRAS DE INFERÊNCIA (aplique sempre):
- "o time enviará a base" → base_manual_ou_automatica = "manual"
- "o sistema criará automaticamente" → base_manual_ou_automatica = "automatica"
- "Efí Empresas" / "conta empresarial" → modalidade_conta = "Efí Empresas"
- "Efí Agro" / "conta agro" → modalidade_conta = "Efí Agro"
- "Efí Pessoal" / "conta pessoal" → modalidade_conta = "Efí Pessoal"
- "mostrar passo a passo" / "ensinar" → acao_desejada relacionada
- "taxa de abertura/clique/conversão" → metrica_de_negocio = essa métrica
- Menção de PJ/PF/MEI → tipo_usuario
- Menção de agro/varejo/saúde/etc → publico (segmento)
- "precisa urgente" / "para ontem" → prioridade_urgencia = "alta"
- "sem pressa" → prioridade_urgencia = "baixa"

## EXEMPLO DE EXTRAÇÃO MÁXIMA:
Texto: "O time de negócios vai enviar a base de clientes PJ do agro. Queremos que eles usem o novo recurso de antecipação. É urgente."
extracted_data extraído:
{
  "base_manual_ou_automatica": "manual",
  "tipo_usuario": "PJ",
  "publico": "segmento agronegócio",
  "acao_desejada": "usar o novo recurso de antecipação",
  "prioridade_urgencia": "alta"
}

## INSTRUÇÃO CRÍTICA - EXTRAÇÃO SILENCIOSA:
1. EXTRAIA TODOS os dados que puder identificar de uma só vez no extracted_data
2. NÃO liste campos preenchidos - apenas continue a conversa naturalmente
3. NÃO diga "extraímos", "coletamos", "preenchemos" ou similar
4. Após extrair, simplesmente faça a próxima pergunta sobre o PRÓXIMO campo pendente

## QUANDO MARCAR STATUS = "READY":
Campos obrigatórios são: ${requiredFieldNames || "nenhum definido"}
- Se TODOS os campos obrigatórios acima estiverem preenchidos → status = "ready"
- NÃO continue perguntando indefinidamente sobre campos opcionais
- Ao marcar ready, faça uma mensagem de encerramento breve

## REGRAS FINAIS:
- Retorne APENAS JSON válido, sem markdown
- Sua próxima pergunta DEVE ser sobre um campo pendente específico, não genérica

ÚLTIMA MENSAGEM DO USUÁRIO PARA ANÁLISE:
"${lastUserMessage}"`;

    console.log(`[${conversationId}] Chamando OpenAI com modelo ${modelConfig.model}...`);

    const completion = await openai.chat.completions.create({
      model: modelConfig.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: modelConfig.temperature,
      max_tokens: modelConfig.max_tokens,
      top_p: modelConfig.top_p,
      frequency_penalty: modelConfig.frequency_penalty,
      presence_penalty: modelConfig.presence_penalty,
    });

    const aiContent = completion.choices[0]?.message?.content;
    console.log(`[${conversationId}] Resposta recebida:`, aiContent?.substring(0, 200));

    if (!aiContent) {
      throw new Error("Resposta vazia da OpenAI");
    }

    // Parse JSON response
    let parsedResponse: any;
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?|\n?```/g, "").trim();
      parsedResponse = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error(`[${conversationId}] Erro ao parsear JSON:`, parseError);
      // Return a fallback response
      parsedResponse = {
        message: "Desculpe, tive um problema ao processar a resposta. Pode repetir?",
        status: "collecting",
        extracted_data: extractedData,
        next_question: null,
      };
    }

    // Validate critical fields when status is ready (apenas log, não forçar regressão)
    if (parsedResponse.status === "ready") {
      const insights = parsedResponse.extracted_data?.insights;
      if (!insights || insights.length < 100) {
        console.log(`[${conversationId}] Insights curtos ou ausentes, mas permitindo status ready`);
      }
    }

    // Merge extracted data - preservar valores existentes não-nulos
    const mergedExtractedData = { ...extractedData };
    
    // Só atualiza campos que tenham valor real (não null/undefined/vazio)
    for (const [key, value] of Object.entries(parsedResponse.extracted_data || {})) {
      const isValidValue = value !== null && 
                           value !== undefined && 
                           value !== '' && 
                           !(Array.isArray(value) && value.length === 0);
      
      if (isValidValue) {
        mergedExtractedData[key] = value;
      }
    }
    
    console.log(`[${conversationId}] Merge resultado - campos preenchidos:`, 
      Object.keys(mergedExtractedData).filter(k => {
        const v = mergedExtractedData[k];
        return v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
      })
    );

    // Prepare final response
    const finalResponse = {
      message: parsedResponse.message,
      status: parsedResponse.status,
      extracted_data: mergedExtractedData,
      next_question: parsedResponse.next_question,
    };

    // Update conversation in database
    if (conversationId) {
      const lastMessage = messages[messages.length - 1];
      const allMessages = [
        ...messages,
        {
          role: "assistant",
          content: parsedResponse.message,
          timestamp: new Date().toISOString(),
        },
      ];

      await supabase
        .from("test_ai_conversations")
        .update({
          messages: allMessages,
          extracted_data: mergedExtractedData,
          status: parsedResponse.status === "ready" ? "ready" : "draft",
          updated_at: new Date().toISOString(),
          assistant_id: assistant?.id || null,
        })
        .eq("id", conversationId);

      console.log(`[${conversationId}] Conversa atualizada no banco`);
    }

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Erro na edge function:", errorMessage);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      message: "Desculpe, ocorreu um erro. Tente novamente.",
      status: "collecting",
      extracted_data: {},
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
