-- Fix overpermissive profiles UPDATE policy to prevent clients from modifying sensitive fields
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND id = (SELECT id FROM public.profiles WHERE id = auth.uid())
  AND agent_id IS NOT DISTINCT FROM (SELECT agent_id FROM public.profiles WHERE id = auth.uid())
  AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  AND created_at = (SELECT created_at FROM public.profiles WHERE id = auth.uid())
);