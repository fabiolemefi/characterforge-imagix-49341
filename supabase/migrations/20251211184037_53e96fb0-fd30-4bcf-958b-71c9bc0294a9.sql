-- Create enum for briefing status
CREATE TYPE public.briefing_status AS ENUM ('rascunho', 'em_revisao', 'aprovado', 'concluido');

-- Create briefings table
CREATE TABLE public.briefings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  status briefing_status NOT NULL DEFAULT 'rascunho',
  
  -- Campos obrigatórios do assistente
  objetivo_final TEXT NOT NULL,
  acao_desejada TEXT NOT NULL,
  tela_destino TEXT NOT NULL,
  motivo_demanda TEXT NOT NULL,
  conexao_com_estrategia TEXT NOT NULL,
  metrica_de_negocio TEXT NOT NULL,
  desafios_comerciais TEXT NOT NULL,
  prioridade_urgencia TEXT NOT NULL,
  tipo_usuario TEXT NOT NULL,
  publico TEXT NOT NULL,
  modalidade_conta TEXT NOT NULL,
  base_manual_ou_automatica TEXT NOT NULL,
  
  -- Campos opcionais
  volume_estimado TEXT,
  dados_relevantes TEXT,
  oferta_incentivo TEXT,
  condicoes_especiais TEXT,
  validade_datas TEXT,
  perfil TEXT,
  dores TEXT,
  desafios TEXT,
  comportamento TEXT,
  etapa_jornada TEXT,
  conexao_com_outras_acoes TEXT,
  contexto_produto TEXT,
  links_figma TEXT,
  
  -- Campos extras
  attachments JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view active briefings"
ON public.briefings
FOR SELECT
USING (is_active = true);

CREATE POLICY "Users can create briefings"
ON public.briefings
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update briefings"
ON public.briefings
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_briefings_updated_at
BEFORE UPDATE ON public.briefings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();