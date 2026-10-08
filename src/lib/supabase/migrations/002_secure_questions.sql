-- 002_secure_questions.sql
-- Revoke public read access to the questions table to prevent reference_answer leakage
DROP POLICY IF EXISTS "Questions are publicly readable" ON questions;
DROP POLICY IF EXISTS "Questions are viewable by everyone" ON questions;

-- Note: Server routes using supabaseAdmin (Service Role) will bypass RLS.
-- This forces the application to route all question requests through secure server endpoints.
