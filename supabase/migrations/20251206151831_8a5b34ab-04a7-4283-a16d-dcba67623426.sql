-- Drop the overly permissive UPDATE policy
DROP POLICY IF EXISTS buyer_properties_update_permissive ON public.buyer_properties;

-- Create a SECURITY DEFINER function for buyer property updates
-- This validates buyer_id matches, preventing cross-buyer modifications
CREATE OR REPLACE FUNCTION public.update_buyer_property(
  p_id uuid,
  p_buyer_id uuid,
  p_status text DEFAULT NULL,
  p_liked_text text DEFAULT NULL,
  p_disliked_text text DEFAULT NULL,
  p_not_interested_reason text DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE buyer_properties
  SET 
    status = COALESCE(p_status, status),
    liked_text = COALESCE(p_liked_text, liked_text),
    disliked_text = COALESCE(p_disliked_text, disliked_text),
    not_interested_reason = COALESCE(p_not_interested_reason, not_interested_reason),
    note = COALESCE(p_note, note),
    updated_at = now()
  WHERE id = p_id AND buyer_id = p_buyer_id;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;

-- Create a restrictive UPDATE policy for authenticated agents/admins only
CREATE POLICY buyer_properties_update_agents ON public.buyer_properties
FOR UPDATE TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role))
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));