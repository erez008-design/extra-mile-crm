-- Disable automatic sync to Webtiv (remove trigger)
DROP TRIGGER IF EXISTS trigger_send_property_to_webtiv ON public.properties;

-- Optionally keep the function for manual use, or drop it completely
-- DROP FUNCTION IF EXISTS public.send_property_to_webtiv();