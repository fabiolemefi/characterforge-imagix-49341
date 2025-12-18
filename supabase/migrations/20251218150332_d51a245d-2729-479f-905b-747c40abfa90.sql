-- Create email_magic_config table
CREATE TABLE public.email_magic_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_images TEXT[] DEFAULT '{}',
  system_instruction TEXT NOT NULL DEFAULT '',
  top_p DECIMAL DEFAULT 0.95,
  temperature DECIMAL DEFAULT 1.5,
  thinking_level TEXT DEFAULT 'high',
  max_output_tokens INTEGER DEFAULT 65535,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_magic_config ENABLE ROW LEVEL SECURITY;

-- Anyone can view config
CREATE POLICY "Anyone can view email magic config"
ON public.email_magic_config
FOR SELECT
USING (true);

-- Only admins can manage config
CREATE POLICY "Admins can manage email magic config"
ON public.email_magic_config
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_email_magic_config_updated_at
BEFORE UPDATE ON public.email_magic_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default config row
INSERT INTO public.email_magic_config (system_instruction)
VALUES ('Atue como um Desenvolvedor Front-end Sênior especializado em CRM. Transforme o briefing de conteúdo em código HTML puro, sem incluir qualquer texto explicativo, notas de desenvolvedor, introduções ou tags de bloco de código (markdown) antes ou depois. O retorno deve ser estritamente o código, começando em <!DOCTYPE html> e terminando em </html>.');

-- Create storage bucket for email magic images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('email-magic-images', 'email-magic-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view email magic images"
ON storage.objects FOR SELECT
USING (bucket_id = 'email-magic-images');

CREATE POLICY "Admins can upload email magic images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'email-magic-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete email magic images"
ON storage.objects FOR DELETE
USING (bucket_id = 'email-magic-images' AND has_role(auth.uid(), 'admin'::app_role));