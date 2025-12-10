-- Create canva_blocks table
CREATE TABLE public.canva_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  block_type TEXT NOT NULL,
  html_content TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add constraint for block_type validation (expandable in future)
ALTER TABLE public.canva_blocks 
ADD CONSTRAINT canva_blocks_type_check 
CHECK (block_type IN ('header', 'hero', 'conteudo', 'titulo', 'assinatura', 'footer'));

-- Enable RLS
ALTER TABLE public.canva_blocks ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can view blocks
CREATE POLICY "Authenticated users can view blocks"
ON public.canva_blocks
FOR SELECT
TO authenticated
USING (true);

-- Any authenticated user can create blocks
CREATE POLICY "Authenticated users can create blocks"
ON public.canva_blocks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Users can update blocks
CREATE POLICY "Authenticated users can update blocks"
ON public.canva_blocks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Users can delete blocks
CREATE POLICY "Authenticated users can delete blocks"
ON public.canva_blocks
FOR DELETE
TO authenticated
USING (true);

-- Public can view active blocks (for API)
CREATE POLICY "Public can view active blocks"
ON public.canva_blocks
FOR SELECT
TO anon
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_canva_blocks_updated_at
BEFORE UPDATE ON public.canva_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for thumbnails
INSERT INTO storage.buckets (id, name, public) 
VALUES ('canva-blocks', 'canva-blocks', true);

-- Storage policies for canva-blocks bucket
CREATE POLICY "Anyone can view canva-blocks images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'canva-blocks');

CREATE POLICY "Authenticated users can upload canva-blocks images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'canva-blocks');

CREATE POLICY "Authenticated users can update canva-blocks images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'canva-blocks');

CREATE POLICY "Authenticated users can delete canva-blocks images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'canva-blocks');