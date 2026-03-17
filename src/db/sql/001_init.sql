CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interview_status') THEN
    CREATE TYPE interview_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  candidate_email TEXT NOT NULL,
  position_title TEXT NOT NULL DEFAULT 'Network Engineer (Junior)',
  company_context TEXT NOT NULL DEFAULT '',
  status interview_status NOT NULL DEFAULT 'pending',
  access_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  recruiter_room_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  total_questions INTEGER NOT NULL DEFAULT 6 CHECK (total_questions > 0),
  max_violations INTEGER NOT NULL DEFAULT 3 CHECK (max_violations > 0),
  violation_count INTEGER NOT NULL DEFAULT 0 CHECK (violation_count >= 0),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NULL,
  finished_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  camera_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT NULL,
  user_agent TEXT NULL,
  device_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_interview_id ON interview_sessions(interview_id);

CREATE TABLE IF NOT EXISTS interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  order_no INTEGER NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT NOT NULL,
  expected_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT '',
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(interview_id, order_no)
);

CREATE INDEX IF NOT EXISTS idx_interview_questions_interview_id ON interview_questions(interview_id);

CREATE TABLE IF NOT EXISTS interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  session_id UUID NULL REFERENCES interview_sessions(id) ON DELETE SET NULL,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(interview_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_answers_interview_id ON interview_answers(interview_id);

CREATE TABLE IF NOT EXISTS interview_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  session_id UUID NULL REFERENCES interview_sessions(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'frontend',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  count_snapshot INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_violations_interview_id ON interview_violations(interview_id);
CREATE INDEX IF NOT EXISTS idx_interview_violations_created_at ON interview_violations(created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS interviews_set_updated_at ON interviews;
CREATE TRIGGER interviews_set_updated_at
BEFORE UPDATE ON interviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS interview_answers_set_updated_at ON interview_answers;
CREATE TRIGGER interview_answers_set_updated_at
BEFORE UPDATE ON interview_answers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
