-- Create admin_neighborhood_additions table for dynamic neighborhood management
CREATE TABLE public.admin_neighborhood_additions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  neighborhood_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (city_name, neighborhood_name)
);

-- Enable RLS
ALTER TABLE public.admin_neighborhood_additions ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "admin_neighborhood_additions_select_all"
ON public.admin_neighborhood_additions
FOR SELECT
USING (true);

CREATE POLICY "admin_neighborhood_additions_insert_admin"
ON public.admin_neighborhood_additions
FOR INSERT
WITH CHECK (has_role('admin'::app_role));

CREATE POLICY "admin_neighborhood_additions_delete_admin"
ON public.admin_neighborhood_additions
FOR DELETE
USING (has_role('admin'::app_role));