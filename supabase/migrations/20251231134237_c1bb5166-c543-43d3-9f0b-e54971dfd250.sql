-- Create table to track PDF extractions
CREATE TABLE public.pdf_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  pdf_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_markdown TEXT,
  cleaned_markdown TEXT,
  marker_prediction_id TEXT,
  gemini_prediction_id TEXT,
  error_message TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pdf_extractions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own extractions" ON public.pdf_extractions
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can create their own extractions" ON public.pdf_extractions
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can update extractions" ON public.pdf_extractions
  FOR UPDATE USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_pdf_extractions_updated_at
  BEFORE UPDATE ON public.pdf_extractions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();