-- 004_battle_presence.sql
ALTER TABLE battle_players
ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ DEFAULT NOW();
