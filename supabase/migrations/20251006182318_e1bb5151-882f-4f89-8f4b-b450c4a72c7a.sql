-- Add is_model column to email_templates table
ALTER TABLE email_templates
ADD COLUMN is_model BOOLEAN DEFAULT FALSE;