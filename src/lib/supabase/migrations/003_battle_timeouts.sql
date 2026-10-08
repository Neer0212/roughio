-- 003_battle_timeouts.sql
ALTER TABLE battle_rounds 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revealed_at TIMESTAMPTZ;

-- Existing rounds need a started_at to not break
UPDATE battle_rounds SET started_at = created_at WHERE started_at IS NULL;
