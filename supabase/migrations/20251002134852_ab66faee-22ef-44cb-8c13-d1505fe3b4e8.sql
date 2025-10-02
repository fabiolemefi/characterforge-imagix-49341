-- Add credits field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN credits integer NOT NULL DEFAULT 0;

-- Create storage bucket for plugin images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('plugin-images', 'plugin-images', true);

-- Create RLS policies for plugin images storage
CREATE POLICY "Anyone can view plugin images"
ON storage.objects FOR SELECT
USING (bucket_id = 'plugin-images');

CREATE POLICY "Admins can upload plugin images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update plugin images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete plugin images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);