-- PRIORITY 2: Create RPC function for hard filter analytics
CREATE OR REPLACE FUNCTION public.get_top_exclusion_reasons()
RETURNS TABLE(reason text, count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    match_reason AS reason,
    COUNT(*) AS count
  FROM matches
  WHERE hard_filter_passed = false
    AND match_reason IS NOT NULL
  GROUP BY match_reason
  ORDER BY count DESC
  LIMIT 5;
$$;