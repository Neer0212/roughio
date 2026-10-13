-- 005_secure_battle_guesses.sql
-- 1. Add battle_id to battle_guesses to scope Realtime subscriptions and enforce cross-battle isolation
ALTER TABLE battle_guesses
ADD COLUMN IF NOT EXISTS battle_id UUID REFERENCES battles(id) ON DELETE CASCADE;

-- 2. Backfill battle_id for existing battle_guesses from battle_rounds
UPDATE battle_guesses bg
SET battle_id = br.battle_id
FROM battle_rounds br
WHERE bg.round_id = br.id AND bg.battle_id IS NULL;

-- 3. Trigger to ensure battle_id is always populated even if omitted by client
CREATE OR REPLACE FUNCTION set_battle_guesses_battle_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.battle_id IS NULL THEN
    SELECT battle_id INTO NEW.battle_id
    FROM battle_rounds
    WHERE id = NEW.round_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_battle_guesses_battle_id ON battle_guesses;
CREATE TRIGGER trg_set_battle_guesses_battle_id
  BEFORE INSERT ON battle_guesses
  FOR EACH ROW
  EXECUTE FUNCTION set_battle_guesses_battle_id();

-- 4. Revoke unrestricted SELECT policy that permitted anyone to view active guesses
DROP POLICY IF EXISTS "Anyone can view battle guesses" ON battle_guesses;
DROP POLICY IF EXISTS "Users can view own guess or revealed round guesses" ON battle_guesses;

-- 5. Create secure SELECT policy:
-- Players may ONLY view their own guess during 'guessing',
-- or view all guesses for the round ONLY once it is 'revealed' AND if they are an authorized participant in that battle.
CREATE POLICY "Users can view own guess or revealed round guesses"
ON battle_guesses FOR SELECT
USING (
  -- A player can always view their own guess
  auth.uid() = user_id
  OR
  -- A participant in the battle can view all guesses in that battle's round once revealed
  EXISTS (
    SELECT 1 FROM battle_rounds br
    JOIN battle_players bp ON bp.battle_id = br.battle_id
    WHERE br.id = battle_guesses.round_id
      AND br.status = 'revealed'
      AND bp.user_id = auth.uid()
  )
);

-- 6. Tighten INSERT and UPDATE policies to authorized participants on active guessing rounds
DROP POLICY IF EXISTS "Users can insert their guesses" ON battle_guesses;
CREATE POLICY "Users can insert their guesses" ON battle_guesses
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM battle_rounds br
    JOIN battle_players bp ON bp.battle_id = br.battle_id
    WHERE br.id = round_id
      AND br.status = 'guessing'
      AND bp.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their guesses" ON battle_guesses;
CREATE POLICY "Users can update their guesses" ON battle_guesses
FOR UPDATE USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM battle_rounds br
    JOIN battle_players bp ON bp.battle_id = br.battle_id
    WHERE br.id = round_id
      AND br.status = 'guessing'
      AND bp.user_id = auth.uid()
  )
);
