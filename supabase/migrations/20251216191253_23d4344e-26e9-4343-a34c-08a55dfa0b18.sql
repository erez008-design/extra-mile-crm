-- Add elevators_count and tenants_count to property_extended_details
ALTER TABLE property_extended_details 
ADD COLUMN IF NOT EXISTS elevators_count integer,
ADD COLUMN IF NOT EXISTS tenants_count integer;