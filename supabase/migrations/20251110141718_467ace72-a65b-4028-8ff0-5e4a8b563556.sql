-- Atualizar políticas RLS para permitir que QUALQUER usuário autenticado crie arquivos compartilhados

-- Remover TODAS as políticas antigas primeiro
DROP POLICY IF EXISTS "Admins can view all files" ON public.shared_files;
DROP POLICY IF EXISTS "Users can view their own files" ON public.shared_files;
DROP POLICY IF EXISTS "Public can view valid shared files" ON public.shared_files;
DROP POLICY IF EXISTS "Admins can create files" ON public.shared_files;
DROP POLICY IF EXISTS "Users can create their own files" ON public.shared_files;
DROP POLICY IF EXISTS "Admins can update files" ON public.shared_files;
DROP POLICY IF EXISTS "Users can update their own files" ON public.shared_files;
DROP POLICY IF EXISTS "Admins can delete files" ON public.shared_files;
DROP POLICY IF EXISTS "Users can delete their own files" ON public.shared_files;

-- Criar novas políticas para usuários autenticados
CREATE POLICY "Users can view own files"
  ON public.shared_files FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view valid links"
  ON public.shared_files FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Users can create files"
  ON public.shared_files FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files"
  ON public.shared_files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files"
  ON public.shared_files FOR DELETE
  USING (auth.uid() = user_id);

-- Atualizar políticas do bucket storage
DROP POLICY IF EXISTS "Admins can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
DROP POLICY IF EXISTS "Public can download validated files" ON storage.objects;

CREATE POLICY "Authenticated users can upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-downloads' 
    AND auth.uid() = owner
  );

CREATE POLICY "Users can delete own uploads"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media-downloads' 
    AND auth.uid() = owner
  );

CREATE POLICY "Public download access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-downloads');