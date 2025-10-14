-- Add is_active and position columns to plugin_characters table
ALTER TABLE public.plugin_characters 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;

-- Create an index on position for better sorting performance
CREATE INDEX IF NOT EXISTS idx_plugin_characters_position ON public.plugin_characters(position);

-- Create an index on is_active for better filtering performance
CREATE INDEX IF NOT EXISTS idx_plugin_characters_is_active ON public.plugin_characters(is_active);