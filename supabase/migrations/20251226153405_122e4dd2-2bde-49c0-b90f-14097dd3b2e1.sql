-- Fix add_property_for_buyer to require authentication
-- 1. Revoke EXECUTE from anon role
REVOKE EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) FROM anon;

-- 2. Replace the function with authentication check
CREATE OR REPLACE FUNCTION public.add_property_for_buyer(p_buyer_id uuid, p_address text, p_city text, p_price numeric, p_description text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_agent_id uuid;
  v_property_id uuid;
  v_caller_id uuid;
BEGIN
  -- Require authentication
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Validate input lengths to prevent abuse
  IF length(p_address) > 500 THEN
    RAISE EXCEPTION 'Address too long (max 500 characters)';
  END IF;
  IF length(p_city) > 100 THEN
    RAISE EXCEPTION 'City name too long (max 100 characters)';
  END IF;
  IF length(p_description) > 5000 THEN
    RAISE EXCEPTION 'Description too long (max 5000 characters)';
  END IF;
  IF p_price < 0 OR p_price > 1000000000 THEN
    RAISE EXCEPTION 'Price must be between 0 and 1,000,000,000';
  END IF;

  -- Verify the caller is an agent for this buyer or is manager/admin
  IF NOT (is_agent_for_buyer(v_caller_id, p_buyer_id) OR is_manager_or_admin(v_caller_id)) THEN
    RAISE EXCEPTION 'Not authorized to add properties for this buyer';
  END IF;

  -- Get the agent_id for the buyer
  SELECT agent_id INTO v_agent_id
  FROM public.buyer_agents
  WHERE buyer_id = p_buyer_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_agent_id IS NULL THEN
    RAISE EXCEPTION 'No agent found for buyer %', p_buyer_id;
  END IF;
  
  -- Create the property
  INSERT INTO public.properties (address, city, price, description, agent_id, created_by)
  VALUES (p_address, p_city, p_price, p_description, v_agent_id, v_caller_id)
  RETURNING id INTO v_property_id;
  
  -- Link property to buyer
  INSERT INTO public.buyer_properties (buyer_id, property_id, agent_id, status)
  VALUES (p_buyer_id, v_property_id, v_agent_id, 'offered');
  
  RETURN v_property_id;
END;
$function$;

-- Grant execute only to authenticated users
GRANT EXECUTE ON FUNCTION public.add_property_for_buyer(uuid, text, text, numeric, text) TO authenticated;