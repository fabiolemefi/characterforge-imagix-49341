-- Add page_settings column to efi_code_sites table
ALTER TABLE efi_code_sites 
ADD COLUMN IF NOT EXISTS page_settings JSONB DEFAULT '{
  "containerMaxWidth": "1200",
  "title": "",
  "description": "",
  "keywords": "",
  "favicon": "",
  "backgroundColor": "#ffffff",
  "googleAnalyticsId": "",
  "facebookPixelId": "",
  "customHeadCode": ""
}'::jsonb;