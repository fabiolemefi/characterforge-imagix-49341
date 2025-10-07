-- Create table for generated images
CREATE TABLE public.generated_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id uuid REFERENCES public.plugin_characters(id) ON DELETE CASCADE,
  character_name text NOT NULL,
  prompt text NOT NULL,
  image_url text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view generated images
CREATE POLICY "Anyone can view generated images"
ON public.generated_images
FOR SELECT
USING (true);

-- Allow anyone to insert generated images
CREATE POLICY "Anyone can insert generated images"
ON public.generated_images
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete generated images
CREATE POLICY "Anyone can delete generated images"
ON public.generated_images
FOR DELETE
USING (true);

-- Create index for faster queries
CREATE INDEX idx_generated_images_created_at ON public.generated_images(created_at DESC);