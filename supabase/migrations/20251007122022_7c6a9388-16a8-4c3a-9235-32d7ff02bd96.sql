-- Create plugin_characters table
CREATE TABLE public.plugin_characters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plugin_id UUID NOT NULL REFERENCES public.plugins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create character_images table
CREATE TABLE public.character_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  character_id UUID NOT NULL REFERENCES public.plugin_characters(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plugin_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_images ENABLE ROW LEVEL SECURITY;

-- RLS policies for plugin_characters
CREATE POLICY "Admins can manage characters"
  ON public.plugin_characters
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view characters"
  ON public.plugin_characters
  FOR SELECT
  USING (true);

-- RLS policies for character_images
CREATE POLICY "Admins can manage character images"
  ON public.character_images
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view character images"
  ON public.character_images
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_plugin_characters_updated_at
  BEFORE UPDATE ON public.plugin_characters
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_plugin_characters_plugin_id ON public.plugin_characters(plugin_id);
CREATE INDEX idx_character_images_character_id ON public.character_images(character_id);