-- Add listing_agent_name column to properties for Smart Match Priority logic
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS listing_agent_name TEXT;

-- Add criteria_updated to the activity_action_type enum
ALTER TYPE public.activity_action_type ADD VALUE IF NOT EXISTS 'criteria_updated';