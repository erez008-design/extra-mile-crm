-- Drop existing function and recreate with date range parameters
DROP FUNCTION IF EXISTS public.get_top_exclusion_reasons();

CREATE OR REPLACE FUNCTION public.get_top_exclusion_reasons(
  start_date timestamp with time zone DEFAULT NULL,
  end_date timestamp with time zone DEFAULT NULL
)
RETURNS TABLE(reason text, count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    match_reason AS reason,
    COUNT(*) AS count
  FROM matches
  WHERE hard_filter_passed = false
    AND match_reason IS NOT NULL
    AND (start_date IS NULL OR created_at >= start_date)
    AND (end_date IS NULL OR created_at <= end_date)
  GROUP BY match_reason
  ORDER BY count DESC
  LIMIT 5;
$$;