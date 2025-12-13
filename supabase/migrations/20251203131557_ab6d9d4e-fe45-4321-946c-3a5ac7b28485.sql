-- Add taste profile columns to buyers table
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS global_liked_profile TEXT,
ADD COLUMN IF NOT EXISTS global_disliked_profile TEXT,
ADD COLUMN IF NOT EXISTS client_match_summary TEXT;