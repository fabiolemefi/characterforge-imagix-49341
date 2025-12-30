-- Adicionar política de SELECT para usuários autenticados
-- que permite ver todos os registros (inclusive inativos)
-- Isso resolve o conflito de RLS durante o UPDATE de is_active

CREATE POLICY "Authenticated users can view all tests"
ON public.tests
FOR SELECT
TO authenticated
USING (true);