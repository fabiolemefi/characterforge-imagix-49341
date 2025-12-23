-- Criar tabela para armazenar links gerados pelo Efi Link
CREATE TABLE public.efi_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Padrão do link
  link_pattern TEXT NOT NULL DEFAULT 'onelink', -- 'onelink' ou 'sejaefi'
  
  -- URL de destino
  url_destino TEXT NOT NULL,
  
  -- Campos de deeplink (apenas para padrão sejaefi)
  deeplink TEXT,
  deeplink_param TEXT,
  
  -- Parâmetros UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  
  -- Parâmetros AppsFlyer (espelhados dos UTM)
  pid TEXT,
  af_channel TEXT,
  c TEXT,
  af_adset TEXT,
  af_ad TEXT,
  
  -- URLs geradas
  original_url TEXT,
  shortened_url TEXT,
  shortened_code TEXT,
  
  -- Metadados
  name TEXT, -- Nome opcional para identificar o link
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.efi_links ENABLE ROW LEVEL SECURITY;

-- Policies: usuários podem gerenciar seus próprios links
CREATE POLICY "Users can view their own links"
  ON public.efi_links
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own links"
  ON public.efi_links
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON public.efi_links
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON public.efi_links
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_efi_links_updated_at
  BEFORE UPDATE ON public.efi_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();