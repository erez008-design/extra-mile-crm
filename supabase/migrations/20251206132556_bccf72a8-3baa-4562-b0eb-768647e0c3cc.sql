-- Add neighborhood column to properties table for hard filter matching
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS neighborhood text;

-- Create index for efficient neighborhood filtering
CREATE INDEX IF NOT EXISTS idx_properties_neighborhood ON public.properties(neighborhood);