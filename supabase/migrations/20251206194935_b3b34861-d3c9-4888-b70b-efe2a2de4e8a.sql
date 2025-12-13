-- Drop existing function and recreate with agent_id parameter
DROP FUNCTION IF EXISTS public.get_top_exclusion_reasons(timestamp with time zone, timestamp with time zone);

CREATE OR REPLACE FUNCTION public.get_top_exclusion_reasons(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL,
  agent_id uuid DEFAULT NULL
)
RETURNS TABLE(reason text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    m.match_reason AS reason,
    COUNT(*) AS count
  FROM matches m
  WHERE m.hard_filter_passed = false
    AND m.match_reason IS NOT NULL
    AND (start_date IS NULL OR m.created_at >= start_date)
    AND (end_date IS NULL OR m.created_at <= end_date)
    AND (agent_id IS NULL OR EXISTS (
      SELECT 1 FROM buyer_agents ba 
      WHERE ba.buyer_id = m.buyer_id 
      AND ba.agent_id = get_top_exclusion_reasons.agent_id
    ))
  GROUP BY m.match_reason
  ORDER BY count DESC
  LIMIT 5;
$$;