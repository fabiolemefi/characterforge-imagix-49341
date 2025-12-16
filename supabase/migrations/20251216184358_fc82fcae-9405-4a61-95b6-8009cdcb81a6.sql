-- Drop both policy variants (with and without trailing space)
DROP POLICY IF EXISTS "Users can update briefings " ON public.briefings;
DROP POLICY IF EXISTS "Users can update briefings" ON public.briefings;

-- Create a permissive UPDATE policy
CREATE POLICY "Users can update briefings"
ON public.briefings
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);