-- Add status column to buyers table for lead tracking
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'lead';

-- Add index for status filtering
CREATE INDEX IF NOT EXISTS idx_buyers_status ON public.buyers(status);

-- Add new action types to the enum for catalog-related activities
ALTER TYPE public.activity_action_type ADD VALUE IF NOT EXISTS 'property_saved';
ALTER TYPE public.activity_action_type ADD VALUE IF NOT EXISTS 'self_registered';

-- Comment for documentation
COMMENT ON COLUMN public.buyers.status IS 'Lead status: lead, active, closed';