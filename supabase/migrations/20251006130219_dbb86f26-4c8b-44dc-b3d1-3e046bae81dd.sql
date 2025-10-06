-- Add blocks_data column to store selected blocks configuration
ALTER TABLE email_templates 
ADD COLUMN blocks_data jsonb DEFAULT '[]'::jsonb;