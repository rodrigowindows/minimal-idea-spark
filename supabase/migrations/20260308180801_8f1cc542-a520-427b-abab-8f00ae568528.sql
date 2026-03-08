CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'in_app',
  type text NOT NULL DEFAULT 'general',
  priority integer NOT NULL DEFAULT 0,
  read boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  snoozed_until timestamptz,
  group_key text,
  action_url text,
  icon text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_notifications_user_read ON public.notifications (user_id, read) WHERE archived = false;
CREATE INDEX idx_notifications_user_snoozed ON public.notifications (user_id, snoozed_until) WHERE snoozed_until IS NOT NULL;