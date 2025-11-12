-- Adicionar coluna prediction_id para rastrear requisições assíncronas do Replicate
ALTER TABLE public.test_ai_conversations
ADD COLUMN prediction_id text;

-- Habilitar realtime para a tabela test_ai_conversations
ALTER PUBLICATION supabase_realtime ADD TABLE public.test_ai_conversations;