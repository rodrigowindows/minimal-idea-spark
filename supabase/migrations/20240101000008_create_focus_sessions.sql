-- Migration: Create focus_sessions table
-- Description: Track deep work / pomodoro sessions

CREATE TABLE IF NOT EXISTS focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
  session_type TEXT NOT NULL DEFAULT 'work' CHECK (session_type IN ('work', 'break')),
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_opportunity_id ON focus_sessions(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at ON focus_sessions(started_at DESC);

-- Enable RLS
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own sessions" ON focus_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sessions" ON focus_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON focus_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions" ON focus_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Function: Get focus session stats
CREATE OR REPLACE FUNCTION get_focus_stats(
  p_user_id uuid DEFAULT auth.uid(),
  p_days int DEFAULT 7
)
RETURNS TABLE (
  total_sessions bigint,
  completed_sessions bigint,
  total_focus_minutes bigint,
  avg_session_minutes numeric,
  completion_rate numeric
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_sessions,
    COUNT(*) FILTER (WHERE completed) AS completed_sessions,
    COALESCE(SUM(duration_minutes) FILTER (WHERE completed), 0) AS total_focus_minutes,
    ROUND(AVG(duration_minutes) FILTER (WHERE completed), 1) AS avg_session_minutes,
    ROUND(
      COUNT(*) FILTER (WHERE completed)::numeric / NULLIF(COUNT(*), 0) * 100,
      1
    ) AS completion_rate
  FROM focus_sessions
  WHERE user_id = p_user_id
    AND session_type = 'work'
    AND started_at >= NOW() - (p_days || ' days')::interval;
END;
$$;
