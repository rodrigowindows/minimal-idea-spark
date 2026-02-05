-- Migration: Create life_domains table
-- Description: User-customizable life domains (Career, Health, etc.)

CREATE TABLE IF NOT EXISTS life_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_theme TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_life_domains_user_id ON life_domains(user_id);

-- Enable RLS
ALTER TABLE life_domains ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own domains" ON life_domains
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own domains" ON life_domains
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own domains" ON life_domains
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own domains" ON life_domains
  FOR DELETE USING (auth.uid() = user_id);
