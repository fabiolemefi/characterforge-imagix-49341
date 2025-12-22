-- Criar tabela email_datasets para armazenar conteúdos de emails
CREATE TABLE public.email_datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Dataset Principal',
  content TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.email_datasets ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados
CREATE POLICY "Authenticated users can view datasets"
  ON public.email_datasets
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create datasets"
  ON public.email_datasets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update datasets"
  ON public.email_datasets
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete datasets"
  ON public.email_datasets
  FOR DELETE
  TO authenticated
  USING (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_email_datasets_updated_at
  BEFORE UPDATE ON public.email_datasets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();