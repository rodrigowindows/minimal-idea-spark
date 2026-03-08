
CREATE TABLE public.weekly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  domain_id text NOT NULL,
  opportunities_target integer NOT NULL DEFAULT 0,
  hours_target numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, domain_id)
);

ALTER TABLE public.weekly_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own targets" ON public.weekly_targets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own targets" ON public.weekly_targets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own targets" ON public.weekly_targets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own targets" ON public.weekly_targets FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_updated_at_weekly_targets BEFORE UPDATE ON public.weekly_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
