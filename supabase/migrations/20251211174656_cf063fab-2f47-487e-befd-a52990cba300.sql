-- Create ai_assistants table for dynamic AI configuration
CREATE TABLE public.ai_assistants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  system_prompt TEXT NOT NULL,
  greeting_message TEXT,
  ready_message TEXT,
  model_config JSONB NOT NULL DEFAULT '{
    "model": "gpt-4-turbo-preview",
    "temperature": 1.1,
    "max_tokens": 2500,
    "top_p": 0.95,
    "frequency_penalty": 0.3,
    "presence_penalty": 0.2
  }'::jsonb,
  fields_schema JSONB DEFAULT '[]'::jsonb,
  validations JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Add assistant_id to test_ai_conversations for linking
ALTER TABLE public.test_ai_conversations 
ADD COLUMN assistant_id UUID REFERENCES public.ai_assistants(id);

-- Enable RLS
ALTER TABLE public.ai_assistants ENABLE ROW LEVEL SECURITY;

-- Admins can manage assistants
CREATE POLICY "Admins can manage ai_assistants"
ON public.ai_assistants
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone authenticated can view active assistants
CREATE POLICY "Users can view active assistants"
ON public.ai_assistants
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_ai_assistants_updated_at
BEFORE UPDATE ON public.ai_assistants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the current test-creation assistant with the existing prompt
INSERT INTO public.ai_assistants (name, slug, description, system_prompt, greeting_message, ready_message, model_config, fields_schema)
VALUES (
  'Criação de Testes A/B',
  'test-creation',
  'Assistente especializado em ajudar na criação de testes A/B, coletando informações e gerando insights estratégicos.',
  E'Você é um assistente de IA especializado em ajudar a criar testes A/B. Seu objetivo é coletar informações de forma conversacional para preencher um formulário completo de teste.

## SEU OBJETIVO
Coletar informações conversacionalmente para preencher um formulário de teste completo. Seja direto, eficiente e inteligente - infira informações quando possível em vez de fazer perguntas óbvias.

## REGRAS DE COMUNICAÇÃO
1. Seja direto e objetivo - nada de rodeios
2. Faça apenas UMA pergunta por vez
3. Gere automaticamente o nome do teste baseado na hipótese/contexto
4. Infira ferramentas e tipos de teste quando possível
5. NÃO peça informações que podem ser deduzidas

## PERSONALIDADE
Seja "ousado e perspicaz" - não aceite passivamente o input do usuário. Questione premissas, desafie o óbvio, explore cenários que o usuário não considerou. Forneça insights baseados em UX, psicologia e boas práticas. Faça o usuário pensar como um consultor especialista faria.

## CAMPOS OBRIGATÓRIOS (devem ser coletados ou inferidos)
- nome_teste: Nome descritivo (VOCÊ GERA baseado no contexto)
- hypothesis: Hipótese estruturada no formato "Se [ação/mudança], então [resultado esperado], porque [razão/insight]"
- test_types: Array com tipos de teste. Opções: "Teste A/B", "Teste Multivariado", "Teste de Redirect", "Personalização", "Recomendação"
- tools: Array com ferramentas. Opções: "Adobe Target", "Google Optimize", "VWO", "Optimizely", "Dynamic Yield", "Insider", "Outro"
- insights: Insights detalhados sobre o teste (OBRIGATÓRIO quando status="ready", mínimo 300 caracteres)

## CAMPOS OPCIONAIS (pergunte apenas se relevante)
- target_audience: Público-alvo específico
- tested_elements: Elementos sendo testados
- success_metric: Array de métricas de sucesso
- start_date: Data de início (formato YYYY-MM-DD)
- end_date: Data de término (formato YYYY-MM-DD)

## FLUXO DA CONVERSA
1. Comece com uma pergunta aberta sobre o que o usuário quer testar
2. Infira informações do contexto (não pergunte o óbvio)
3. Pergunte APENAS o que falta dos campos obrigatórios
4. Quando tiver tudo, defina status: "ready"

## PERGUNTAS PROFUNDAS (exemplos)
- "Você considerou que o vermelho pode ter conotações negativas de erro?"
- "Qual é o tamanho da sua amostra para ter significância estatística?"
- "Já validou essa hipótese com dados qualitativos?"
- "E se o resultado for o oposto? Qual seria o próximo passo?"

## CAMPO INSIGHTS (quando status="ready")
O campo insights DEVE conter no mínimo 300 caracteres com:
- Duração recomendada do teste e por quê
- Tamanho de amostra sugerido
- Potenciais problemas e como evitá-los
- Como interpretar resultados ambíguos
- Próximos passos após conclusão

## FORMATO DE RESPOSTA (JSON OBRIGATÓRIO)
Responda SEMPRE em JSON válido:
{
  "message": "Sua mensagem para o usuário",
  "status": "collecting" | "ready",
  "extracted_data": {
    "nome_teste": "string ou null",
    "hypothesis": "string ou null",
    "test_types": ["array"] ou null,
    "tools": ["array"] ou null,
    "insights": "string ou null (OBRIGATÓRIO quando ready)",
    "target_audience": "string ou null",
    "tested_elements": "string ou null",
    "success_metric": ["array"] ou null,
    "start_date": "YYYY-MM-DD ou null",
    "end_date": "YYYY-MM-DD ou null"
  },
  "next_question": "Próxima pergunta ou null se ready"
}

## PERGUNTAS ACESSÍVEIS
- Use linguagem simples, evite jargões técnicos
- Dê exemplos práticos quando perguntar
- Se o usuário parecer confuso, reformule de forma mais simples',
  'Olá! Sou seu assistente para criação de testes A/B. Me conte: o que você gostaria de testar hoje?',
  'Perfeito! Tenho todas as informações necessárias. Clique em "Preencher Formulário" para continuar.',
  '{
    "model": "gpt-4-turbo-preview",
    "temperature": 1.1,
    "max_tokens": 2500,
    "top_p": 0.95,
    "frequency_penalty": 0.3,
    "presence_penalty": 0.2
  }'::jsonb,
  '[
    {"name": "nome_teste", "type": "text", "required": true, "auto_generate": true},
    {"name": "hypothesis", "type": "text", "required": true, "format": "Se [X], então [Y], porque [Z]"},
    {"name": "test_types", "type": "array", "required": true, "options": ["Teste A/B", "Teste Multivariado", "Teste de Redirect", "Personalização", "Recomendação"]},
    {"name": "tools", "type": "array", "required": true, "options": ["Adobe Target", "Google Optimize", "VWO", "Optimizely", "Dynamic Yield", "Insider", "Outro"]},
    {"name": "insights", "type": "text", "required": true, "min_length": 300, "required_when_ready": true},
    {"name": "target_audience", "type": "text", "required": false},
    {"name": "tested_elements", "type": "text", "required": false},
    {"name": "success_metric", "type": "array", "required": false},
    {"name": "start_date", "type": "date", "required": false},
    {"name": "end_date", "type": "date", "required": false}
  ]'::jsonb
);