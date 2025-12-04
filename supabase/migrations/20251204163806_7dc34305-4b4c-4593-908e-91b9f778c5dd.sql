-- Add new columns for slide generation configuration
ALTER TABLE slide_generations 
ADD COLUMN IF NOT EXISTS dimensions TEXT DEFAULT 'fluid',
ADD COLUMN IF NOT EXISTS export_as TEXT,
ADD COLUMN IF NOT EXISTS header_footer JSONB DEFAULT '{}'::jsonb;