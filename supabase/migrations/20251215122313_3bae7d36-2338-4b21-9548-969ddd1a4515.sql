
-- Create brand_kit table (single shared kit)
CREATE TABLE public.brand_kit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Kit de Marca',
  typography jsonb NOT NULL DEFAULT '{
    "title": {"fontFamily": "Inter", "fontSize": 48, "fontWeight": "700", "color": "#1A1A1A"},
    "subtitle": {"fontFamily": "Inter", "fontSize": 24, "fontWeight": "600", "color": "#333333"},
    "body": {"fontFamily": "Inter", "fontSize": 16, "fontWeight": "400", "color": "#666666"}
  }'::jsonb,
  color_palette jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create brand_kit_folders table
CREATE TABLE public.brand_kit_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid REFERENCES public.brand_kit(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.brand_kit_folders(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create brand_kit_assets table
CREATE TABLE public.brand_kit_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_kit_id uuid REFERENCES public.brand_kit(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES public.brand_kit_folders(id) ON DELETE SET NULL,
  name text NOT NULL,
  file_url text NOT NULL,
  file_type text NOT NULL,
  thumbnail_url text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_kit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_kit_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_kit
CREATE POLICY "Anyone can view brand kit"
ON public.brand_kit FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage brand kit"
ON public.brand_kit FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for brand_kit_folders
CREATE POLICY "Anyone can view folders"
ON public.brand_kit_folders FOR SELECT
USING (true);

CREATE POLICY "Admins can manage folders"
ON public.brand_kit_folders FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for brand_kit_assets
CREATE POLICY "Anyone can view assets"
ON public.brand_kit_assets FOR SELECT
USING (true);

CREATE POLICY "Admins can manage assets"
ON public.brand_kit_assets FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-kit-assets', 'brand-kit-assets', true);

-- Storage policies
CREATE POLICY "Anyone can view brand kit assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-kit-assets');

CREATE POLICY "Admins can upload brand kit assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-kit-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update brand kit assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-kit-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete brand kit assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-kit-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default brand kit
INSERT INTO public.brand_kit (name) VALUES ('Kit de Marca Principal');

-- Create trigger for updated_at
CREATE TRIGGER update_brand_kit_updated_at
BEFORE UPDATE ON public.brand_kit
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
