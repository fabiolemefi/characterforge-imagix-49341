-- Adicionar campo share_code para identificar relatórios públicos
ALTER TABLE tests ADD COLUMN share_code text UNIQUE;

-- Criar índice para buscas rápidas
CREATE INDEX idx_tests_share_code ON tests(share_code);

-- Política RLS para visualização pública (sem autenticação)
CREATE POLICY "Public can view shared tests by code"
  ON tests
  FOR SELECT
  USING (share_code IS NOT NULL);