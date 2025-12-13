-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', true);

-- Create storage bucket for property documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', false);

-- Storage policies for property images (public bucket)
CREATE POLICY "Anyone can view property images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Agents can upload property images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can update property images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can delete property images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-images' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

-- Storage policies for property documents (private bucket)
CREATE POLICY "Users can view documents of accessible properties"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'property-documents' AND
    (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('agent', 'admin')
      )
      OR
      EXISTS (
        SELECT 1 FROM property_views
        WHERE property_views.client_id = auth.uid()
      )
    )
  );

CREATE POLICY "Agents can upload property documents"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'property-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can update property documents"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'property-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can delete property documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'property-documents' AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

-- Add policies for agents to manage property images and documents
CREATE POLICY "Agents can insert property images"
  ON property_images FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can update property images"
  ON property_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can delete property images"
  ON property_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can insert property documents"
  ON property_documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can update property documents"
  ON property_documents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

CREATE POLICY "Agents can delete property documents"
  ON property_documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );

-- Add policy for agents to delete properties
CREATE POLICY "Agents can delete properties"
  ON properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('agent', 'admin')
    )
  );