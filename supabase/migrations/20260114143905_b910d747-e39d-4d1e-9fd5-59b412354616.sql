-- Criar bucket para assets do Efi Code
INSERT INTO storage.buckets (id, name, public)
VALUES ('efi-code-assets', 'efi-code-assets', true)
ON CONFLICT DO NOTHING;

-- Policy para usuários autenticados fazerem upload
CREATE POLICY "Authenticated users can upload efi-code assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'efi-code-assets');

-- Policy para visualização pública
CREATE POLICY "Anyone can view efi-code assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'efi-code-assets');

-- Policy para usuários autenticados deletarem
CREATE POLICY "Users can delete own efi-code assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'efi-code-assets');