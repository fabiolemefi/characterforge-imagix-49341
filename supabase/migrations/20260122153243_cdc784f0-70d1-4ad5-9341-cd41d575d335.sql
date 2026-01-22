-- Add html_content column to efi_code_blocks table
ALTER TABLE public.efi_code_blocks 
ADD COLUMN html_content text;