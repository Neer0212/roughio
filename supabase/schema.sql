-- Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  highest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Questions Table
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  reference_answer DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  unit_plural TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  explanation TEXT,
  estimation_approach TEXT,
  hint TEXT,
  source TEXT,
  source_name TEXT,
  reference_period TEXT,
  uncertainty_low DOUBLE PRECISION,
  uncertainty_high DOUBLE PRECISION,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  is_ai_generated BOOLEAN DEFAULT false,
  is_community BOOLEAN DEFAULT false
);

-- Attempts Table
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  guess DOUBLE PRECISION NOT NULL,
  actual DOUBLE PRECISION NOT NULL,
  factor DOUBLE PRECISION NOT NULL,
  score_classification TEXT NOT NULL,
  log_distance DOUBLE PRECISION NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  used_hint BOOLEAN DEFAULT false,
  user_reasoning TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Row Level Security (RLS)

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Questions Policies
CREATE POLICY "Questions are viewable by everyone"
  ON questions FOR SELECT
  USING (status = 'active');

-- Attempts Policies
CREATE POLICY "Users can view their own attempts"
  ON attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own attempts"
  ON attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create a trigger to automatically create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- RPC for Random Question
CREATE OR REPLACE FUNCTION get_random_question(
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL,
  p_exclude UUID[] DEFAULT '{}'
) RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM questions
  WHERE status = 'active'
    AND (p_category IS NULL OR category = p_category)
    AND (p_difficulty IS NULL OR difficulty = p_difficulty)
    AND (id != ALL(p_exclude))
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Enhanced RPC for Random Question (supports arrays for stages)
CREATE OR REPLACE FUNCTION get_random_question_v2(
  p_categories TEXT[] DEFAULT NULL,
  p_difficulties TEXT[] DEFAULT NULL,
  p_exclude UUID[] DEFAULT '{}'
) RETURNS SETOF questions AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM questions
  WHERE status = 'active'
    AND (p_categories IS NULL OR category = ANY(p_categories))
    AND (p_difficulties IS NULL OR difficulty = ANY(p_difficulties))
    AND (id != ALL(p_exclude))
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update Profile stats on new attempt
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS trigger AS $$
DECLARE
  new_current_streak INTEGER;
  old_current_streak INTEGER;
  old_highest_streak INTEGER;
BEGIN
  -- Get current profile values
  SELECT current_streak, highest_streak 
  INTO old_current_streak, old_highest_streak
  FROM public.profiles 
  WHERE id = NEW.user_id;

  -- If no profile exists yet, fallback to 0
  old_current_streak := COALESCE(old_current_streak, 0);
  old_highest_streak := COALESCE(old_highest_streak, 0);

  -- Determine new streak
  IF NEW.factor <= 2.0 THEN
    new_current_streak := old_current_streak + 1;
  ELSE
    new_current_streak := 0;
  END IF;

  -- Update profile
  UPDATE public.profiles
  SET total_xp = total_xp + NEW.xp_earned,
      level = FLOOR(SQRT((total_xp + NEW.xp_earned) / 100)) + 1,
      current_streak = new_current_streak,
      highest_streak = GREATEST(old_highest_streak, new_current_streak)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attempt_inserted
  AFTER INSERT ON attempts
  FOR EACH ROW EXECUTE PROCEDURE public.update_profile_stats();

-- RPC for User Statistics
CREATE OR REPLACE FUNCTION get_user_statistics(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_questions', COUNT(*),
    'best_factor', COALESCE(MIN(factor), 0),
    'worst_factor', COALESCE(MAX(factor), 0),
    'avg_factor', COALESCE(AVG(factor), 0),
    'under_2x_count', COALESCE(SUM(CASE WHEN factor <= 2.0 THEN 1 ELSE 0 END), 0),
    'under_5x_count', COALESCE(SUM(CASE WHEN factor <= 5.0 THEN 1 ELSE 0 END), 0)
  )
  INTO stats
  FROM attempts
  WHERE user_id = p_user_id;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- MULTIPLAYER (FERMI BATTLES) SCHEMA --

CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'waiting', -- waiting, playing, finished
  current_round INTEGER DEFAULT 1,
  max_rounds INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE battle_players (
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (battle_id, user_id)
);

CREATE TABLE battle_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_id UUID REFERENCES questions(id),
  status TEXT DEFAULT 'guessing', -- guessing, revealed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE battle_guesses (
  round_id UUID REFERENCES battle_rounds(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  guess DOUBLE PRECISION NOT NULL,
  factor DOUBLE PRECISION,
  points_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (round_id, user_id)
);

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

DROP TRIGGER IF EXISTS trg_set_battle_guesses_battle_id ON battle_guesses;
CREATE TRIGGER trg_set_battle_guesses_battle_id
  BEFORE INSERT OR UPDATE ON battle_guesses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_battle_guesses_battle_id();

REVOKE ALL ON FUNCTION public.set_battle_guesses_battle_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_battle_guesses_battle_id() TO postgres, service_role;

CREATE INDEX IF NOT EXISTS idx_battle_guesses_battle_id ON battle_guesses(battle_id);

-- Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_players;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE battle_guesses;

-- RLS for Battles
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_guesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view battles" ON battles FOR SELECT USING (true);
CREATE POLICY "Anyone can view battle players" ON battle_players FOR SELECT USING (true);
CREATE POLICY "Anyone can view battle rounds" ON battle_rounds FOR SELECT USING (true);
CREATE POLICY "Users can view own guess or revealed round guesses" ON battle_guesses FOR SELECT USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM battle_rounds br
    JOIN battle_players bp ON bp.battle_id = br.battle_id
    WHERE br.id = battle_guesses.round_id
      AND br.status = 'revealed'
      AND bp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create battles" ON battles FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Users can update their battles" ON battles FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Users can join battles" ON battle_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own score" ON battle_players FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert rounds for their battle" ON battle_rounds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM battles WHERE id = battle_id AND host_id = auth.uid())
);
CREATE POLICY "Anyone can update rounds" ON battle_rounds FOR UPDATE USING (true);

-- Client write privileges are revoked; writes must go through server-authorized /api/battles/submit (service_role)
REVOKE INSERT, UPDATE, DELETE ON TABLE battle_guesses FROM anon, authenticated;
GRANT ALL ON TABLE battle_guesses TO service_role;
GRANT SELECT ON TABLE battle_guesses TO anon, authenticated;

-- Atomic Battle Lifecycle Functions
CREATE OR REPLACE FUNCTION public.start_battle_atomic(
  p_battle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_host_player RECORD;
  v_active_host UUID;
  v_player_count INTEGER;
BEGIN
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  IF v_battle.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle has already started or finished', 'status_code', 400);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  SELECT COUNT(*) INTO v_player_count
  FROM public.battle_players
  WHERE battle_id = p_battle_id;

  IF v_player_count < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough players to start', 'status_code', 400);
  END IF;

  v_active_host := v_battle.host_id;
  IF v_active_host != p_user_id THEN
    SELECT last_ping_at INTO v_host_player
    FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = v_active_host;

    IF v_host_player.last_ping_at IS NULL OR (NOW() - v_host_player.last_ping_at) > interval '45 seconds' THEN
      v_active_host := p_user_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Only the active host can start the battle', 'status_code', 403);
    END IF;
  END IF;

  UPDATE public.battles
  SET status = 'playing',
      host_id = v_active_host
  WHERE id = p_battle_id;

  UPDATE public.battle_rounds
  SET started_at = NOW(),
      status = 'guessing',
      revealed_at = NULL
  WHERE battle_id = p_battle_id AND round_number = 1;

  RETURN jsonb_build_object(
    'success', true,
    'battle_id', p_battle_id,
    'host_id', v_active_host
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.advance_battle_round_atomic(
  p_battle_id UUID,
  p_user_id UUID,
  p_expected_round INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_current_round RECORD;
  v_host_player RECORD;
  v_active_host UUID;
  v_next_round_number INTEGER;
BEGIN
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  IF v_battle.status != 'playing' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle is not in playing status', 'status_code', 400);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  IF p_expected_round IS NOT NULL AND v_battle.current_round != p_expected_round THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_advanced', true,
      'current_round', v_battle.current_round,
      'status', v_battle.status
    );
  END IF;

  SELECT * INTO v_current_round
  FROM public.battle_rounds
  WHERE battle_id = p_battle_id AND round_number = v_battle.current_round;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current round not found', 'status_code', 404);
  END IF;

  IF v_current_round.status != 'revealed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Current round must be revealed before advancing', 'status_code', 400);
  END IF;

  v_active_host := v_battle.host_id;
  IF v_active_host != p_user_id THEN
    SELECT last_ping_at INTO v_host_player
    FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = v_active_host;

    IF v_host_player.last_ping_at IS NULL OR (NOW() - v_host_player.last_ping_at) > interval '45 seconds' THEN
      v_active_host := p_user_id;
    ELSE
      RETURN jsonb_build_object('success', false, 'error', 'Only the active host can advance the round', 'status_code', 403);
    END IF;
  END IF;

  IF v_battle.current_round >= v_battle.max_rounds THEN
    UPDATE public.battles
    SET status = 'finished',
        host_id = v_active_host
    WHERE id = p_battle_id;

    RETURN jsonb_build_object(
      'success', true,
      'finished', true,
      'current_round', v_battle.current_round,
      'host_id', v_active_host
    );
  END IF;

  v_next_round_number := v_battle.current_round + 1;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_rounds
    WHERE battle_id = p_battle_id AND round_number = v_next_round_number
  ) THEN
    UPDATE public.battles
    SET status = 'finished',
        host_id = v_active_host
    WHERE id = p_battle_id;

    RETURN jsonb_build_object(
      'success', true,
      'finished', true,
      'current_round', v_battle.current_round,
      'host_id', v_active_host
    );
  END IF;

  UPDATE public.battles
  SET current_round = v_next_round_number,
      host_id = v_active_host
  WHERE id = p_battle_id;

  UPDATE public.battle_rounds
  SET started_at = NOW(),
      status = 'guessing',
      revealed_at = NULL
  WHERE battle_id = p_battle_id AND round_number = v_next_round_number;

  RETURN jsonb_build_object(
    'success', true,
    'finished', false,
    'current_round', v_next_round_number,
    'host_id', v_active_host
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_battle_host_atomic(
  p_battle_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_battle RECORD;
  v_host_player RECORD;
BEGIN
  SELECT * INTO v_battle
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Battle not found', 'status_code', 404);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.battle_players
    WHERE battle_id = p_battle_id AND user_id = p_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Forbidden: not a participant of this battle', 'status_code', 403);
  END IF;

  IF v_battle.host_id = p_user_id THEN
    RETURN jsonb_build_object('success', true, 'host_id', p_user_id);
  END IF;

  SELECT last_ping_at INTO v_host_player
  FROM public.battle_players
  WHERE battle_id = p_battle_id AND user_id = v_battle.host_id;

  IF v_host_player.last_ping_at IS NOT NULL AND (NOW() - v_host_player.last_ping_at) <= interval '45 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Host is currently active', 'status_code', 403);
  END IF;

  UPDATE public.battles
  SET host_id = p_user_id
  WHERE id = p_battle_id;

  RETURN jsonb_build_object('success', true, 'host_id', p_user_id);
END;
$$;

REVOKE ALL ON FUNCTION public.start_battle_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_battle_atomic(UUID, UUID) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.advance_battle_round_atomic(UUID, UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.advance_battle_round_atomic(UUID, UUID, INTEGER) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.claim_battle_host_atomic(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_battle_host_atomic(UUID, UUID) TO postgres, service_role;

-- RANKED MODE (DAILY CHALLENGE) SCHEMA --

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200;

CREATE TABLE daily_challenges (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  question_ids UUID[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE TABLE daily_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE REFERENCES daily_challenges(date) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_score INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(date, user_id)
);

ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view daily challenges" ON daily_challenges FOR SELECT USING (true);
CREATE POLICY "Anyone can initialize today's challenge" ON daily_challenges FOR INSERT WITH CHECK (date = CURRENT_DATE);

CREATE POLICY "Anyone can view daily attempts" ON daily_attempts FOR SELECT USING (true);
CREATE POLICY "Users can insert their daily attempt" ON daily_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
