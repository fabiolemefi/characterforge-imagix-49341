-- Fix RLS policies for brand-guide-assets bucket to allow authenticated users to upload

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload brand guide assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view brand guide assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand guide assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand guide assets" ON storage.objects;

-- Allow authenticated users to upload files to brand-guide-assets bucket
CREATE POLICY "Authenticated users can upload brand guide assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-guide-assets');

-- Allow public access to view brand guide assets
CREATE POLICY "Public can view brand guide assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'brand-guide-assets');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update brand guide assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-guide-assets')
WITH CHECK (bucket_id = 'brand-guide-assets');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete brand guide assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'brand-guide-assets');