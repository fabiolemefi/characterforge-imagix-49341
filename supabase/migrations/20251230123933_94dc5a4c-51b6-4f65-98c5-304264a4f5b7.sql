-- Remover políticas duplicadas de UPDATE
DROP POLICY IF EXISTS "Users can soft delete tests" ON public.tests;
DROP POLICY IF EXISTS "Users can update tests" ON public.tests;

-- Criar política única de UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update tests"
ON public.tests
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);