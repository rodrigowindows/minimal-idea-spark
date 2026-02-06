-- Migration: Create get_focus_stats RPC function
-- Description: Returns aggregated focus session statistics for a user

CREATE OR REPLACE FUNCTION get_focus_stats(
  p_user_id uuid DEFAULT auth.uid(),
  p_days int DEFAULT 30
)
RETURNS TABLE (
  total_sessions bigint,
  completed_sessions bigint,
  total_minutes bigint,
  completion_rate float,
  avg_session_minutes float,
  streak_sessions int
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_streak int := 0;
  v_current_date date;
  v_check_date date;
BEGIN
  -- Calculate streak (consecutive days with at least one completed session)
  v_check_date := CURRENT_DATE;
  LOOP
    SELECT COUNT(*) > 0 INTO FOUND
    FROM focus_sessions
    WHERE user_id = p_user_id
      AND completed = true
      AND started_at::date = v_check_date;

    EXIT WHEN NOT FOUND;
    v_streak := v_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;

  RETURN QUERY
  SELECT
    COUNT(*)::bigint AS total_sessions,
    COUNT(*) FILTER (WHERE f.completed = true)::bigint AS completed_sessions,
    COALESCE(SUM(f.duration_minutes), 0)::bigint AS total_minutes,
    CASE
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE f.completed = true))::float / COUNT(*)::float
      ELSE 0.0
    END AS completion_rate,
    CASE
      WHEN COUNT(*) > 0 THEN AVG(f.duration_minutes)::float
      ELSE 0.0
    END AS avg_session_minutes,
    v_streak AS streak_sessions
  FROM focus_sessions f
  WHERE f.user_id = p_user_id
    AND f.started_at >= NOW() - (p_days || ' days')::interval;
END;
$$;
