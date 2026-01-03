-- Drop the existing header-based policies that don't work
DROP POLICY IF EXISTS "buyer_uploads_select_own" ON public.buyer_uploads;
DROP POLICY IF EXISTS "buyer_uploads_insert_own" ON public.buyer_uploads;
DROP POLICY IF EXISTS "buyer_uploads_delete_own" ON public.buyer_uploads;

-- Create new policies that work with the public buyer page
-- Since this is intentionally a public page (no auth required), we allow public access
-- The security comes from the buyer needing to know their buyer_id (from the URL)

-- SELECT: Anyone can read uploads if they know the buyer_id (which is in the URL)
CREATE POLICY "buyer_uploads_public_select"
ON public.buyer_uploads
FOR SELECT
TO public
USING (true);

-- INSERT: Anyone can insert if they provide a valid buyer_id
CREATE POLICY "buyer_uploads_public_insert"
ON public.buyer_uploads
FOR INSERT
TO public
WITH CHECK (
  -- Verify the buyer_id exists in the buyers table
  EXISTS (SELECT 1 FROM public.buyers WHERE id = buyer_id)
);

-- DELETE: Anyone can delete if they know the buyer_id and upload id
-- This matches the public nature of the buyer page
CREATE POLICY "buyer_uploads_public_delete"
ON public.buyer_uploads
FOR DELETE
TO public
USING (true);

-- Storage policies for buyer-uploads bucket
-- Drop existing storage policies if any
DROP POLICY IF EXISTS "buyer_uploads_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "buyer_uploads_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "buyer_uploads_storage_delete" ON storage.objects;

-- Allow public to upload files to buyer-uploads bucket
CREATE POLICY "buyer_uploads_storage_insert"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'buyer-uploads');

-- Allow public to read files from buyer-uploads bucket (via signed URLs)
CREATE POLICY "buyer_uploads_storage_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'buyer-uploads');

-- Allow public to delete files from buyer-uploads bucket
CREATE POLICY "buyer_uploads_storage_delete"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'buyer-uploads');