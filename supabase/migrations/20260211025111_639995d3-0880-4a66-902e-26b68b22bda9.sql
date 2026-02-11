
-- Create NightWorker prompts table
CREATE TABLE IF NOT EXISTS public.nw_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT NOT NULL,
  content TEXT NOT NULL,
  target_folder TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  result_path TEXT,
  result_content TEXT,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create NightWorker prompt events table
CREATE TABLE IF NOT EXISTS public.nw_prompt_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prompt_id UUID NOT NULL REFERENCES public.nw_prompts(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'update',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nw_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nw_prompt_events ENABLE ROW LEVEL SECURITY;

-- For now, allow all authenticated users (nightworker uses service role key anyway)
CREATE POLICY "Allow all for authenticated users" ON public.nw_prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated users" ON public.nw_prompt_events FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_nw_prompts_updated_at
  BEFORE UPDATE ON public.nw_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for common queries
CREATE INDEX idx_nw_prompts_status ON public.nw_prompts(status);
CREATE INDEX idx_nw_prompt_events_prompt_id ON public.nw_prompt_events(prompt_id);

-- Notify PostgREST
NOTIFY pgrst, 'reload schema';
