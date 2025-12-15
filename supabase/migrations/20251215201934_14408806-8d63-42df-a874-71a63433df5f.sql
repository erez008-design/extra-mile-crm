-- Update properties table air_directions to text array
ALTER TABLE public.properties
ALTER COLUMN air_directions TYPE text[] USING 
  CASE 
    WHEN air_directions IS NULL THEN NULL
    WHEN air_directions = '' THEN NULL
    ELSE ARRAY[air_directions]
  END;