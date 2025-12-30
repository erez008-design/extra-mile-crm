-- Add elevators_count column to properties table
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS elevators_count integer;