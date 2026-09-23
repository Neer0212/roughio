-- Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
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

-- Trigger to update Profile stats on new attempt
CREATE OR REPLACE FUNCTION public.update_profile_stats()
RETURNS trigger AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = total_xp + NEW.xp_earned,
      level = FLOOR(SQRT((total_xp + NEW.xp_earned) / 100)) + 1,
      -- Rough approximation of streak logic: if factor < 2, increment streak, else reset
      highest_streak = GREATEST(highest_streak, 
        CASE WHEN NEW.factor < 2 THEN (
          0 -- Need client streak logic for now
        ) ELSE 0 END
      )
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attempt_inserted
  AFTER INSERT ON attempts
  FOR EACH ROW EXECUTE PROCEDURE public.update_profile_stats();
