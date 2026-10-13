-- 006_prevent_score_tampering_and_canonical_battle_id.sql

-- 1. Backfill any existing battle_guesses where battle_id is NULL
UPDATE public.battle_guesses bg
SET battle_id = br.battle_id
FROM public.battle_rounds br
WHERE bg.round_id = br.id AND bg.battle_id IS NULL;

-- 2. Index battle_id on battle_guesses for fast Realtime scoping and foreign key operations
CREATE INDEX IF NOT EXISTS idx_battle_guesses_battle_id ON public.battle_guesses(battle_id);

-- 3. Harden set_battle_guesses_battle_id trigger function:
--    - Safe fixed search_path (public, pg_temp) to prevent CWE-426 untrusted search path vulnerability
--    - Schema-qualify referenced objects
--    - Authoritatively derive battle_id from public.battle_rounds rather than trusting client input
--    - Reject invalid round_id references by raising an exception
CREATE OR REPLACE FUNCTION public.set_battle_guesses_battle_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  resolved_battle_id UUID;
BEGIN
  SELECT battle_id INTO resolved_battle_id
  FROM public.battle_rounds
  WHERE id = NEW.round_id;

  IF resolved_battle_id IS NULL THEN
    RAISE EXCEPTION 'Invalid round_id: round % does not exist', NEW.round_id;
  END IF;

  -- Always overwrite battle_id with the canonical value from the round
  NEW.battle_id := resolved_battle_id;
  RETURN NEW;
END;
$$;

-- 4. Apply trigger to both INSERT and UPDATE operations
DROP TRIGGER IF EXISTS trg_set_battle_guesses_battle_id ON public.battle_guesses;
CREATE TRIGGER trg_set_battle_guesses_battle_id
  BEFORE INSERT OR UPDATE ON public.battle_guesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_battle_guesses_battle_id();

-- 5. Restrict unnecessary execution privileges
REVOKE ALL ON FUNCTION public.set_battle_guesses_battle_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_battle_guesses_battle_id() TO postgres, service_role;

-- 6. Prevent direct client tampering of guesses and score fields (points_awarded, factor)
--    Drop client INSERT and UPDATE policies; writes must go through server-authorized /api/battles/submit (service_role)
DROP POLICY IF EXISTS "Users can insert their guesses" ON public.battle_guesses;
DROP POLICY IF EXISTS "Users can update their guesses" ON public.battle_guesses;

-- Revoke direct write grants from public roles (anon and authenticated)
REVOKE INSERT, UPDATE, DELETE ON TABLE public.battle_guesses FROM anon, authenticated;
GRANT ALL ON TABLE public.battle_guesses TO service_role;
GRANT SELECT ON TABLE public.battle_guesses TO anon, authenticated;
