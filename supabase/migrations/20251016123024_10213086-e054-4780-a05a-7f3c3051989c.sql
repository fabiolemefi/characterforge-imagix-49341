-- Add foreign key constraint between email_templates.created_by and profiles.id
ALTER TABLE email_templates
DROP CONSTRAINT IF EXISTS email_templates_created_by_fkey;

ALTER TABLE email_templates
ADD CONSTRAINT email_templates_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES profiles(id)
ON DELETE SET NULL;