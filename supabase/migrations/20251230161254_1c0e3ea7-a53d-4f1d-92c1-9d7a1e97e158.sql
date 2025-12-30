-- Add garden_size_sqm column to properties table for house types
ALTER TABLE public.properties
ADD COLUMN garden_size_sqm integer;

COMMENT ON COLUMN public.properties.garden_size_sqm IS 'Garden size in square meters for house types';