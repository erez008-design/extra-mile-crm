-- Drop restrictive SELECT policies that block anonymous access
DROP POLICY IF EXISTS "Agents can view their buyers" ON public.buyers;
DROP POLICY IF EXISTS "Agents can view all properties" ON public.properties;
DROP POLICY IF EXISTS "Clients can view properties they've seen" ON public.properties;
DROP POLICY IF EXISTS "Clients can view images for their properties" ON public.property_images;

-- Create public access policies for buyer portal
-- Allow anyone (including anonymous) to view buyers
CREATE POLICY "Anyone can view buyers"
ON public.buyers
FOR SELECT
TO public
USING (true);

-- Allow anyone to view buyer_properties
CREATE POLICY "Anyone can view buyer properties"
ON public.buyer_properties
FOR SELECT
TO public
USING (true);

-- Allow anyone to update buyer_properties (for status changes)
CREATE POLICY "Anyone can update buyer properties"
ON public.buyer_properties
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Allow anyone to view all properties (they'll be filtered by buyer_properties in the app)
CREATE POLICY "Anyone can view properties"
ON public.properties
FOR SELECT
TO public
USING (true);

-- Allow anyone to view property images
CREATE POLICY "Anyone can view property images"
ON public.property_images
FOR SELECT
TO public
USING (true);

-- Allow anyone to view property documents
CREATE POLICY "Anyone can view property documents"
ON public.property_documents
FOR SELECT
TO public
USING (true);

-- Keep existing agent/admin management policies
-- (INSERT, UPDATE, DELETE policies for agents remain unchanged)