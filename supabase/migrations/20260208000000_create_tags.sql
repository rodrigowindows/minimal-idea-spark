-- Tags and opportunity/journal tag associations (optional server-side; app also supports localStorage-only)
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#4f46e5',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS opportunity_tags (
  opportunity_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (opportunity_id, tag_id)
);

CREATE TABLE IF NOT EXISTS journal_tags (
  daily_log_id UUID NOT NULL,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (daily_log_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_tags_tag_id ON opportunity_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_journal_tags_tag_id ON journal_tags(tag_id);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunity_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage opportunity_tags" ON opportunity_tags FOR ALL USING (true);
CREATE POLICY "Users can manage journal_tags" ON journal_tags FOR ALL USING (true);
