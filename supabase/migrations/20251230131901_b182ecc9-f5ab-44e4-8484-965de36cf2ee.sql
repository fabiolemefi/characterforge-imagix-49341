-- Remover política de UPDATE problemática (aplicada ao role public)
DROP POLICY IF EXISTS "Users can update briefings " ON public.briefings;

-- Criar política de UPDATE para usuários autenticados
CREATE POLICY "Authenticated users can update briefings"
ON public.briefings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Criar política de SELECT para usuários autenticados
-- (permite ver todos os registros, inclusive inativos, para o UPDATE funcionar)
CREATE POLICY "Authenticated users can view all briefings"
ON public.briefings
FOR SELECT
TO authenticated
USING (true);