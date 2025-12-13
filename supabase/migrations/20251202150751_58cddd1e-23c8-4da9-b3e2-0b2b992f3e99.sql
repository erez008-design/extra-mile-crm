-- Fix RLS for buyer_properties to allow public updates (Buyer Portal is unauthenticated)

-- Drop existing UPDATE policies
DROP POLICY IF EXISTS buyer_properties_update_all ON public.buyer_properties;
DROP POLICY IF EXISTS buyer_properties_update_by_buyer ON public.buyer_properties;
DROP POLICY IF EXISTS buyer_properties_update_permissive ON public.buyer_properties;

-- Create a single permissive UPDATE policy for public access
CREATE POLICY buyer_properties_update_permissive
ON public.buyer_properties
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);