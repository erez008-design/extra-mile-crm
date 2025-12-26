-- Add target_budget field for ±20% matching logic
ALTER TABLE public.buyers
ADD COLUMN IF NOT EXISTS target_budget numeric;