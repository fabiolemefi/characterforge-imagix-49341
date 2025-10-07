-- Add cover image field to character_images
ALTER TABLE public.character_images
ADD COLUMN is_cover boolean NOT NULL DEFAULT false;

-- Create index for faster queries
CREATE INDEX idx_character_images_cover ON public.character_images(character_id, is_cover) WHERE is_cover = true;

-- Add comment
COMMENT ON COLUMN public.character_images.is_cover IS 'Indicates if this image is the cover image for the character';