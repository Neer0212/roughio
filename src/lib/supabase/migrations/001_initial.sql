-- ============================================================
-- ROUGHIO INITIAL SCHEMA
-- Migration 001 — Core Tables
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- CATEGORIES TABLE
-- ============================================================
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  accent_color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- QUESTIONS TABLE
-- ============================================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  reference_answer DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  unit_plural TEXT,
  category_id TEXT NOT NULL REFERENCES categories(id),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard', 'unhinged')),
  explanation TEXT NOT NULL,
  estimation_approach TEXT NOT NULL,
  hint TEXT,
  source TEXT,
  source_name TEXT,
  reference_period TEXT,
  uncertainty_low DOUBLE PRECISION,
  uncertainty_high DOUBLE PRECISION,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'review', 'retired')),
  is_ai_generated BOOLEAN DEFAULT FALSE,
  is_community BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_category ON questions(category_id);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_status ON questions(status);

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_username ON profiles(username);

-- ============================================================
-- ATTEMPTS TABLE
-- ============================================================
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id),
  user_guess DOUBLE PRECISION NOT NULL,
  user_guess_raw TEXT NOT NULL,
  factor_score DOUBLE PRECISION NOT NULL,
  log_distance DOUBLE PRECISION NOT NULL,
  classification TEXT NOT NULL,
  is_over_estimate BOOLEAN NOT NULL,
  xp_earned INTEGER DEFAULT 0,
  used_hint BOOLEAN DEFAULT FALSE,
  user_reasoning TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_question ON attempts(question_id);
CREATE INDEX idx_attempts_created ON attempts(created_at);
CREATE INDEX idx_attempts_user_created ON attempts(user_id, created_at DESC);

-- ============================================================
-- USER STATS TABLE (denormalized aggregate stats)
-- ============================================================
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_questions INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  average_log_score DOUBLE PRECISION DEFAULT 0,
  best_factor DOUBLE PRECISION DEFAULT 999999,
  worst_factor DOUBLE PRECISION DEFAULT 0,
  pct_under_2x DOUBLE PRECISION DEFAULT 0,
  pct_under_5x DOUBLE PRECISION DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER ACHIEVEMENTS TABLE
-- ============================================================
CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id),
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================
-- GUEST SESSIONS TABLE (for unauthenticated users)
-- ============================================================
CREATE TABLE guest_sessions (
  id TEXT PRIMARY KEY,
  attempts_data JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Questions: readable by everyone
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Questions are publicly readable"
  ON questions FOR SELECT USING (status = 'active');

-- Categories: readable by everyone
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable"
  ON categories FOR SELECT USING (TRUE);

-- Profiles: readable by everyone, writable by owner
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable"
  ON profiles FOR SELECT USING (TRUE);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Attempts: users can read/write own attempts
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own attempts"
  ON attempts FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can insert own attempts"
  ON attempts FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- User stats: users can read/update own stats
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- User achievements: readable by owner
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Guest sessions: public read/write (managed by session ID)
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guest sessions are publicly accessible"
  ON guest_sessions FOR ALL USING (TRUE);

-- ============================================================
-- SEED CATEGORIES
-- ============================================================
INSERT INTO categories (id, name, description, icon, color, accent_color) VALUES
  ('technology', 'Technology', 'Software, hardware, internet, and digital life', '💻', '#B9A0FF', 'rgba(185, 160, 255, 0.15)'),
  ('science', 'Science', 'Physics, chemistry, biology, and research', '🔬', '#82C8FF', 'rgba(130, 200, 255, 0.15)'),
  ('geography', 'Geography', 'Countries, landmasses, distances, and natural features', '🌍', '#8CE6B0', 'rgba(140, 230, 176, 0.15)'),
  ('cities', 'Cities', 'Urban life, populations, and metropolitan areas', '🏙️', '#FFD166', 'rgba(255, 209, 102, 0.15)'),
  ('business', 'Business', 'Companies, revenue, markets, and economics', '📊', '#FF8585', 'rgba(255, 133, 133, 0.15)'),
  ('sports', 'Sports', 'Athletics, records, equipment, and fandom', '⚽', '#FFB347', 'rgba(255, 179, 71, 0.15)'),
  ('gaming', 'Gaming', 'Video games, players, and virtual worlds', '🎮', '#B9A0FF', 'rgba(185, 160, 255, 0.15)'),
  ('history', 'History', 'Historical quantities, timelines, and events', '📜', '#C4A882', 'rgba(196, 168, 130, 0.15)'),
  ('nature', 'Nature', 'Ecosystems, weather, geology, and the natural world', '🌿', '#8CE6B0', 'rgba(140, 230, 176, 0.15)'),
  ('space', 'Space', 'Astronomy, distances, planets, and the universe', '🚀', '#82C8FF', 'rgba(130, 200, 255, 0.15)'),
  ('everyday', 'Everyday Life', 'Common quantities encountered in daily life', '☕', '#FFD166', 'rgba(255, 209, 102, 0.15)'),
  ('food', 'Food', 'Consumption, production, and culinary quantities', '🍕', '#FF8585', 'rgba(255, 133, 133, 0.15)'),
  ('animals', 'Animals', 'Wildlife, domesticated animals, and populations', '🐋', '#8CE6B0', 'rgba(140, 230, 176, 0.15)'),
  ('infrastructure', 'Infrastructure', 'Roads, buildings, utilities, and civil engineering', '🏗️', '#9696A5', 'rgba(150, 150, 165, 0.15)'),
  ('absurd', 'Absurd', 'Ridiculous, counterintuitive, and gloriously unhinged', '🌀', '#FF8585', 'rgba(255, 133, 133, 0.15)');

-- ============================================================
-- SEED ACHIEVEMENTS
-- ============================================================
INSERT INTO achievements (id, name, description, icon, xp_reward, rarity) VALUES
  ('bullseye', 'Bullseye', 'Get within 1.05× of the answer.', '🎯', 500, 'epic'),
  ('hot_streak', 'Hot Streak', 'Five consecutive guesses under 2×.', '🔥', 300, 'rare'),
  ('fermi_master', 'Fermi Master', 'Complete 100 guesses under 2×.', '🧪', 1000, 'legendary'),
  ('how_did_you', 'How?', 'Get within 1.1× on an Unhinged question.', '🌀', 750, 'legendary'),
  ('billionaire', 'Billionaire', 'Estimate a billion-scale quantity correctly within 2×.', '💰', 200, 'rare'),
  ('what_were_you', 'What Were You Thinking?', 'Get more than 1,000× off on any estimate.', '💥', 50, 'common'),
  ('chaos', 'Chaos', 'Three consecutive estimates worse than 100×.', '🌪️', 25, 'common'),
  ('first_guess', 'First Step', 'Submit your first estimate.', '👋', 25, 'common'),
  ('ten_questions', 'Getting Started', 'Answer 10 questions.', '📚', 100, 'common'),
  ('fifty_questions', 'Dedicated', 'Answer 50 questions.', '🏅', 250, 'rare'),
  ('century', 'Century', 'Answer 100 questions.', '💯', 500, 'epic'),
  ('perfectionist', 'Perfectionist', 'Get an exact answer (1.00×).', '✨', 1000, 'legendary'),
  ('category_master', 'Category Master', 'Answer 20 questions in a single category.', '🎓', 200, 'rare'),
  ('no_hints', 'Purist', 'Answer 10 questions without using any hints.', '🧠', 150, 'rare'),
  ('speed_demon', 'Speed Demon', 'Answer 5 questions in under 2 minutes total.', '⚡', 200, 'rare');

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Function to update user stats after an attempt
CREATE OR REPLACE FUNCTION update_user_stats_after_attempt()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_avg_log DOUBLE PRECISION;
  v_best DOUBLE PRECISION;
  v_worst DOUBLE PRECISION;
  v_under2 DOUBLE PRECISION;
  v_under5 DOUBLE PRECISION;
BEGIN
  -- Only process attempts with a user_id
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate stats
  SELECT
    COUNT(*),
    AVG(log_distance),
    MIN(factor_score),
    MAX(factor_score),
    AVG(CASE WHEN factor_score < 2.0 THEN 1.0 ELSE 0.0 END),
    AVG(CASE WHEN factor_score < 5.0 THEN 1.0 ELSE 0.0 END)
  INTO v_total, v_avg_log, v_best, v_worst, v_under2, v_under5
  FROM attempts
  WHERE user_id = NEW.user_id;

  -- Upsert user_stats
  INSERT INTO user_stats (
    user_id, total_questions, average_log_score,
    best_factor, worst_factor, pct_under_2x, pct_under_5x, updated_at
  ) VALUES (
    NEW.user_id, v_total, COALESCE(v_avg_log, 0),
    COALESCE(v_best, 999999), COALESCE(v_worst, 0),
    COALESCE(v_under2, 0), COALESCE(v_under5, 0), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_questions = EXCLUDED.total_questions,
    average_log_score = EXCLUDED.average_log_score,
    best_factor = EXCLUDED.best_factor,
    worst_factor = EXCLUDED.worst_factor,
    pct_under_2x = EXCLUDED.pct_under_2x,
    pct_under_5x = EXCLUDED.pct_under_5x,
    updated_at = NOW();

  -- Update profile XP
  UPDATE profiles
  SET xp = xp + NEW.xp_earned,
      updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_attempt_created
  AFTER INSERT ON attempts
  FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_attempt();

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();