-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage image categories" ON public.efi_image_categories;
DROP POLICY IF EXISTS "Admins can manage library images" ON public.efi_library_images;

-- Recreate policies with proper WITH CHECK for INSERT
CREATE POLICY "Admins can manage image categories"
ON public.efi_image_categories
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));

CREATE POLICY "Admins can manage library images"
ON public.efi_library_images
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.is_admin = true
));