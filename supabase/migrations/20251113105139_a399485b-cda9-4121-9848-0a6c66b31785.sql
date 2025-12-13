-- Add new fields to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS has_safe_room boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS has_sun_balcony boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parking_spots integer DEFAULT 0;