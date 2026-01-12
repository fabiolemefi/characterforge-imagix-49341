-- Adicionar campos à tabela generated_images para suportar EfiSelo
ALTER TABLE generated_images 
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'efimagem',
  ADD COLUMN IF NOT EXISTS seal_type TEXT;