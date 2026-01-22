-- Tabela de categorias de imagens
CREATE TABLE public.efi_image_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Tabela de imagens da biblioteca
CREATE TABLE public.efi_library_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES public.efi_image_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  alt_text TEXT,
  tags TEXT[] DEFAULT '{}',
  position INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.efi_image_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.efi_library_images ENABLE ROW LEVEL SECURITY;

-- Políticas para categorias
CREATE POLICY "Admins can manage image categories"
ON public.efi_image_categories
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Anyone can view active image categories"
ON public.efi_image_categories
FOR SELECT
USING (is_active = true);

-- Políticas para imagens
CREATE POLICY "Admins can manage library images"
ON public.efi_library_images
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Anyone can view active library images"
ON public.efi_library_images
FOR SELECT
USING (is_active = true);

-- Triggers para updated_at
CREATE TRIGGER update_efi_image_categories_updated_at
BEFORE UPDATE ON public.efi_image_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_efi_library_images_updated_at
BEFORE UPDATE ON public.efi_library_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_efi_library_images_category ON public.efi_library_images(category_id);
CREATE INDEX idx_efi_library_images_tags ON public.efi_library_images USING GIN(tags);