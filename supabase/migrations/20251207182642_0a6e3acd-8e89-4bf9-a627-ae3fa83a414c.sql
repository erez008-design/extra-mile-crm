-- Create property_extended_details table
CREATE TABLE public.property_extended_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL UNIQUE,
  floor INTEGER,
  total_floors INTEGER,
  has_elevator BOOLEAN,
  elevators_count INTEGER,
  parking_count INTEGER,
  parking_covered BOOLEAN,
  has_storage BOOLEAN,
  storage_size_sqm NUMERIC,
  balcony_size_sqm NUMERIC,
  renovation_level TEXT CHECK (renovation_level IN ('new', 'renovated', 'needs_renovation')),
  bathrooms INTEGER,
  toilets INTEGER,
  building_year INTEGER,
  air_directions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_extended_details ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "property_extended_details_select_all" 
ON public.property_extended_details 
FOR SELECT 
USING (true);

CREATE POLICY "property_extended_details_insert_agents" 
ON public.property_extended_details 
FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "property_extended_details_update_agents" 
ON public.property_extended_details 
FOR UPDATE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "property_extended_details_delete_agents" 
ON public.property_extended_details 
FOR DELETE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_property_extended_details_updated_at
BEFORE UPDATE ON public.property_extended_details
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();