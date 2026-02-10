
-- Create opportunities table
CREATE TABLE IF NOT EXISTS public.opportunities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    domain_id text,
    title text NOT NULL,
    description text,
    type text NOT NULL DEFAULT 'action',
    status text NOT NULL DEFAULT 'backlog',
    priority integer NOT NULL DEFAULT 5,
    strategic_value integer,
    xp_reward integer,
    due_date timestamptz,
    reminder_at timestamptz,
    goal_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create daily_logs table
CREATE TABLE IF NOT EXISTS public.daily_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    content text NOT NULL DEFAULT '',
    mood text,
    energy_level integer,
    log_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create habits table
CREATE TABLE IF NOT EXISTS public.habits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    frequency text NOT NULL DEFAULT 'daily',
    target_count integer NOT NULL DEFAULT 1,
    current_streak integer NOT NULL DEFAULT 0,
    best_streak integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS public.goals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL DEFAULT '',
    domain_id text,
    target_date text NOT NULL DEFAULT '',
    start_date text NOT NULL DEFAULT '',
    progress integer NOT NULL DEFAULT 0,
    milestones jsonb NOT NULL DEFAULT '[]'::jsonb,
    key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
    cycle text NOT NULL DEFAULT 'Q1',
    status text NOT NULL DEFAULT 'active',
    final_score integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    start timestamptz NOT NULL,
    "end" timestamptz NOT NULL,
    color text NOT NULL DEFAULT '#3b82f6',
    category text NOT NULL DEFAULT 'task',
    opportunity_id uuid,
    reminder_minutes integer,
    recurrence text DEFAULT 'none',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS public.knowledge_base (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    source_title text,
    content_chunk text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS public.search_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    query text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for opportunities
CREATE POLICY "Users can view own opportunities" ON public.opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own opportunities" ON public.opportunities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own opportunities" ON public.opportunities FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for daily_logs
CREATE POLICY "Users can view own daily_logs" ON public.daily_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily_logs" ON public.daily_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own daily_logs" ON public.daily_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own daily_logs" ON public.daily_logs FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for habits
CREATE POLICY "Users can view own habits" ON public.habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for goals
CREATE POLICY "Users can view own goals" ON public.goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for calendar_events
CREATE POLICY "Users can view own calendar_events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar_events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar_events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar_events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for knowledge_base
CREATE POLICY "Users can view own knowledge_base" ON public.knowledge_base FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own knowledge_base" ON public.knowledge_base FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own knowledge_base" ON public.knowledge_base FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own knowledge_base" ON public.knowledge_base FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for search_history
CREATE POLICY "Users can view own search_history" ON public.search_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own search_history" ON public.search_history FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own search_history" ON public.search_history FOR DELETE USING (auth.uid() = user_id);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_habits_updated_at BEFORE UPDATE ON public.habits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON public.knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
