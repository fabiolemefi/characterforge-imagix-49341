
-- Remover constraint antiga
ALTER TABLE test_ai_conversations DROP CONSTRAINT test_ai_conversations_status_check;

-- Adicionar constraint atualizada incluindo 'ready'
ALTER TABLE test_ai_conversations ADD CONSTRAINT test_ai_conversations_status_check 
  CHECK (status IN ('draft', 'ready', 'completed', 'abandoned'));
