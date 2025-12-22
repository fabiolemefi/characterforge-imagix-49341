-- Create efi_report_config table for admin configuration
CREATE TABLE public.efi_report_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_prompt TEXT NOT NULL DEFAULT 'Analise os dados abaixo e formate-os de forma clara para um infográfico. Adicione insights e análises que ajudem diretores e pessoas não-técnicas a entender se os números são bons ou ruins. Seja objetivo e destaque os pontos principais.',
  design_prompt TEXT NOT NULL DEFAULT 'Crie uma imagem de infografico para demonstrar esses dados abaixo. Ele deve utilizar as cores definidas e NUNCA escreve-las no design. Utilize negrito nos textos para reforçar infos ou dados importantes. Utilize no header o logo na esquerda (não altere o logo em anexo, mantenha ele exatamente como é) e o titulo na direita (faça o titulo caber sem quebra de linha com a cor #1d1d1d). Use a fonte Red Hat.',
  logo_url TEXT DEFAULT 'https://replicate.delivery/pbxt/OHJbCODJ07JTsXbAhr10gX6xEdLGuFoWx9z1JlVOKAwK6Ecr/logo-efi-1024.png',
  aspect_ratio TEXT DEFAULT '3:4',
  resolution TEXT DEFAULT '2K',
  colors JSONB DEFAULT '["#f37021", "#00809d", "#f83a36", "#57a73b", "#f39c12", "#f6f8fc", "#e8f0f8", "#a4acbc", "#1d1d1d"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.efi_report_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view efi report config"
ON public.efi_report_config
FOR SELECT
USING (true);

-- Admins can manage config
CREATE POLICY "Admins can manage efi report config"
ON public.efi_report_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_efi_report_config_updated_at
BEFORE UPDATE ON public.efi_report_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config
INSERT INTO public.efi_report_config (id) VALUES (gen_random_uuid());