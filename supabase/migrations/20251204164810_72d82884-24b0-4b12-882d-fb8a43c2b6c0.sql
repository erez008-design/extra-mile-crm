-- Create neighborhoods lookup table
CREATE TABLE public.neighborhoods_lookup (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city_name TEXT NOT NULL,
  neighborhood_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster city lookups
CREATE INDEX idx_neighborhoods_city ON public.neighborhoods_lookup(city_name);

-- Enable RLS
ALTER TABLE public.neighborhoods_lookup ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "neighborhoods_lookup_select_all" 
ON public.neighborhoods_lookup 
FOR SELECT 
USING (true);

-- Allow agents/admins to manage neighborhoods
CREATE POLICY "neighborhoods_lookup_insert_agents" 
ON public.neighborhoods_lookup 
FOR INSERT 
WITH CHECK (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "neighborhoods_lookup_delete_agents" 
ON public.neighborhoods_lookup 
FOR DELETE 
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Insert initial neighborhoods for common cities
INSERT INTO public.neighborhoods_lookup (city_name, neighborhood_name) VALUES
-- רחובות
('רחובות', 'מרכז העיר'),
('רחובות', 'נווה יהודה'),
('רחובות', 'קריית משה'),
('רחובות', 'רחובות הצעירה'),
('רחובות', 'נאות שקמה'),
('רחובות', 'אברמוביץ'),
('רחובות', 'גני רחובות'),
('רחובות', 'כפר גבירול'),
-- נס ציונה
('נס ציונה', 'מרכז העיר'),
('נס ציונה', 'נווה נאמן'),
('נס ציונה', 'גני נס ציונה'),
('נס ציונה', 'פרדס חנה'),
('נס ציונה', 'רמת הנשיא'),
-- ראשון לציון
('ראשון לציון', 'מרכז העיר'),
('ראשון לציון', 'נווה ים'),
('ראשון לציון', 'נחלת יהודה'),
('ראשון לציון', 'רמת אליהו'),
('ראשון לציון', 'נאות שושנים'),
('ראשון לציון', 'קרית משה');