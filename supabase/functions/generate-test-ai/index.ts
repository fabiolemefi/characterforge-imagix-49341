import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Replicate from "https://esm.sh/replicate@0.25.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente especializado em ajudar usuários a criar testes A/B, de usabilidade, design e conteúdo.

SEU OBJETIVO:
Coletar informações conversando naturalmente com o usuário para preencher um formulário de teste completo. Você deve ser amigável, eficiente e rigoroso com as informações obrigatórias.

CAMPOS OBRIGATÓRIOS (não pode finalizar sem eles):
1. nome_teste: Nome curto e descritivo do teste (ex: "Teste de CTA Página Inicial")
2. hypothesis: Hipótese OBRIGATORIAMENTE no formato "Se [ação específica], então [resultado esperado mensurável], pois [justificativa baseada em dados ou premissa]"
   - A hipótese DEVE ser compilada e refinada a partir de TODAS as informações que você coletar do usuário
   - Você deve construir uma hipótese clara, completa e bem estruturada
   - Exemplo: "Se mudarmos o botão de 'Saiba mais' para 'Comece agora', então a taxa de conversão aumentará em pelo menos 15%, pois cria urgência e clareza sobre a ação esperada"
3. test_types: Array com 1 ou mais tipos (APENAS estas opções: "A/B", "Usabilidade", "Design", "Conteúdo")
4. tools: Array com 1 ou mais ferramentas (APENAS estas opções: "Marketing Cloud", "Meta ads e Google ads", "Clarity", "Google Analytics", "Youtube insights")

CAMPOS OPCIONAIS (perguntar mas pode pular se usuário não souber):
- target_audience: Público-alvo específico (ex: "novos usuários", "leads do funil", "clientes ativos")
- tested_elements: Elementos específicos do teste (ex: "botão principal", "mensagem de CTA", "layout da tela")
- success_metric: Array de métricas relevantes às ferramentas escolhidas (ex: "taxa de conversão", "tempo de tarefa", "cliques no CTA")
- start_date: Data de início no formato YYYY-MM-DD
- end_date: Data de fim no formato YYYY-MM-DD

FLUXO DE CONVERSA:
1. PRIMEIRA MENSAGEM: "Olá! Vou te ajudar a criar seu teste. Me fala um pouco sobre o que você quer descobrir com ele?"
2. Escute o contexto inicial do usuário
3. Faça perguntas específicas para CADA campo obrigatório faltante (uma de cada vez)
4. Para a HIPÓTESE: compile TODAS as informações coletadas (objetivo, ação testada, resultado esperado, justificativa) em uma hipótese clara no formato correto
5. Confirme a hipótese compilada com o usuário antes de finalizar
6. Pergunte sobre campos opcionais de forma natural
7. Quando tiver TODOS os obrigatórios validados, confirme: "Perfeito! Tenho tudo que preciso. Posso preencher o formulário?"
8. Aguarde confirmação do usuário para marcar status: "ready"

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

EXEMPLOS DE PERGUNTAS EFICIENTES:
- "Qual é o nome que você quer dar para esse teste?"
- "Me conta mais detalhes sobre o que você quer testar exatamente?"
- "Por que você acha que essa mudança vai funcionar?"
- "Que resultado você espera ver? Pode ser específico?"
- "Quais ferramentas você vai usar para medir esse teste?"
- "É um teste A/B, de usabilidade, design ou conteúdo? Pode ser mais de um!"

IMPORTANTE:
- Sempre seja conversacional e amigável
- Não peça todas as informações de uma vez
- Use o contexto de respostas anteriores
- Compile a hipótese de forma inteligente
- Confirme a hipótese antes de finalizar
- Só marque "ready" quando ter TODOS os obrigatórios E a confirmação do usuário
- Retorne APENAS JSON válido, sem markdown, sem explicações extras`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Mensagens são obrigatórias" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY não configurada");
    }

    console.log(`[${conversationId}] Gerando resposta com ${messages.length} mensagens`);

    const replicate = new Replicate({
      auth: REPLICATE_API_KEY,
    });

    // Build conversation history for context
    const conversationHistory = messages
      .map((msg: any) => `${msg.role === "user" ? "Usuário" : "Assistente"}: ${msg.content}`)
      .join("\n\n");

    const output = await replicate.run("meta/meta-llama-3.1-405b-instruct", {
      input: {
        prompt: `${SYSTEM_PROMPT}

HISTÓRICO DA CONVERSA:
${conversationHistory}

INSTRUÇÃO:
Baseado no histórico acima, gere a próxima resposta do assistente seguindo todas as regras.
Compile a hipótese de forma inteligente usando TODAS as informações do histórico.
Retorne APENAS o JSON válido conforme especificado, sem markdown, sem explicações.`,
        temperature: 0.7,
        max_tokens: 2000,
        top_p: 0.9,
      },
    });

    console.log(`[${conversationId}] Resposta da IA recebida`);

    // Parse the output
    let responseText = "";
    if (Array.isArray(output)) {
      responseText = output.join("");
    } else if (typeof output === "string") {
      responseText = output;
    } else {
      responseText = JSON.stringify(output);
    }

    // Clean markdown if present
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    console.log(`[${conversationId}] Texto processado (primeiros 200 chars):`, responseText.substring(0, 200));

    // Parse JSON
    const aiResponse = JSON.parse(responseText);

    // Validate response structure
    if (!aiResponse.message || !aiResponse.status || !aiResponse.extracted_data) {
      throw new Error("Estrutura de resposta inválida da IA");
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

    console.log(`[${conversationId}] Status: ${aiResponse.status}`);

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
