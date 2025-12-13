-- Add new fields to buyer_properties table for AI insights
ALTER TABLE public.buyer_properties
ADD COLUMN IF NOT EXISTS not_interested_reason text,
ADD COLUMN IF NOT EXISTS liked_text text,
ADD COLUMN IF NOT EXISTS disliked_text text;

-- Update status column to support new values if needed
COMMENT ON COLUMN public.buyer_properties.status IS 'Values: offered, not_interested, seen, seen_and_liked, seen_and_disliked';
COMMENT ON COLUMN public.buyer_properties.not_interested_reason IS 'Why the buyer is not interested in this property';
COMMENT ON COLUMN public.buyer_properties.liked_text IS 'What the buyer liked about this property';
COMMENT ON COLUMN public.buyer_properties.disliked_text IS 'What the buyer disliked about this property';