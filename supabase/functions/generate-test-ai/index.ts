import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.28.0";

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
5. insights: String com insights valiosos sobre como executar o teste (OBRIGATÓRIO quando status = "ready")

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
5. Quando tiver TODOS os obrigatórios, marque status: "ready" AUTOMATICAMENTE
6. Diga apenas: "Pronto! Vou preencher o formulário para você revisar e criar o teste."
7. NÃO pergunte se pode criar, APENAS sinalize que está pronto

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

REGRAS PARA PERGUNTAS:
- UMA pergunta por vez (direto ao ponto)
- NÃO repita o que o usuário disse
- Seja natural e conversacional (sem robótico)
- Use emojis com moderação (apenas 1-2 por mensagem)
- INFIRA automaticamente quando possível
- Pergunte apenas o que realmente falta para completar os campos obrigatórios

PERGUNTAS PROFUNDAS E INSTIGANTES (use para fazer o usuário pensar melhor):

1. QUESTIONE PREMISSAS:
   ❌ "Por que você acha que a cor vermelha vai funcionar?"
   ✅ "Interessante! Mas você já considerou que vermelho pode passar sensação de alerta ou urgência? Isso se encaixa com a mensagem que você quer transmitir? Ou seria melhor uma cor que transmita confiança?"

2. EXPLORE CENÁRIOS:
   ❌ "Que resultado você espera?"
   ✅ "Vamos pensar no cenário ideal: se esse teste superasse TODAS as expectativas, o que mudaria no seu negócio? E qual seria o MÍNIMO de melhoria que justificaria o esforço de implementar a mudança?"

3. DESAFIE A LÓGICA:
   ❌ "Como você vai medir isso?"
   ✅ "Se os cliques aumentarem mas as conversões caírem, o teste foi um sucesso ou fracasso? Como você vai interpretar diferentes cenários de resultado?"

4. AMPLIE O CONTEXTO:
   ❌ "Quando você quer fazer o teste?"
   ✅ "Existe alguma sazonalidade no seu negócio? Tipo, tem épocas que as pessoas clicam mais ou menos? Isso pode impactar o resultado?"

5. PROVOQUE REFLEXÃO:
   ❌ "Qual o público do teste?"
   ✅ "Você acha que clientes antigos e novos vão reagir da mesma forma? Às vezes uma cor que atrai novos usuários pode parecer 'forçada' para quem já conhece a marca..."

REGRAS PARA ESTAS PERGUNTAS:
- Use APENAS quando o contexto permitir (não force)
- Faça NO MÁXIMO 2 perguntas profundas por conversa
- Intercale com perguntas diretas e simples
- O objetivo é fazer o usuário pensar, não intimidar
- Se o usuário responder de forma simples, aceite e continue

CAMPO INSIGHTS (IMPORTANTE):
Quando marcar status como "ready", você DEVE gerar insights valiosos no campo "insights":

O campo insights deve conter:
- ✅ Melhores práticas de execução do teste
- ✅ Pontos de atenção durante o teste (ex: evitar mudanças simultâneas)
- ✅ Como interpretar os resultados (ex: considerar significância estatística)
- ✅ Dicas de acompanhamento (ex: monitorar por pelo menos 2 semanas)
- ✅ Próximos passos após o teste (ex: se funcionar, testar outras cores)

EXEMPLO de insights bem escrito:
"⚠️ Teste por pelo menos 2 semanas para ter dados confiáveis.
📊 Monitore não só os cliques, mas também o que acontece depois (conversões, tempo no site).
💡 Se o vermelho funcionar bem, teste outras cores quentes como laranja.
🔍 Atenção: não faça outras mudanças no site durante o teste.
📈 Um aumento de 7% é estatisticamente significativo com pelo menos 1000 visualizações."

Seja específico e útil. Use emojis para facilitar a leitura.

FORMATO DE RESPOSTA JSON:
{
  "message": "Sua mensagem conversacional para o usuário",
  "status": "collecting" | "ready",
  "extracted_data": {
    "nome_teste": "string ou null",
    "hypothesis": "string completa no formato correto ou null",
    "insights": "string com insights valiosos ou null",
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
- Quando tiver TODOS os obrigatórios, marque status: "ready" AUTOMATICAMENTE e diga: "Pronto! Vou preencher o formulário para você revisar e criar o teste."
- NÃO pergunte se pode criar, APENAS sinalize que está pronto
- Retorne APENAS JSON válido, sem markdown, sem explicações extras`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Return version info for direct access (GET requests)
  if (req.method === "GET") {
    return new Response(JSON.stringify({
      last_updated: "2025-11-13T10:08:00Z"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY não configurada");
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials não configuradas");
    }

    // Criar cliente Supabase uma única vez
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

    const userPrompt = `${SYSTEM_PROMPT}
${dataContext}
HISTÓRICO RECENTE DA CONVERSA:
${conversationHistory}

INSTRUÇÃO:
Baseado nos DADOS JÁ COLETADOS e no histórico RECENTE acima, gere a próxima resposta do assistente.
NÃO repita perguntas sobre dados que já foram coletados.
Seja DIRETO, não repita o que o usuário disse.
Crie o nome do teste automaticamente.
Compile a hipótese de forma inteligente usando TODAS as informações do histórico.
Retorne APENAS o JSON válido conforme especificado, sem markdown, sem explicações.`;

    // Call OpenAI API directly
    console.log(`[${conversationId}] Chamando OpenAI API`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{ role: "user", content: userPrompt }],
      temperature: 0.9,
      max_tokens: 2000,
      top_p: 0.9,
    });

    const aiResponseText = completion.choices[0]?.message?.content;
    if (!aiResponseText) {
      throw new Error("Nenhuma resposta da OpenAI");
    }

    console.log(`[${conversationId}] Resposta da OpenAI recebida`);

    // Parse the AI response
    let responseText = aiResponseText.trim();

    // Clean markdown if present
    responseText = responseText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Erro ao fazer parse da resposta da OpenAI:", parseError);
      console.error("Resposta bruta:", responseText);
      throw new Error("Falha ao parsear resposta da IA");
    }

    // Validate response structure
    if (!aiResponse.message || !aiResponse.status || !aiResponse.extracted_data) {
      throw new Error("Estrutura de resposta da IA inválida");
    }

    // Ensure arrays are arrays
    if (aiResponse.extracted_data.test_types && !Array.isArray(aiResponse.extracted_data.test_types)) {
      aiResponse.extracted_data.test_types = [];
    }
    if (aiResponse.extracted_data.tools && !Array.isArray(aiResponse.extracted_data.tools)) {
      aiResponse.extracted_data.tools = [];
    }
    if (aiResponse.extracted_data.success_metric && !Array.isArray(aiResponse.extracted_data.success_metric)) {
      aiResponse.extracted_data.success_metric = [];
    }

    // Update conversation in database
    // Add AI message to conversation
    const currentMessages = (messages || []) as any[];
    const aiMessage = {
      role: "assistant",
      content: aiResponse.message,
      timestamp: new Date().toISOString(),
    };
    const updatedMessages = [...currentMessages, aiMessage];

    const { error: updateError } = await supabase
      .from("test_ai_conversations")
      .update({
        messages: updatedMessages,
        extracted_data: aiResponse.extracted_data,
        status: aiResponse.status === "ready" ? "ready" : "draft",
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    if (updateError) {
      console.error("Erro ao atualizar conversa:", updateError);
      throw updateError;
    }

    console.log(`[${conversationId}] Conversa atualizada com sucesso`);

    // Return the AI response directly
    return new Response(JSON.stringify(aiResponse), {
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
