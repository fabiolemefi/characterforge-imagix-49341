-- Create storage bucket for slide images
INSERT INTO storage.buckets (id, name, public)
VALUES ('slides-images', 'slides-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Users can upload slide images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'slides-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to slide images
CREATE POLICY "Public can view slide images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'slides-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their slide images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'slides-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add images_data column to slide_generations table
ALTER TABLE public.slide_generations
ADD COLUMN IF NOT EXISTS images_data JSONB DEFAULT '{}'::jsonb;