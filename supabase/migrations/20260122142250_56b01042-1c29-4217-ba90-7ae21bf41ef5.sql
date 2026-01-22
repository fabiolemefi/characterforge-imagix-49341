-- Permitir leitura pública de todos os sites para a prévia
-- (A política existente "Anyone can view published sites" só funciona para is_published = true)
CREATE POLICY "Public can view all sites for preview" 
ON public.efi_code_sites 
FOR SELECT 
USING (true);