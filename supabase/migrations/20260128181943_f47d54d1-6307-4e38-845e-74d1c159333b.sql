-- Remover política atual de SELECT
DROP POLICY IF EXISTS "Users can view their own links" ON public.efi_links;

-- Criar nova política: todos os autenticados podem ver todos os links
CREATE POLICY "Authenticated users can view all links"
  ON public.efi_links
  FOR SELECT
  TO authenticated
  USING (true);