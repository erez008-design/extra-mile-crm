-- Add parking_type column to property_extended_details table
ALTER TABLE public.property_extended_details
ADD COLUMN IF NOT EXISTS parking_type text;