-- 008_runtime_ai_questions.sql
-- Index to optimize querying and sampling of AI-generated Fermi questions
CREATE INDEX IF NOT EXISTS idx_questions_is_ai_generated ON questions(is_ai_generated);
CREATE INDEX IF NOT EXISTS idx_questions_status_ai ON questions(status, is_ai_generated);
