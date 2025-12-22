-- Add INSERT policy for plugin-images bucket (admins only)
CREATE POLICY "Admins can upload plugin images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add UPDATE policy for plugin-images bucket (admins only)
CREATE POLICY "Admins can update plugin images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Add DELETE policy for plugin-images bucket (admins only)
CREATE POLICY "Admins can delete plugin images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'plugin-images' 
  AND has_role(auth.uid(), 'admin'::app_role)
);