-- 1. Add UNIQUE constraint on property_id for upsert to work
ALTER TABLE public.property_extended_details
ADD CONSTRAINT property_extended_details_property_id_unique UNIQUE (property_id);

-- 2. Change air_directions to text array for multi-select
ALTER TABLE public.property_extended_details
ALTER COLUMN air_directions TYPE text[] USING 
  CASE 
    WHEN air_directions IS NULL THEN NULL
    WHEN air_directions = '' THEN NULL
    ELSE ARRAY[air_directions]
  END;