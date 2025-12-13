-- Add SELECT RLS policies for clients to view property images and documents

-- Policy for property_images: Clients can view images for properties they have access to
CREATE POLICY "Clients can view images for their properties"
ON public.property_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_views
    WHERE property_views.property_id = property_images.property_id
      AND property_views.client_id = auth.uid()
  )
  OR has_role('agent'::app_role)
  OR has_role('admin'::app_role)
);

-- Policy for property_documents: Clients can view documents for properties they have access to
CREATE POLICY "Clients can view documents for their properties"
ON public.property_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.property_views
    WHERE property_views.property_id = property_documents.property_id
      AND property_views.client_id = auth.uid()
  )
  OR has_role('agent'::app_role)
  OR has_role('admin'::app_role)
);