-- Create enum for test status
CREATE TYPE test_status AS ENUM ('planejamento', 'execucao', 'analise', 'documentacao');

-- Create tests table
CREATE TABLE public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_teste TEXT NOT NULL,
  hypothesis TEXT NOT NULL,
  test_types TEXT[] NOT NULL DEFAULT '{}',
  tools TEXT[] NOT NULL DEFAULT '{}',
  target_audience TEXT,
  tested_elements TEXT,
  success_metric TEXT,
  start_date DATE,
  end_date DATE,
  status test_status NOT NULL DEFAULT 'planejamento',
  attachments JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER update_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view active tests"
  ON public.tests FOR SELECT
  USING (is_active = true);

CREATE POLICY "Users can create tests"
  ON public.tests FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update tests"
  ON public.tests FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can soft delete tests"
  ON public.tests FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create storage bucket for test attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('test-attachments', 'test-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload test attachments"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'test-attachments' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "Anyone can view test attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'test-attachments');

CREATE POLICY "Users can delete their test attachments"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'test-attachments' AND
    auth.uid() IS NOT NULL
  );