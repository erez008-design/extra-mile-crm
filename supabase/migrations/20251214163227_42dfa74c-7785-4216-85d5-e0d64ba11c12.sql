-- Add missing columns to properties table for data enrichment
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS total_floors integer,
ADD COLUMN IF NOT EXISTS air_directions text,
ADD COLUMN IF NOT EXISTS renovation_status text,
ADD COLUMN IF NOT EXISTS build_year integer,
ADD COLUMN IF NOT EXISTS has_balcony boolean DEFAULT false;