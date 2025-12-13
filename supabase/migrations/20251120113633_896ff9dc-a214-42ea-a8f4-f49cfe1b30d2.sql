-- Add notes column to buyers table if not exists
ALTER TABLE buyers ADD COLUMN IF NOT EXISTS notes TEXT;

-- Update buyer_properties to support all required statuses
-- The status column already exists but we'll add a comment to document valid values
COMMENT ON COLUMN buyer_properties.status IS 'Valid values: offered, seen, not_interested, want_to_see, offered_price';

-- Add price_offered column for when buyer makes an offer
ALTER TABLE buyer_properties ADD COLUMN IF NOT EXISTS price_offered NUMERIC;