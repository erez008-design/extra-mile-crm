-- Add agent_feedback column to buyer_properties table for internal agent notes
ALTER TABLE public.buyer_properties ADD COLUMN IF NOT EXISTS agent_feedback text;

-- Add a comment for documentation
COMMENT ON COLUMN public.buyer_properties.agent_feedback IS 'Internal agent notes about why a client liked/disliked this property. Not visible to public.';