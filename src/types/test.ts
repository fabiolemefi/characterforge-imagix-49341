export type TestStatus = 'planejamento' | 'execucao' | 'analise' | 'documentacao';

export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
  uploaded_at: string;
}

export interface Link {
  title: string;
  url: string;
  added_at: string;
}

export interface TestImage {
  url: string;
  caption: string;
  uploaded_at: string;
}

export interface Test {
  id: string;
  nome_teste: string;
  hypothesis: string;
  insights?: string;
  test_types: string[];
  tools: string[];
  target_audience?: string;
  tested_elements?: string;
  success_metric?: string[];
  start_date?: string;
  end_date?: string;
  status: TestStatus;
  attachments: Attachment[];
  links: Link[];
  test_images: TestImage[];
  is_active: boolean;
  created_by: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
  share_code?: string;
}

export interface TestFormData {
  nome_teste: string;
  hypothesis: string;
  test_types: string[];
  tools: string[];
  target_audience?: string;
  tested_elements?: string;
  success_metric?: string[];
  start_date?: Date | null;
  end_date?: Date | null;
  attachments: Attachment[];
  links: Link[];
  test_images: TestImage[];
}
