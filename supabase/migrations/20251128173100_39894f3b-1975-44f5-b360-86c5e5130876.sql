-- Drop existing INSERT policy
DROP POLICY IF EXISTS "properties_insert_all" ON public.properties;

-- Drop the new one if it was partially created
DROP POLICY IF EXISTS "properties_insert_with_agent" ON public.properties;

-- Create new INSERT policy that REQUIRES agent_id to be provided
-- This allows both anon and authenticated users to insert
-- BUT only if they provide a valid agent_id (not null)
CREATE POLICY "properties_insert_with_agent" 
ON public.properties
FOR INSERT
TO public
WITH CHECK (agent_id IS NOT NULL);