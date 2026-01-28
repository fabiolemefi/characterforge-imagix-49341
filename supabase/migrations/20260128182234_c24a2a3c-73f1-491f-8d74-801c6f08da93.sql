-- Remover políticas atuais de UPDATE e DELETE
DROP POLICY IF EXISTS "Users can update their own links" ON public.efi_links;
DROP POLICY IF EXISTS "Users can delete their own links" ON public.efi_links;

-- Criar novas políticas: todos os autenticados podem editar e excluir qualquer link
CREATE POLICY "Authenticated users can update all links"
  ON public.efi_links
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all links"
  ON public.efi_links
  FOR DELETE
  TO authenticated
  USING (true);