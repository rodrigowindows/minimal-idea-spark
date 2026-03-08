
CREATE TABLE public.user_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  priority_level text NOT NULL DEFAULT 'medium',
  category text NOT NULL DEFAULT 'personal',
  due_date text,
  status text NOT NULL DEFAULT 'active',
  progress integer NOT NULL DEFAULT 0,
  key_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own priorities" ON public.user_priorities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own priorities" ON public.user_priorities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own priorities" ON public.user_priorities FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own priorities" ON public.user_priorities FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_user_priorities BEFORE UPDATE ON public.user_priorities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  week_start date NOT NULL,
  score integer NOT NULL DEFAULT 0,
  reflections text NOT NULL DEFAULT '',
  next_week_plan text NOT NULL DEFAULT '',
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reviews" ON public.weekly_reviews FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reviews" ON public.weekly_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reviews" ON public.weekly_reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reviews" ON public.weekly_reviews FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_weekly_reviews BEFORE UPDATE ON public.weekly_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
