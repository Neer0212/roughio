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
  guess DOUBLE PRECISION NOT NULL,
  factor DOUBLE PRECISION,
  points_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (round_id, user_id)
);

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
CREATE POLICY "Anyone can view battle guesses" ON battle_guesses FOR SELECT USING (true);

CREATE POLICY "Users can create battles" ON battles FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Users can update their battles" ON battles FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Users can join battles" ON battle_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own score" ON battle_players FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert rounds for their battle" ON battle_rounds FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM battles WHERE id = battle_id AND host_id = auth.uid())
);
CREATE POLICY "Anyone can update rounds" ON battle_rounds FOR UPDATE USING (true);

CREATE POLICY "Users can insert their guesses" ON battle_guesses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their guesses" ON battle_guesses FOR UPDATE USING (auth.uid() = user_id);

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
