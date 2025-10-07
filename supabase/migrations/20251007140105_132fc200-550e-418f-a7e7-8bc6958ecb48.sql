-- Add general_prompt field to plugins table
ALTER TABLE public.plugins
ADD COLUMN general_prompt text DEFAULT '';

-- Update the efimagem plugin to have a default general prompt
UPDATE public.plugins
SET general_prompt = 'Create a high-quality, professional image of'
WHERE name = 'Efimagem';