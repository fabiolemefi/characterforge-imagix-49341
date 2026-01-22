-- Create efi_code_config table for global CSS
CREATE TABLE public.efi_code_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  global_css TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Insert initial record
INSERT INTO public.efi_code_config (global_css) VALUES ('');

-- Enable RLS
ALTER TABLE public.efi_code_config ENABLE ROW LEVEL SECURITY;

-- Policy: admins can manage config
CREATE POLICY "Admins can manage efi_code_config"
  ON public.efi_code_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Policy: anyone can view (needed for export)
CREATE POLICY "Anyone can view efi_code_config"
  ON public.efi_code_config
  FOR SELECT
  USING (true);