-- Create buyer_uploads table for private buyer files
CREATE TABLE public.buyer_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  buyer_property_id UUID REFERENCES buyer_properties(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'video', 'document')),
  file_size_bytes INTEGER,
  mime_type TEXT,
  caption TEXT,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.buyer_uploads ENABLE ROW LEVEL SECURITY;

-- PRIVATE RLS: Only the buyer who uploaded can see their own files
-- NO access for agents, managers, or admins
CREATE POLICY "buyer_uploads_select_own"
ON public.buyer_uploads
FOR SELECT
USING (buyer_id::text = current_setting('request.headers', true)::json->>'x-buyer-id');

CREATE POLICY "buyer_uploads_insert_own"
ON public.buyer_uploads
FOR INSERT
WITH CHECK (buyer_id::text = current_setting('request.headers', true)::json->>'x-buyer-id');

CREATE POLICY "buyer_uploads_delete_own"
ON public.buyer_uploads
FOR DELETE
USING (buyer_id::text = current_setting('request.headers', true)::json->>'x-buyer-id');

-- Create PRIVATE storage bucket for buyer uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('buyer-uploads', 'buyer-uploads', false);

-- Storage RLS: Only allow access to files in buyer's own folder
CREATE POLICY "buyer_uploads_storage_select"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'buyer-uploads' 
  AND (storage.foldername(name))[1] = current_setting('request.headers', true)::json->>'x-buyer-id'
);

CREATE POLICY "buyer_uploads_storage_insert"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'buyer-uploads'
  AND (storage.foldername(name))[1] = current_setting('request.headers', true)::json->>'x-buyer-id'
);

CREATE POLICY "buyer_uploads_storage_delete"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'buyer-uploads'
  AND (storage.foldername(name))[1] = current_setting('request.headers', true)::json->>'x-buyer-id'
);

-- Add new activity action type for file uploads (anonymous logging)
ALTER TYPE public.activity_action_type ADD VALUE IF NOT EXISTS 'file_uploaded';

-- Create index for efficient queries
CREATE INDEX idx_buyer_uploads_buyer_property ON public.buyer_uploads(buyer_id, property_id);