-- Add new columns for separating data formatting from recommendations
ALTER TABLE public.efi_report_config
ADD COLUMN IF NOT EXISTS data_formatting_prompt text NOT NULL DEFAULT 'Formate os dados abaixo de forma clara e objetiva para um infográfico visual. Organize as informações em seções lógicas, destacando números e métricas importantes. NÃO inclua análises, insights ou recomendações - apenas os dados formatados.';

ALTER TABLE public.efi_report_config
ADD COLUMN IF NOT EXISTS recommendations_prompt text NOT NULL DEFAULT 'Com base nos dados abaixo, gere recomendações estratégicas e insights acionáveis. Analise se os números são bons ou ruins, identifique tendências e sugira ações práticas. Formate em markdown com bullets e destaque os pontos principais. Seja objetivo e focado em valor para tomada de decisão.';