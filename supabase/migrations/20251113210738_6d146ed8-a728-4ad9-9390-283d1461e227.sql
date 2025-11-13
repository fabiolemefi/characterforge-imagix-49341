-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view avatars (public bucket)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Policy: Admins can upload avatars
CREATE POLICY "Admins can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can update avatars
CREATE POLICY "Admins can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Policy: Admins can delete avatars
CREATE POLICY "Admins can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  has_role(auth.uid(), 'admin'::app_role)
);