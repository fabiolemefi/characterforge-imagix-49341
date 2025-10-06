-- Create storage bucket for email images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-images',
  'email-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
);

-- Allow authenticated users to upload their own images
CREATE POLICY "Users can upload email images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'email-images');

-- Allow public access to view images
CREATE POLICY "Anyone can view email images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete their email images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'email-images' AND auth.uid()::text = (storage.foldername(name))[1]);