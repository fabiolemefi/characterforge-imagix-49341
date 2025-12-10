-- Add retry_count column to track automatic retry attempts
ALTER TABLE public.generated_images 
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0;