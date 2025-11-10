-- Remover TODAS as políticas antigas primeiro
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'shared_files' AND schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.shared_files';
    END LOOP;
END $$;

-- Criar novas políticas para usuários autenticados
CREATE POLICY "Users can view their own files"
  ON public.shared_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view valid shared files"
  ON public.shared_files FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Users can create their own files"
  ON public.shared_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
  ON public.shared_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
  ON public.shared_files FOR DELETE
  USING (auth.uid() = user_id);

-- Atualizar políticas do bucket storage
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage') LOOP
        IF r.policyname LIKE '%media-downloads%' OR r.policyname LIKE '%Admins can%' OR r.policyname LIKE '%Users can%' THEN
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
        END IF;
    END LOOP;
END $$;

CREATE POLICY "Users can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-downloads' 
    AND auth.uid() = owner
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media-downloads' 
    AND auth.uid() = owner
  );