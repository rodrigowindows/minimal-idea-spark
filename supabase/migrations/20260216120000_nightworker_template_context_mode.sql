-- Add context_mode to nw_templates for pipeline context propagation.
-- 'previous_only': each step only receives the immediately previous step output
-- 'all_steps': each step receives ALL previous step outputs accumulated
ALTER TABLE nw_templates
  ADD COLUMN IF NOT EXISTS context_mode text DEFAULT NULL;

-- Add check constraint separately (IF NOT EXISTS for the constraint is PG 12+).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nw_templates_context_mode_check'
  ) THEN
    ALTER TABLE nw_templates
      ADD CONSTRAINT nw_templates_context_mode_check
      CHECK (context_mode IS NULL OR context_mode IN ('previous_only', 'all_steps'));
  END IF;
END
$$;

-- Set existing default templates to all_steps (idempotent).
UPDATE nw_templates
  SET context_mode = 'all_steps'
  WHERE is_default = true AND context_mode IS NULL;

COMMENT ON COLUMN nw_templates.context_mode IS
  'Pipeline context propagation mode: previous_only or all_steps';
