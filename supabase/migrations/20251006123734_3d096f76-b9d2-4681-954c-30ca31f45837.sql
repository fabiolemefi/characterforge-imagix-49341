-- Create email_blocks table for block library
CREATE TABLE public.email_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'header', 'hero', 'text', 'image', 'list', 'footer', etc
  html_template TEXT NOT NULL,
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  preview_text TEXT,
  html_content TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_template_blocks junction table
CREATE TABLE public.email_template_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES public.email_blocks(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  custom_data JSONB, -- for block-specific customizations
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_template_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_blocks
CREATE POLICY "Anyone can view active blocks"
  ON public.email_blocks FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage blocks"
  ON public.email_blocks FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for email_templates
CREATE POLICY "Users can view their own templates"
  ON public.email_templates FOR SELECT
  USING (auth.uid() = created_by OR is_published = true);

CREATE POLICY "Users can create templates"
  ON public.email_templates FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
  ON public.email_templates FOR UPDATE
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete templates"
  ON public.email_templates FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for email_template_blocks
CREATE POLICY "Users can view template blocks"
  ON public.email_template_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_templates
      WHERE id = template_id
      AND (created_by = auth.uid() OR is_published = true)
    )
  );

CREATE POLICY "Users can manage their template blocks"
  ON public.email_template_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.email_templates
      WHERE id = template_id
      AND (created_by = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_email_blocks_updated_at
  BEFORE UPDATE ON public.email_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert Email Builder plugin
INSERT INTO public.plugins (name, description, image_url, is_active, is_new)
VALUES (
  'Email Builder',
  'Crie e personalize emails profissionais com nosso editor visual de arrastar e soltar',
  'https://images.unsplash.com/photo-1557838923-2985c318be48?w=400',
  true,
  true
);

-- Insert default email blocks
INSERT INTO public.email_blocks (name, description, category, html_template) VALUES
(
  'Header Simples',
  'Cabeçalho básico com logo',
  'header',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;"><tr><td align="center" style="padding: 20px;"><img src="https://via.placeholder.com/150x50" alt="Logo" style="max-width: 150px; height: auto;"></td></tr></table>'
),
(
  'Hero com Imagem',
  'Banner principal com imagem e texto',
  'hero',
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color: #007bff; padding: 40px 20px; text-align: center;"><h1 style="color: #ffffff; font-size: 32px; margin: 0 0 10px 0;">Título Principal</h1><p style="color: #ffffff; font-size: 16px; margin: 0;">Subtítulo ou descrição curta</p></td></tr></table>'
),
(
  'Texto com Imagem',
  'Bloco com texto ao lado de imagem',
  'text',
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 20px;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td width="50%" style="padding-right: 10px;"><img src="https://via.placeholder.com/300x200" alt="" style="width: 100%; height: auto;"></td><td width="50%" style="padding-left: 10px; vertical-align: top;"><h2 style="margin: 0 0 10px 0;">Título</h2><p style="margin: 0; line-height: 1.5;">Seu texto aqui. Descreva seu produto ou serviço.</p></td></tr></table></td></tr></table>'
),
(
  'Lista de Recursos',
  'Lista com ícones e descrições',
  'list',
  '<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding: 20px;"><h2 style="margin: 0 0 20px 0;">Recursos</h2><table width="100%" cellpadding="10" cellspacing="0"><tr><td style="padding: 10px 0;">✓ Recurso 1</td></tr><tr><td style="padding: 10px 0;">✓ Recurso 2</td></tr><tr><td style="padding: 10px 0;">✓ Recurso 3</td></tr></table></td></tr></table>'
),
(
  'Footer Social',
  'Rodapé com redes sociais',
  'footer',
  '<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;"><tr><td align="center" style="padding: 20px;"><p style="margin: 0 0 10px 0; font-size: 12px; color: #6c757d;">© 2025 Sua Empresa. Todos os direitos reservados.</p><p style="margin: 0; font-size: 12px;"><a href="#" style="color: #007bff; text-decoration: none; margin: 0 5px;">Facebook</a> | <a href="#" style="color: #007bff; text-decoration: none; margin: 0 5px;">Instagram</a> | <a href="#" style="color: #007bff; text-decoration: none; margin: 0 5px;">Twitter</a></p></td></tr></table>'
);