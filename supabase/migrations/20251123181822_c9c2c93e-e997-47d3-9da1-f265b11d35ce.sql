-- Drop and recreate policies to ensure they exist with correct permissions
-- This is safe because we're using OR REPLACE pattern

-- Allow anyone (including anonymous buyers) to insert properties
DROP POLICY IF EXISTS "Buyers can add properties they found" ON public.properties;
CREATE POLICY "Buyers can add properties they found"
ON public.properties
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to upload property images
DROP POLICY IF EXISTS "Anyone can upload property images" ON public.property_images;
CREATE POLICY "Anyone can upload property images"
ON public.property_images
FOR INSERT
TO public
WITH CHECK (true);

-- Allow anyone to link properties to buyers
DROP POLICY IF EXISTS "Buyers can link properties to themselves" ON public.buyer_properties;
CREATE POLICY "Buyers can link properties to themselves"
ON public.buyer_properties
FOR INSERT
TO public
WITH CHECK (true);

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_property_documents_property_id 
ON public.property_documents(property_id);

CREATE INDEX IF NOT EXISTS idx_buyer_properties_buyer_id 
ON public.buyer_properties(buyer_id);

CREATE INDEX IF NOT EXISTS idx_buyer_properties_status 
ON public.buyer_properties(status);

-- Add documentation comments
COMMENT ON COLUMN public.property_documents.source IS 'Source of document: upload (direct upload) or google_drive (synced from Google Drive)';
COMMENT ON TABLE public.buyer_properties IS 'Links buyers to properties with status tracking (offered/seen/want_to_see/not_interested/offered_price)';
