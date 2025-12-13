-- ============================================
-- COMPLETE SCHEMA AND RLS SETUP
-- ============================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "properties_insert_agents_only" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_with_agent" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_all" ON public.properties;
DROP POLICY IF EXISTS "properties_select_all" ON public.properties;
DROP POLICY IF EXISTS "properties_update_agents" ON public.properties;
DROP POLICY IF EXISTS "properties_delete_agents" ON public.properties;

DROP POLICY IF EXISTS "property_images_insert_all" ON public.property_images;
DROP POLICY IF EXISTS "property_images_select_all" ON public.property_images;
DROP POLICY IF EXISTS "property_images_update_agents" ON public.property_images;
DROP POLICY IF EXISTS "property_images_delete_agents" ON public.property_images;

DROP POLICY IF EXISTS "buyer_properties_select_all" ON public.buyer_properties;
DROP POLICY IF EXISTS "buyer_properties_insert_all" ON public.buyer_properties;
DROP POLICY IF EXISTS "buyer_properties_update_all" ON public.buyer_properties;
DROP POLICY IF EXISTS "buyer_properties_delete_agents" ON public.buyer_properties;

-- ============================================
-- PROPERTIES TABLE RLS
-- ============================================

-- Everyone can SELECT properties
CREATE POLICY "properties_select_all" 
ON public.properties
FOR SELECT
TO public
USING (true);

-- Only authenticated agents can INSERT properties (direct insert)
CREATE POLICY "properties_insert_agents_only" 
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('agent'::app_role) 
  AND agent_id = auth.uid()
);

-- Agents and admins can UPDATE properties
CREATE POLICY "properties_update_agents" 
ON public.properties
FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Agents and admins can DELETE properties
CREATE POLICY "properties_delete_agents" 
ON public.properties
FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- ============================================
-- PROPERTY_IMAGES TABLE RLS
-- ============================================

-- Everyone can SELECT property images
CREATE POLICY "property_images_select_all" 
ON public.property_images
FOR SELECT
TO public
USING (true);

-- Anyone can INSERT property images (needed for buyer uploads)
CREATE POLICY "property_images_insert_all" 
ON public.property_images
FOR INSERT
TO public
WITH CHECK (true);

-- Agents and admins can UPDATE property images
CREATE POLICY "property_images_update_agents" 
ON public.property_images
FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Agents and admins can DELETE property images
CREATE POLICY "property_images_delete_agents" 
ON public.property_images
FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- ============================================
-- BUYER_PROPERTIES TABLE RLS
-- ============================================

-- Everyone can SELECT buyer_properties
CREATE POLICY "buyer_properties_select_all" 
ON public.buyer_properties
FOR SELECT
TO public
USING (true);

-- Anyone can INSERT buyer_properties (needed for RPC)
CREATE POLICY "buyer_properties_insert_all" 
ON public.buyer_properties
FOR INSERT
TO public
WITH CHECK (true);

-- Anyone can UPDATE buyer_properties (buyers update status)
CREATE POLICY "buyer_properties_update_all" 
ON public.buyer_properties
FOR UPDATE
TO public
USING (true);

-- Only agents can DELETE buyer_properties
CREATE POLICY "buyer_properties_delete_agents" 
ON public.buyer_properties
FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- ============================================
-- RPC FUNCTION FOR BUYER PROPERTY CREATION
-- ============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.add_property_for_buyer(uuid, text, text, numeric, text);

-- Create the secure RPC function
CREATE OR REPLACE FUNCTION public.add_property_for_buyer(
  p_buyer_id uuid,
  p_address text,
  p_city text,
  p_price numeric,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agent_id uuid;
  v_property_id uuid;
BEGIN
  -- Get the agent_id associated with this buyer
  -- If multiple agents, pick the most recent one
  SELECT agent_id INTO v_agent_id
  FROM public.buyer_agents
  WHERE buyer_id = p_buyer_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- If no agent found, raise error
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'No agent found for buyer %', p_buyer_id;
  END IF;
  
  -- Insert the property with the correct agent_id
  INSERT INTO public.properties (
    address,
    city,
    price,
    description,
    agent_id,
    created_by
  )
  VALUES (
    p_address,
    p_city,
    p_price,
    p_description,
    v_agent_id,
    NULL
  )
  RETURNING id INTO v_property_id;
  
  -- Link property to buyer
  INSERT INTO public.buyer_properties (
    buyer_id,
    property_id,
    agent_id,
    status
  )
  VALUES (
    p_buyer_id,
    v_property_id,
    v_agent_id,
    'offered'
  );
  
  RETURN v_property_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) TO authenticated;