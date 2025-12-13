-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to send property to Webtiv automatically
CREATE OR REPLACE FUNCTION public.send_property_to_webtiv()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  agent_name text;
  request_id bigint;
BEGIN
  -- Get agent name from profiles
  SELECT full_name INTO agent_name
  FROM public.profiles
  WHERE id = NEW.created_by;

  -- Send HTTP request to edge function
  SELECT net.http_post(
    url := 'https://jhbaqjdgmrrgylpzqymg.supabase.co/functions/v1/send-to-webtiv',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoYmFxamRnbXJyZ3lscHpxeW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI5NDc0NTUsImV4cCI6MjA3ODUyMzQ1NX0.Npvm12_Ji_VltV9Z135DPGUi93plSX6dl4gkTY_ogYo'
    ),
    body := jsonb_build_object(
      'type', 'property',
      'propertyData', jsonb_build_object(
        'id', NEW.id::text,
        'address', NEW.address,
        'city', NEW.city,
        'price', NEW.price,
        'size_sqm', NEW.size_sqm,
        'rooms', NEW.rooms,
        'floor', NEW.floor,
        'description', NEW.description,
        'status', NEW.status,
        'agent_name', COALESCE(agent_name, 'סוכן'),
        'has_safe_room', NEW.has_safe_room,
        'has_sun_balcony', NEW.has_sun_balcony,
        'parking_spots', NEW.parking_spots
      )
    )
  ) INTO request_id;

  -- Log the request
  RAISE LOG 'Sent property % to Webtiv, request_id: %', NEW.id, request_id;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-send properties to Webtiv
DROP TRIGGER IF EXISTS trigger_send_property_to_webtiv ON public.properties;
CREATE TRIGGER trigger_send_property_to_webtiv
  AFTER INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.send_property_to_webtiv();