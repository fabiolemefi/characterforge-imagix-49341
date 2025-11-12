-- Alterar o tipo do campo success_metric de TEXT para TEXT[]
ALTER TABLE tests 
  ALTER COLUMN success_metric TYPE TEXT[] 
  USING CASE 
    WHEN success_metric IS NULL OR success_metric = '' THEN '{}'::TEXT[]
    ELSE ARRAY[success_metric]::TEXT[]
  END;

-- Definir valor padrão como array vazio
ALTER TABLE tests 
  ALTER COLUMN success_metric SET DEFAULT '{}';