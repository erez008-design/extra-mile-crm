-- Add drive_folder_id to properties table
ALTER TABLE properties 
ADD COLUMN drive_folder_id TEXT;

COMMENT ON COLUMN properties.drive_folder_id IS 'Google Drive folder ID for syncing documents';

-- Add source column to property_documents table
ALTER TABLE property_documents 
ADD COLUMN source TEXT DEFAULT 'upload' CHECK (source IN ('upload', 'google_drive'));

COMMENT ON COLUMN property_documents.source IS 'Source of the document: upload (direct upload) or google_drive (synced from Drive)';