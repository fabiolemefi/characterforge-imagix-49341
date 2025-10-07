-- Add is_model column to email_templates for templates/models feature
ALTER TABLE email_templates
ADD COLUMN is_model BOOLEAN DEFAULT FALSE;
