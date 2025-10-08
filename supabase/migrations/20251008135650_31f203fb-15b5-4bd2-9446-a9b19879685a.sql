-- Add UPDATE policy for generated_images table
CREATE POLICY "Anyone can update generated images"
ON public.generated_images
FOR UPDATE
USING (true)
WITH CHECK (true);