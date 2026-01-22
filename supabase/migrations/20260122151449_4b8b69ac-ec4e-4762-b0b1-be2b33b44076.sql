-- Create table for library icons (SVG files)
CREATE TABLE public.efi_library_icons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  filename TEXT NOT NULL,
  group_prefix TEXT NOT NULL DEFAULT 'geral',
  url TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Add unique constraint on filename to prevent duplicates
ALTER TABLE public.efi_library_icons ADD CONSTRAINT efi_library_icons_filename_unique UNIQUE (filename);

-- Enable Row Level Security
ALTER TABLE public.efi_library_icons ENABLE ROW LEVEL SECURITY;

-- Create policies for admin management
CREATE POLICY "Admins can manage library icons"
ON public.efi_library_icons FOR ALL
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true))
WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true));

-- Create policy for public viewing of active icons
CREATE POLICY "Anyone can view active library icons"
ON public.efi_library_icons FOR SELECT
USING (is_active = true);

-- Create index for faster group filtering
CREATE INDEX idx_efi_library_icons_group_prefix ON public.efi_library_icons(group_prefix);
CREATE INDEX idx_efi_library_icons_filename ON public.efi_library_icons(filename);