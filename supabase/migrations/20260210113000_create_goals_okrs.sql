-- Migration: Goals / OKRs with Key Results and linkage to opportunities
-- Description: Create goals + key_results tables, pivot for linked opportunities, and FK on opportunities.goal_id

-- Goals table ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES life_domains(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE NOT NULL,
  cycle TEXT NOT NULL DEFAULT 'custom' CHECK (cycle IN ('Q1','Q2','Q3','Q4','S1','S2','annual','custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  final_score INTEGER CHECK (final_score >= 0 AND final_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_cycle ON goals(cycle);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals" ON goals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals" ON goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals" ON goals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals" ON goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Key Results table ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value NUMERIC NOT NULL DEFAULT 1 CHECK (target_value > 0),
  current_value NUMERIC NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit TEXT NOT NULL DEFAULT 'items',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_key_results_goal_id ON key_results(goal_id);
CREATE INDEX IF NOT EXISTS idx_key_results_user_id ON key_results(user_id);

ALTER TABLE key_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view key results of own goals" ON key_results
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid()
  ));

CREATE POLICY "Users can create key results for own goals" ON key_results
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid()
  ));

CREATE POLICY "Users can update key results of own goals" ON key_results
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete key results of own goals" ON key_results
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM goals g WHERE g.id = goal_id AND g.user_id = auth.uid()
  ));

CREATE TRIGGER update_key_results_updated_at
  BEFORE UPDATE ON key_results
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Pivot: key results linked to opportunities --------------------------------
CREATE TABLE IF NOT EXISTS key_result_opportunities (
  key_result_id UUID NOT NULL REFERENCES key_results(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  PRIMARY KEY (key_result_id, opportunity_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kro_opportunity_id ON key_result_opportunities(opportunity_id);

ALTER TABLE key_result_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view linked opportunities for own key results" ON key_result_opportunities
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM key_results kr
    JOIN goals g ON g.id = kr.goal_id
    WHERE kr.id = key_result_id AND g.user_id = auth.uid()
  ));

CREATE POLICY "Users can link opportunities to own key results" ON key_result_opportunities
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM key_results kr
      JOIN goals g ON g.id = kr.goal_id
      WHERE kr.id = key_result_id AND g.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM opportunities o
      WHERE o.id = opportunity_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can unlink opportunities from own key results" ON key_result_opportunities
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM key_results kr
    JOIN goals g ON g.id = kr.goal_id
    WHERE kr.id = key_result_id AND g.user_id = auth.uid()
  ));

-- FK on opportunities -------------------------------------------------------
ALTER TABLE opportunities
  ADD COLUMN IF NOT EXISTS goal_id UUID REFERENCES goals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_goal_id ON opportunities(goal_id);
