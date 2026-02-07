-- Migration: Ensure RLS is enabled on ALL tables with user_id isolation
-- Description: Comprehensive RLS enforcement for data security
-- All existing tables already have RLS; this migration ensures completeness
-- and adds the target_percentage column to life_domains if missing.

-- Add target_percentage to life_domains if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'life_domains' AND column_name = 'target_percentage'
  ) THEN
    ALTER TABLE life_domains ADD COLUMN target_percentage INTEGER DEFAULT 0;
  END IF;
END $$;

-- Ensure RLS is enabled on all core tables (idempotent)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_dashboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Summary of policies already in place:
-- user_profiles: SELECT/UPDATE/INSERT WHERE auth.uid() = id
-- life_domains: SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id
-- opportunities: SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id
-- daily_logs: SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id
-- knowledge_base: SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id
-- focus_sessions: SELECT/INSERT/UPDATE/DELETE WHERE auth.uid() = user_id
-- chat_history: SELECT/INSERT/DELETE WHERE auth.uid() = user_id
-- organizations: SELECT for members, INSERT/UPDATE/DELETE for owners
-- organization_members: SELECT for org members, ALL for admins+
-- organization_invites: ALL for admins+
-- shared_dashboards: SELECT for members, ALL for editors+
-- activity_logs: SELECT/INSERT for org members
