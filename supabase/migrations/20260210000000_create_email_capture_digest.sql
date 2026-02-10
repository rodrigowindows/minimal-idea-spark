-- Email capture settings: map a unique inbound email address to a user/workspace
create table if not exists public.email_capture_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capture_email text not null unique, -- e.g. capture-abc123@inbound.lifeos.app
  is_active boolean not null default true,
  rate_limit_per_hour integer not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.email_capture_settings enable row level security;

create policy "Users can view own email capture settings"
  on public.email_capture_settings for select using (auth.uid() = user_id);
create policy "Users can insert own email capture settings"
  on public.email_capture_settings for insert with check (auth.uid() = user_id);
create policy "Users can update own email capture settings"
  on public.email_capture_settings for update using (auth.uid() = user_id);
create policy "Users can delete own email capture settings"
  on public.email_capture_settings for delete using (auth.uid() = user_id);

create index idx_email_capture_user on public.email_capture_settings(user_id);
create index idx_email_capture_email on public.email_capture_settings(capture_email);

-- Digest preferences table
create table if not exists public.digest_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  enabled boolean not null default false,
  frequency text not null default 'weekly' check (frequency in ('daily', 'weekly')),
  include_opportunities boolean not null default true,
  include_journal boolean not null default true,
  include_metrics boolean not null default true,
  preferred_time time not null default '08:00',
  preferred_day integer default 1 check (preferred_day between 0 and 6), -- 0=Sun, 1=Mon
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.digest_preferences enable row level security;

create policy "Users can view own digest preferences"
  on public.digest_preferences for select using (auth.uid() = user_id);
create policy "Users can insert own digest preferences"
  on public.digest_preferences for insert with check (auth.uid() = user_id);
create policy "Users can update own digest preferences"
  on public.digest_preferences for update using (auth.uid() = user_id);

create index idx_digest_prefs_user on public.digest_preferences(user_id);

-- Inbound email log: track received emails for rate limiting and auditing
create table if not exists public.email_inbound_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_email text not null,
  subject text,
  created_type text, -- 'opportunity' or 'journal'
  created_id uuid, -- ID of the created record
  status text not null default 'processed' check (status in ('processed', 'rejected', 'rate_limited', 'error')),
  error_message text,
  received_at timestamptz not null default now()
);

alter table public.email_inbound_log enable row level security;

create policy "Users can view own email logs"
  on public.email_inbound_log for select using (auth.uid() = user_id);

create index idx_email_log_user on public.email_inbound_log(user_id);
create index idx_email_log_received on public.email_inbound_log(received_at);

-- Digest send log
create table if not exists public.digest_send_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  frequency text not null,
  period_start date not null,
  period_end date not null,
  opportunities_count integer not null default 0,
  journal_count integer not null default 0,
  sent_at timestamptz not null default now()
);

alter table public.digest_send_log enable row level security;

create policy "Users can view own digest logs"
  on public.digest_send_log for select using (auth.uid() = user_id);

create index idx_digest_log_user on public.digest_send_log(user_id);

-- Auto-update updated_at triggers
create or replace function update_email_capture_updated_at()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger email_capture_updated_at
  before update on public.email_capture_settings
  for each row execute function update_email_capture_updated_at();

create trigger digest_prefs_updated_at
  before update on public.digest_preferences
  for each row execute function update_email_capture_updated_at();
