-- Add ai_instructions column to email_blocks table
ALTER TABLE email_blocks 
ADD COLUMN ai_instructions TEXT;

COMMENT ON COLUMN email_blocks.ai_instructions IS 
'Instruções para a IA sobre quando e como usar este bloco, incluindo campos esperados no content';