-- Create matches table to store real-time AI matching results
CREATE TABLE public.matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES public.buyers(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  match_score integer NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reason text,
  hard_filter_passed boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, property_id)
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Policies for matches table
CREATE POLICY "matches_select_agents"
ON public.matches
FOR SELECT
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

CREATE POLICY "matches_insert_system"
ON public.matches
FOR INSERT
WITH CHECK (true);

CREATE POLICY "matches_update_system"
ON public.matches
FOR UPDATE
USING (true);

CREATE POLICY "matches_delete_system"
ON public.matches
FOR DELETE
USING (has_role('agent'::app_role) OR has_role('admin'::app_role));

-- Create updated_at trigger for matches
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for matches table
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;