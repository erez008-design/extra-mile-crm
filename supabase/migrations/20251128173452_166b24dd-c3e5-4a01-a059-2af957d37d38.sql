-- Drop the insecure public INSERT policy
DROP POLICY IF EXISTS "properties_insert_with_agent" ON public.properties;
DROP POLICY IF EXISTS "properties_insert_all" ON public.properties;

-- Create SECURE INSERT policy: only authenticated agents can insert their own properties
CREATE POLICY "properties_insert_agents_only" 
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('agent'::app_role) 
  AND agent_id = auth.uid()
);

-- Create secure RPC function for buyers to add properties
-- This function uses SECURITY DEFINER to bypass RLS
-- It validates the buyer_id and gets the correct agent_id from buyer_agents table
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
    NULL  -- buyer is not authenticated
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

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) TO anon;
GRANT EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) TO authenticated;