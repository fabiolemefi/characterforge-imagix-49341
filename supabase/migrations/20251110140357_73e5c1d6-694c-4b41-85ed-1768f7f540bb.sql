-- Criar tabela para arquivos compartilhados
CREATE TABLE public.shared_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  share_code TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_shared_files_share_code ON public.shared_files(share_code);
CREATE INDEX idx_shared_files_user_id ON public.shared_files(user_id);
CREATE INDEX idx_shared_files_expires_at ON public.shared_files(expires_at);

-- Trigger para updated_at
CREATE TRIGGER update_shared_files_updated_at
  BEFORE UPDATE ON public.shared_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.shared_files ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para shared_files
CREATE POLICY "Admins can view all files"
  ON public.shared_files FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view valid shared files"
  ON public.shared_files FOR SELECT
  USING (
    is_active = true 
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "Admins can create files"
  ON public.shared_files FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update files"
  ON public.shared_files FOR UPDATE
  USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

CREATE POLICY "Admins can delete files"
  ON public.shared_files FOR DELETE
  USING (has_role(auth.uid(), 'admin') AND auth.uid() = user_id);

-- Criar bucket para downloads
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media-downloads', 'media-downloads', false, 1073741824);

-- Políticas RLS para o bucket
CREATE POLICY "Admins can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'media-downloads' 
    AND has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'media-downloads' 
    AND has_role(auth.uid(), 'admin')
    AND auth.uid() = owner
  );

CREATE POLICY "Public can download validated files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media-downloads');