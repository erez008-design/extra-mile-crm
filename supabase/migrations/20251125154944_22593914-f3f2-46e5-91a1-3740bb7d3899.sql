-- Drop ALL existing policies
DROP POLICY IF EXISTS "Anyone can view properties" ON public.properties;
DROP POLICY IF EXISTS "Anyone can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can update properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can delete properties" ON public.properties;
DROP POLICY IF EXISTS "Agents can insert properties" ON public.properties;
DROP POLICY IF EXISTS "Buyers can add properties they found" ON public.properties;
DROP POLICY IF EXISTS "Buyers can insert properties they found" ON public.properties;
DROP POLICY IF EXISTS "public select properties" ON public.properties;
DROP POLICY IF EXISTS "public insert properties" ON public.properties;

DROP POLICY IF EXISTS "Anyone can view property images" ON public.property_images;
DROP POLICY IF EXISTS "Anyone can upload property images" ON public.property_images;
DROP POLICY IF EXISTS "Agents can update property images" ON public.property_images;
DROP POLICY IF EXISTS "Agents can delete property images" ON public.property_images;
DROP POLICY IF EXISTS "Agents can insert property images" ON public.property_images;
DROP POLICY IF EXISTS "public select property_images" ON public.property_images;
DROP POLICY IF EXISTS "public insert property_images" ON public.property_images;

DROP POLICY IF EXISTS "Anyone can view property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can insert property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can update property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Agents can delete property documents" ON public.property_documents;
DROP POLICY IF EXISTS "Clients can view documents for their properties" ON public.property_documents;
DROP POLICY IF EXISTS "public select property_documents" ON public.property_documents;

DROP POLICY IF EXISTS "Anyone can insert property views" ON public.property_views;
DROP POLICY IF EXISTS "Anyone can view property views" ON public.property_views;
DROP POLICY IF EXISTS "Agents can insert property views" ON public.property_views;
DROP POLICY IF EXISTS "Agents can view all property views" ON public.property_views;
DROP POLICY IF EXISTS "Users can view their own property views" ON public.property_views;

DROP POLICY IF EXISTS "Anyone can view buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Anyone can insert buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Anyone can update buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Agents can delete buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Agents can manage buyer properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "Buyers can link properties to themselves" ON public.buyer_properties;
DROP POLICY IF EXISTS "Buyers can view and update their properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "public select buyer_properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "public update buyer_properties" ON public.buyer_properties;
DROP POLICY IF EXISTS "public insert buyer_properties" ON public.buyer_properties;

DROP POLICY IF EXISTS "Anyone can view buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can create buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can update their buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can insert buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can update buyers" ON public.buyers;
DROP POLICY IF EXISTS "public select buyers" ON public.buyers;

DROP POLICY IF EXISTS "Anyone can insert buyer messages" ON public.buyer_messages;
DROP POLICY IF EXISTS "Agents can view their messages" ON public.buyer_messages;
DROP POLICY IF EXISTS "Agents can view buyer messages" ON public.buyer_messages;

-- Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_messages ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Anyone can view properties"
ON public.properties FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can insert properties"
ON public.properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Agents can update properties"
ON public.properties FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role))
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can delete properties"
ON public.properties FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Property images policies
CREATE POLICY "Anyone can view property images"
ON public.property_images FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can upload property images"
ON public.property_images FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Agents can update property images"
ON public.property_images FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role))
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can delete property images"
ON public.property_images FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Property documents policies
CREATE POLICY "Anyone can view property documents"
ON public.property_documents FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Agents can insert property documents"
ON public.property_documents FOR INSERT
TO authenticated
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can update property documents"
ON public.property_documents FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role))
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can delete property documents"
ON public.property_documents FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Property views policies
CREATE POLICY "Anyone can insert property views"
ON public.property_views FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can view property views"
ON public.property_views FOR SELECT
TO anon, authenticated
USING (true);

-- Buyer properties policies
CREATE POLICY "Anyone can view buyer properties"
ON public.buyer_properties FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Anyone can insert buyer properties"
ON public.buyer_properties FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anyone can update buyer properties"
ON public.buyer_properties FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Agents can delete buyer properties"
ON public.buyer_properties FOR DELETE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Buyers policies
CREATE POLICY "Anyone can view buyers"
ON public.buyers FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Agents can insert buyers"
ON public.buyers FOR INSERT
TO authenticated
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "Agents can update buyers"
ON public.buyers FOR UPDATE
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role))
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Buyer messages policies
CREATE POLICY "Anyone can insert buyer messages"
ON public.buyer_messages FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Agents can view buyer messages"
ON public.buyer_messages FOR SELECT
TO authenticated
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));