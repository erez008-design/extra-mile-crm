-- Add is_not_relevant column to property_ratings table
ALTER TABLE public.property_ratings 
ADD COLUMN IF NOT EXISTS is_not_relevant boolean DEFAULT false;