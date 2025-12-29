-- Add property_type column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS property_type text DEFAULT 'apartment';

-- Add plot_size_sqm for houses
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS plot_size_sqm integer;

-- Add levels_count for multi-level houses
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS levels_count integer;

-- Add min_plot_size filter to buyers table
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS min_plot_size integer;

-- Add property_types filter to buyers table (array for filtering by property type)
ALTER TABLE public.buyers 
ADD COLUMN IF NOT EXISTS property_types text[];

-- Add comment for property_type values
COMMENT ON COLUMN public.properties.property_type IS 'Property type: apartment, penthouse, private_house, semi_detached';