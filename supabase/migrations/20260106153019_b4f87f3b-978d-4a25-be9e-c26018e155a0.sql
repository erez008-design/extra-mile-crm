-- Update the CHECK constraint to include requested_info status
ALTER TABLE buyer_properties 
DROP CONSTRAINT IF EXISTS buyer_properties_status_check;

ALTER TABLE buyer_properties
ADD CONSTRAINT buyer_properties_status_check 
CHECK (status IN ('offered', 'interested', 'seen', 'not_interested', 'want_to_see', 'offered_price', 'requested_info'));

COMMENT ON COLUMN buyer_properties.status IS 'Valid values: offered, interested, seen, not_interested, want_to_see, offered_price, requested_info';