-- Add test_images column for storing images with captions
ALTER TABLE tests ADD COLUMN IF NOT EXISTS test_images jsonb DEFAULT '[]'::jsonb;