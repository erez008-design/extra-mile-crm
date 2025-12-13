-- Add hard filter fields to buyers table for hybrid matching engine
ALTER TABLE public.buyers
ADD COLUMN IF NOT EXISTS budget_min numeric,
ADD COLUMN IF NOT EXISTS budget_max numeric,
ADD COLUMN IF NOT EXISTS min_rooms numeric,
ADD COLUMN IF NOT EXISTS target_cities text[],
ADD COLUMN IF NOT EXISTS target_neighborhoods text[],
ADD COLUMN IF NOT EXISTS required_features text[],
ADD COLUMN IF NOT EXISTS floor_min integer,
ADD COLUMN IF NOT EXISTS floor_max integer;

-- Add has_elevator field to properties table if not exists
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS has_elevator boolean DEFAULT false;