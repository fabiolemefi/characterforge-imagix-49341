-- Create efi_code_blocks table
CREATE TABLE public.efi_code_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'layout',
  icon_name TEXT NOT NULL DEFAULT 'SquareDashed',
  component_type TEXT NOT NULL,
  default_props JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.efi_code_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view active blocks
CREATE POLICY "Anyone can view active blocks"
ON public.efi_code_blocks
FOR SELECT
USING (is_active = true);

-- Policy: Admins can manage all blocks
CREATE POLICY "Admins can manage blocks"
ON public.efi_code_blocks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_efi_code_blocks_updated_at
BEFORE UPDATE ON public.efi_code_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial blocks
INSERT INTO public.efi_code_blocks (name, description, category, icon_name, component_type, position, is_active) VALUES
('Container', 'Container para agrupar elementos', 'layout', 'SquareDashed', 'Container', 1, true),
('Título', 'Título com diferentes tamanhos', 'texto', 'Heading', 'Heading', 2, true),
('Texto', 'Parágrafo de texto', 'texto', 'Type', 'Text', 3, true),
('Botão', 'Botão clicável com link', 'interativo', 'MousePointerClick', 'Button', 4, true),
('Imagem', 'Imagem com URL ou upload', 'midia', 'ImageIcon', 'Image', 5, true),
('Separador', 'Linha horizontal divisória', 'layout', 'Minus', 'Divider', 6, true),
('Espaçador', 'Espaço vertical ajustável', 'layout', 'MoveVertical', 'Spacer', 7, true);