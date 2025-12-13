-- CRITICAL SECURITY FIX: Remove profiles.role column and update all RLS policies
-- This prevents privilege escalation attacks

-- Step 1: Drop the role column from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role CASCADE;

-- Step 2: Update all RLS policies to use has_role() function and user_roles table

-- PROFILES TABLE POLICIES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND id = id); -- Prevent changing id

DROP POLICY IF EXISTS "Agents can view their clients" ON public.profiles;
CREATE POLICY "Agents can view their clients" 
ON public.profiles FOR SELECT 
USING (
  agent_id = auth.uid() 
  OR has_role('admin'::app_role) 
  OR has_role('agent'::app_role)
);

-- PROPERTIES TABLE POLICIES
DROP POLICY IF EXISTS "Agents can view all properties" ON public.properties;
CREATE POLICY "Agents can view all properties" 
ON public.properties FOR SELECT 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can insert properties" ON public.properties;
CREATE POLICY "Agents can insert properties" 
ON public.properties FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can update properties" ON public.properties;
CREATE POLICY "Agents can update properties" 
ON public.properties FOR UPDATE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can delete properties" ON public.properties;
CREATE POLICY "Agents can delete properties" 
ON public.properties FOR DELETE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_IMAGES TABLE POLICIES
DROP POLICY IF EXISTS "Agents can insert property images" ON public.property_images;
CREATE POLICY "Agents can insert property images" 
ON public.property_images FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can update property images" ON public.property_images;
CREATE POLICY "Agents can update property images" 
ON public.property_images FOR UPDATE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can delete property images" ON public.property_images;
CREATE POLICY "Agents can delete property images" 
ON public.property_images FOR DELETE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_DOCUMENTS TABLE POLICIES
DROP POLICY IF EXISTS "Agents can insert property documents" ON public.property_documents;
CREATE POLICY "Agents can insert property documents" 
ON public.property_documents FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can update property documents" ON public.property_documents;
CREATE POLICY "Agents can update property documents" 
ON public.property_documents FOR UPDATE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can delete property documents" ON public.property_documents;
CREATE POLICY "Agents can delete property documents" 
ON public.property_documents FOR DELETE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_VIEWS TABLE POLICIES
DROP POLICY IF EXISTS "Agents can view all property views" ON public.property_views;
CREATE POLICY "Agents can view all property views" 
ON public.property_views FOR SELECT 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

DROP POLICY IF EXISTS "Agents can insert property views" ON public.property_views;
CREATE POLICY "Agents can insert property views" 
ON public.property_views FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_NOTES TABLE POLICIES
DROP POLICY IF EXISTS "Agents can view client notes" ON public.property_notes;
CREATE POLICY "Agents can view client notes" 
ON public.property_notes FOR SELECT 
USING (
  client_id = auth.uid() 
  OR EXISTS (
    SELECT 1 FROM profiles p1
    JOIN profiles p2 ON p2.agent_id = p1.id
    WHERE p1.id = auth.uid() 
    AND (has_role('agent'::app_role) OR has_role('admin'::app_role))
    AND p2.id = property_notes.client_id
  )
);

-- Update handle_new_user function to NOT set role in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Insert into profiles WITHOUT role
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  -- Get role from metadata, default to 'client'
  user_role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client');
  
  -- Insert role into user_roles ONLY
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  RETURN NEW;
END;
$$;