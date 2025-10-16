-- Create enum for block types
CREATE TYPE public.brand_guide_block_type AS ENUM ('single_column', 'two_columns', 'three_columns');

-- Create brand_guide_categories table
CREATE TABLE public.brand_guide_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT 'Book',
  position INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create brand_guide_pages table
CREATE TABLE public.brand_guide_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.brand_guide_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  content JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE(category_id, slug)
);

-- Create brand_guide_blocks table
CREATE TABLE public.brand_guide_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.brand_guide_pages(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.brand_guide_categories(id) ON DELETE CASCADE,
  block_type brand_guide_block_type NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CHECK (
    (page_id IS NOT NULL AND category_id IS NULL) OR 
    (page_id IS NULL AND category_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.brand_guide_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_guide_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_guide_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_guide_categories
CREATE POLICY "Anyone can view active categories"
  ON public.brand_guide_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage categories"
  ON public.brand_guide_categories FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for brand_guide_pages
CREATE POLICY "Anyone can view active pages"
  ON public.brand_guide_pages FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage pages"
  ON public.brand_guide_pages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for brand_guide_blocks
CREATE POLICY "Anyone can view blocks"
  ON public.brand_guide_blocks FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage blocks"
  ON public.brand_guide_blocks FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_brand_guide_categories_updated_at
  BEFORE UPDATE ON public.brand_guide_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_guide_pages_updated_at
  BEFORE UPDATE ON public.brand_guide_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brand_guide_blocks_updated_at
  BEFORE UPDATE ON public.brand_guide_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert storage bucket for brand guide assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-guide-assets', 'brand-guide-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view brand guide assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-guide-assets');

CREATE POLICY "Admins can upload brand guide assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'brand-guide-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update brand guide assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'brand-guide-assets' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete brand guide assets"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'brand-guide-assets' AND has_role(auth.uid(), 'admin'));

-- Seed data: Categories
INSERT INTO public.brand_guide_categories (name, slug, icon, position) VALUES
  ('ID Verbal', 'id-verbal', 'MessageSquare', 1),
  ('ID Visual', 'id-visual', 'Palette', 2),
  ('Layouts', 'layouts', 'Layout', 3);

-- Seed data: Pages for ID Verbal
INSERT INTO public.brand_guide_pages (category_id, name, slug, position)
SELECT id, 'Nosso tom de voz', 'nosso-tom-de-voz', 1 FROM public.brand_guide_categories WHERE slug = 'id-verbal'
UNION ALL
SELECT id, 'Canais', 'canais', 2 FROM public.brand_guide_categories WHERE slug = 'id-verbal'
UNION ALL
SELECT id, 'Lista de palavras', 'lista-de-palavras', 3 FROM public.brand_guide_categories WHERE slug = 'id-verbal'
UNION ALL
SELECT id, 'O básico da Efi', 'o-basico-da-efi', 4 FROM public.brand_guide_categories WHERE slug = 'id-verbal'
UNION ALL
SELECT id, 'Nosso nome', 'nosso-nome', 5 FROM public.brand_guide_categories WHERE slug = 'id-verbal'
UNION ALL
SELECT id, 'Narrativa', 'narrativa', 6 FROM public.brand_guide_categories WHERE slug = 'id-verbal';

-- Seed data: Pages for ID Visual
INSERT INTO public.brand_guide_pages (category_id, name, slug, position)
SELECT id, 'Logo', 'logo', 1 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Efi Bank', 'efi-bank', 2 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Endosso', 'endosso', 3 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Diretrizes do logo e do símbolo', 'diretrizes-logo-simbolo', 4 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Paleta de cores', 'paleta-cores', 5 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Tipografia', 'tipografia', 6 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Estilo de fotografia', 'estilo-fotografia', 7 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Elementos gráficos', 'elementos-graficos', 8 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Estilo iconográfico', 'estilo-iconografico', 9 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Estilo ilustrativo', 'estilo-ilustrativo', 10 FROM public.brand_guide_categories WHERE slug = 'id-visual'
UNION ALL
SELECT id, 'Ritmo nas composições', 'ritmo-composicoes', 11 FROM public.brand_guide_categories WHERE slug = 'id-visual';

-- Seed data: Pages for Layouts
INSERT INTO public.brand_guide_pages (category_id, name, slug, position)
SELECT id, 'Módulos', 'modulos', 1 FROM public.brand_guide_categories WHERE slug = 'layouts'
UNION ALL
SELECT id, 'Margens e colunas', 'margens-colunas', 2 FROM public.brand_guide_categories WHERE slug = 'layouts'
UNION ALL
SELECT id, 'Aplicação dos elementos', 'aplicacao-elementos', 3 FROM public.brand_guide_categories WHERE slug = 'layouts'
UNION ALL
SELECT id, 'Composição final', 'composicao-final', 4 FROM public.brand_guide_categories WHERE slug = 'layouts';