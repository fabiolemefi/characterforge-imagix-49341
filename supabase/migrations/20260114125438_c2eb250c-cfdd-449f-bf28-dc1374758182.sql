-- Create efi_code_sites table for page builder
CREATE TABLE public.efi_code_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE,
  content JSONB DEFAULT '{}'::jsonb,
  html_content TEXT,
  css_content TEXT,
  thumbnail_url TEXT,
  is_published BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.efi_code_sites ENABLE ROW LEVEL SECURITY;

-- Users can view their own sites
CREATE POLICY "Users can view own sites" ON public.efi_code_sites
  FOR SELECT USING (auth.uid() = created_by);

-- Users can create their own sites
CREATE POLICY "Users can create own sites" ON public.efi_code_sites
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Users can update their own sites
CREATE POLICY "Users can update own sites" ON public.efi_code_sites
  FOR UPDATE USING (auth.uid() = created_by);

-- Users can delete their own sites
CREATE POLICY "Users can delete own sites" ON public.efi_code_sites
  FOR DELETE USING (auth.uid() = created_by);

-- Admins can manage all sites
CREATE POLICY "Admins can view all sites" ON public.efi_code_sites
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all sites" ON public.efi_code_sites
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete all sites" ON public.efi_code_sites
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view published sites
CREATE POLICY "Anyone can view published sites" ON public.efi_code_sites
  FOR SELECT USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_efi_code_sites_updated_at
  BEFORE UPDATE ON public.efi_code_sites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();