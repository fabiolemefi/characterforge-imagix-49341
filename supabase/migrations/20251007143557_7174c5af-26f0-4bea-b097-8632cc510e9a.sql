-- Add DELETE policy for generated_images table
CREATE POLICY "Users can delete generated images"
ON public.generated_images
FOR DELETE
USING (auth.uid() IS NOT NULL);