-- Criar bucket público para uploads do EfiSelo
INSERT INTO storage.buckets (id, name, public) 
VALUES ('efi-selo', 'efi-selo', true)
ON CONFLICT (id) DO NOTHING;

-- Policy de leitura pública
CREATE POLICY "efi_selo_public_read" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'efi-selo');

-- Policy de upload público (sem autenticação)
CREATE POLICY "efi_selo_public_insert" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'efi-selo');