-- Add general_prompt column to plugin_characters table
ALTER TABLE public.plugin_characters
ADD COLUMN general_prompt TEXT DEFAULT '';
