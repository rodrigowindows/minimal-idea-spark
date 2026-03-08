
-- 1. XP Summaries table
CREATE TABLE public.xp_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  level integer NOT NULL DEFAULT 1,
  xp_total integer NOT NULL DEFAULT 0,
  xp_current_level integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  week_score integer,
  deep_work_minutes integer NOT NULL DEFAULT 0,
  opportunities_completed integer NOT NULL DEFAULT 0,
  insights_logged integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.xp_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own xp" ON public.xp_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own xp" ON public.xp_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own xp" ON public.xp_summaries FOR UPDATE USING (auth.uid() = user_id);

-- 2. Life Domains table
CREATE TABLE public.life_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  color_theme text NOT NULL DEFAULT '#3b82f6',
  target_percentage integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.life_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own domains" ON public.life_domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own domains" ON public.life_domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own domains" ON public.life_domains FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own domains" ON public.life_domains FOR DELETE USING (auth.uid() = user_id);

-- 3. Habit Completions table
CREATE TABLE public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  completed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (habit_id, completed_date)
);

ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.habit_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own completions" ON public.habit_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.habit_completions FOR DELETE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER set_updated_at_xp_summaries BEFORE UPDATE ON public.xp_summaries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER set_updated_at_life_domains BEFORE UPDATE ON public.life_domains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
