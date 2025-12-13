-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete properties" ON public.properties;
DROP POLICY IF EXISTS "public insert properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can view their clients" ON public.properties;

DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can insert property images" ON public.property_images;
DROP POLICY IF EXISTS "Agents can update property images" ON public.property_images;
DROP POLICY IF EXISTS "Agents can delete property images" ON public.property_images;
DROP POLICY IF EXISTS "public insert property_images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can upload property images" ON public.property_images;

DROP POLICY IF EXISTS "Anyone can view property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can insert property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can update property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can delete property documents" ON public.property_documents;

DROP POLICY IF EXISTS "Anyone can insert property views" ON public.property_views;
DROP POLICY IF EXISTS "Anyone can view property views" ON public.property_views;

DROP POLICY IF EXISTS "Anyone can view buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can insert buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can update buyers" ON public.buyers;

DROP POLICY IF EXISTS "Anyone can view buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Anyone can insert buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Anyone can update buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Agents can delete buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "public insert buyer_properties" ON public.buyer_properties;

DROP POLICY IF EXISTS "Anyone can insert buyer messages" ON public.buyer_messages;
DROP POLICY IF EXISTS "Agents can view buyer messages" ON public.buyer_messages;

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_messages ENABLE ROW LEVEL SECURITY;

-- PROPERTIES policies
CREATE POLICY "properties_select_all"
ON public.properties FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "properties_insert_all"
ON public.properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "properties_update_agents"
ON public.properties FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "properties_delete_agents"
ON public.properties FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_IMAGES policies
CREATE POLICY "property_images_select_all"
ON public.property_images FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "property_images_insert_all"
ON public.property_images FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "property_images_update_agents"
ON public.property_images FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "property_images_delete_agents"
ON public.property_images FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_DOCUMENTS policies
CREATE POLICY "property_documents_select_all"
ON public.property_documents FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "property_documents_insert_agents"
ON public.property_documents FOR INSERT
TO authenticated
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "property_documents_update_agents"
ON public.property_documents FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "property_documents_delete_agents"
ON public.property_documents FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- PROPERTY_VIEWS policies
CREATE POLICY "property_views_insert_all"
ON public.property_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "property_views_select_all"
ON public.property_views FOR SELECT
TO anon, authenticated
USING (true);

-- BUYERS policies
CREATE POLICY "buyers_select_all"
ON public.buyers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "buyers_insert_agents"
ON public.buyers FOR INSERT
TO authenticated
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "buyers_update_agents"
ON public.buyers FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- BUYER_PROPERTIES policies
CREATE POLICY "buyer_properties_select_all"
ON public.buyer_properties FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "buyer_properties_insert_all"
ON public.buyer_properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "buyer_properties_update_all"
ON public.buyer_properties FOR UPDATE
TO anon, authenticated
USING (true);

CREATE POLICY "buyer_properties_delete_agents"
ON public.buyer_properties FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- BUYER_MESSAGES policies
CREATE POLICY "buyer_messages_insert_all"
ON public.buyer_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "buyer_messages_select_agents"
ON public.buyer_messages FOR SELECT
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));