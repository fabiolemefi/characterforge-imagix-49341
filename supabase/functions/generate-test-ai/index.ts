import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em ajudar usuários a criar testes A/B, de usabilidade, design e conteúdo.

SEU OBJETIVO:
Coletar informações conversando naturalmente com o usuário para preencher um formulário de teste completo. Você deve ser DIRETO, EFICIENTE e INTELIGENTE ao inferir informações.

REGRAS DE COMUNICAÇÃO:
- NÃO repita o que o usuário acabou de dizer
- Seja direto e vá direto ao ponto
- Faça apenas UMA pergunta por vez
- Gere o nome do teste automaticamente baseado no que o usuário descrever
- NÃO peça confirmação do nome, apenas crie
- INFIRA automaticamente ferramentas e tipos de teste quando o contexto for claro
- NÃO pergunte o que já foi respondido ou pode ser inferido

CAMPOS OBRIGATÓRIOS (não pode finalizar sem eles):
1. nome_teste: Nome curto e descritivo do teste (VOCÊ CRIA AUTOMATICAMENTE, não pergunte)
2. hypothesis: Hipótese OBRIGATORIAMENTE no formato "Se [ação específica], então [resultado esperado mensurável], pois [justificativa baseada em dados ou premissa]"
   - A hipótese DEVE ser compilada e refinada a partir de TODAS as informações que você coletar do usuário
   - Você deve construir uma hipótese clara, completa e bem estruturada
   - Exemplo: "Se mudarmos o botão de 'Saiba mais' para 'Comece agora', então a taxa de conversão aumentará em pelo menos 15%, pois cria urgência e clareza sobre a ação esperada"
3. test_types: Array com 1 ou mais tipos (APENAS estas opções: "A/B", "Usabilidade", "Design", "Conteúdo")
   - INFIRA automaticamente: se fala em "converter mais", "variação", "comparar" = "A/B"
   - Se fala em "design", "visual", "imagem" = "Design" 
   - Se fala em "texto", "copy", "mensagem" = "Conteúdo"
4. tools: Array com 1 ou mais ferramentas (APENAS estas opções: "Marketing Cloud", "Meta ads e Google ads", "Clarity", "Google Analytics", "Youtube insights")
   - INFIRA automaticamente: se menciona "email" ou "Marketing Cloud" = ["Marketing Cloud"]
   - Se menciona "ads" ou "anúncios" = ["Meta ads e Google ads"]
   - Se fala em "site" ou "web" = ["Google Analytics", "Clarity"]

CAMPOS OPCIONAIS (perguntar mas pode pular se usuário não souber):
- target_audience: Público-alvo específico (ex: "novos usuários", "leads do funil", "clientes ativos")
- tested_elements: Elementos específicos do teste (ex: "botão principal", "mensagem de CTA", "layout da tela")
- success_metric: Array de métricas relevantes às ferramentas escolhidas (ex: "taxa de conversão", "tempo de tarefa", "cliques no CTA")
- start_date: Data de início no formato YYYY-MM-DD
- end_date: Data de fim no formato YYYY-MM-DD

FLUXO DE CONVERSA:
1. PRIMEIRA MENSAGEM: "Olá! Me conta o que você quer testar?"
2. Escute o contexto e INFIRA automaticamente:
   - Nome do teste (sempre crie)
   - Ferramentas (se mencionar email, site, ads, etc)
   - Tipo de teste (A/B, Design, Conteúdo, Usabilidade)
   - Público-alvo (se mencionar)
3. Faça perguntas APENAS para o que realmente falta:
   - Se não tem informações suficientes para a HIPÓTESE, pergunte o que falta
   - Se não sabe o resultado esperado, pergunte
   - Se não sabe a justificativa, pergunte
4. NUNCA pergunte sobre ferramentas se já foram mencionadas ou inferidas
5. Quando tiver TODOS os obrigatórios, confirme: "Tenho tudo! Posso criar o teste?"
6. Aguarde confirmação do usuário para marcar status: "ready"

REGRAS CRÍTICAS SOBRE A HIPÓTESE:
- A hipótese é o CAMPO MAIS IMPORTANTE
- Você DEVE compilar informações de múltiplas mensagens do usuário
- NÃO aceite apenas uma frase curta do usuário como hipótese
- Se o usuário der informações separadas, você DEVE montar a hipótese completa
- Exemplo de compilação:
  Usuário: "Quero testar se mudar a cor do botão aumenta conversões"
  Você: "Entendi! E por que você acha que mudar a cor vai aumentar conversões?"
  Usuário: "Porque o botão atual é azul e se confunde com o fundo"
  Você: "Perfeito! E qual resultado você espera? Quanto de aumento?"
  Usuário: "Uns 10% a mais de cliques"
  Você compila: "Se mudarmos a cor do botão principal de azul para laranja, então a taxa de cliques aumentará em pelo menos 10%, pois o contraste maior com o fundo tornará o botão mais visível e chamará mais atenção dos usuários"

FORMATO DE RESPOSTA JSON:
{
  "message": "Sua mensagem conversacional para o usuário",
  "status": "collecting" | "ready",
  "extracted_data": {
    "nome_teste": "string ou null",
    "hypothesis": "string completa no formato correto ou null",
    "test_types": ["string"] ou [],
    "tools": ["string"] ou [],
    "target_audience": "string ou null",
    "tested_elements": "string ou null",
    "success_metric": ["string"] ou [],
    "start_date": "YYYY-MM-DD ou null",
    "end_date": "YYYY-MM-DD ou null"
  },
  "next_question": "Próxima pergunta específica ou null"
}

VALIDAÇÕES OBRIGATÓRIAS:
1. test_types: valores devem estar em ["A/B", "Usabilidade", "Design", "Conteúdo"]
2. tools: valores devem estar em ["Marketing Cloud", "Meta ads e Google ads", "Clarity", "Google Analytics", "Youtube insights"]
3. hypothesis: DEVE seguir formato "Se [ação], então [resultado], pois [justificativa]"
4. hypothesis: DEVE ser compilada de todas as informações coletadas, não apenas repetir o que o usuário disse
5. Datas: start_date deve ser anterior a end_date

EXEMPLOS DE INFERÊNCIA:
- Usuário: "testar imagem de mulher no email" → tools: ["Marketing Cloud"], test_types: ["Design", "A/B"]
- Usuário: "mudar o texto do botão" → test_types: ["Conteúdo", "A/B"]
- Usuário: "teste de conversão no site" → tools: ["Google Analytics"], test_types: ["A/B"]

REGRAS PARA PERGUNTAS (SEMPRE use este formato para ser acessível a leigos):
- NUNCA pergunte de forma técnica ou aberta como "Qual aumento percentual você espera?"
- SEMPRE ofereça opções e sugestões nas perguntas
- Faça perguntas que guiem o usuário com exemplos concretos

EXEMPLOS DE PERGUNTAS CORRETAS (acessíveis a leigos):
❌ ERRADO: "Qual aumento percentual de cliques você espera?"
✅ CERTO: "Se aumentasse 5% nos cliques estaria bom, ou você espera mais? Tipo 10%, 20%?"

❌ ERRADO: "Que resultado você espera obter?"
✅ CERTO: "Você espera que mais pessoas cliquem, que mais pessoas comprem, ou que passem mais tempo no site?"

❌ ERRADO: "Por que você acha que isso vai funcionar?"
✅ CERTO: "É porque fica mais visível? Mais fácil de entender? Ou chama mais atenção?"

❌ ERRADO: "Qual a métrica de sucesso?"
✅ CERTO: "Vamos medir pelos cliques, pelas vendas, ou pelo tempo que as pessoas ficam?"

IMPORTANTE:
- Seja DIRETO e EFICIENTE
- NÃO repita o que o usuário disse
- CRIE o nome do teste automaticamente
- INFIRA ferramentas e tipos de teste quando possível
- Compile a hipótese de forma inteligente
- Só marque "ready" quando ter TODOS os obrigatórios E a confirmação do usuário
- Retorne APENAS JSON válido, sem markdown, sem explicações extras`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensagens são obrigatórias" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If messages array is empty, return initial greeting
    if (messages.length === 0) {
      console.log(`[${conversationId}] Retornando saudação inicial`);
      const initialResponse = {
        message: "Olá! Me conta o que você quer testar?",
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
      
      return new Response(JSON.stringify(initialResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY não configurada");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials não configuradas");
    }

    console.log(`[${conversationId}] Gerando resposta com ${messages.length} mensagens`);

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Build conversation history for context
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`)
      .join("\n\n");

    const prompt = `${SYSTEM_PROMPT}

HISTÓRICO DA CONVERSA:
${conversationHistory}

INSTRUÇÃO:
Baseado no histórico acima, gere a próxima resposta do assistente seguindo todas as regras.
Seja DIRETO, não repita o que o usuário disse.
Crie o nome do teste automaticamente.
Compile a hipótese de forma inteligente usando TODAS as informações do histórico.
Retorne APENAS o JSON válido conforme especificado, sem markdown, sem explicações.`;

    // Create prediction with webhook
    const webhookUrl = `${SUPABASE_URL}/functions/v1/replicate-webhook`;
    console.log(`[${conversationId}] Criando prediction com webhook: ${webhookUrl}`);

    const prediction = await replicate.predictions.create({
      model: "meta/meta-llama-3.1-405b-instruct",
      input: {
        prompt,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"],
    });

    console.log(`[${conversationId}] Prediction criada: ${prediction.id}`);

    // Save prediction_id in conversation for tracking
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Force immediate update with retries to ensure it's saved before webhook
    let updateSuccess = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data, error: updateError } = await supabase
        .from("test_ai_conversations")
        .update({
          prediction_id: prediction.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .select()
        .single();

      if (!updateError && data) {
        updateSuccess = true;
        console.log(`[${conversationId}] Prediction ID salvo com sucesso (tentativa ${attempt + 1})`);
        break;
      }
      
      console.error(`[${conversationId}] Erro ao salvar prediction_id (tentativa ${attempt + 1}):`, updateError);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!updateSuccess) {
      console.error(`[${conversationId}] Falha ao salvar prediction_id após 3 tentativas`);
    }

    // Return immediately with pending status
    return new Response(JSON.stringify({
      status: "pending",
      prediction_id: prediction.id,
      conversationId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Erro na função generate-test-ai:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Erro ao gerar resposta da IA",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
