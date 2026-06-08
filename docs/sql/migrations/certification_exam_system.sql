-- ============================================================
-- CERTIFICATION EXAM SYSTEM
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Certification exam definition (one per subscription plan)
CREATE TABLE IF NOT EXISTS certification_exams (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id              UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  title                TEXT,
  title_ar             TEXT,
  description          TEXT,
  description_ar       TEXT,
  price_egp            DECIMAL(10,2) NOT NULL DEFAULT 0,
  passing_score        INTEGER NOT NULL DEFAULT 70,
  time_limit_minutes   INTEGER,
  max_attempts         INTEGER DEFAULT 3,
  is_active            BOOLEAN DEFAULT true,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(plan_id)
);

-- 2. Questions for certification exams
CREATE TABLE IF NOT EXISTS certification_exam_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id          UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  question_type    TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'multiple_select')),
  question_text    TEXT NOT NULL,
  question_text_ar TEXT,
  options          JSONB,
  correct_answers  TEXT[],
  explanation      TEXT,
  explanation_ar   TEXT,
  points           INTEGER DEFAULT 1,
  sort_order       INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- 3. User purchases of certification exams (Kashier-linked)
CREATE TABLE IF NOT EXISTS user_certification_purchases (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id                 UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  amount_paid_egp         DECIMAL(10,2),
  kashier_session_id      TEXT,
  kashier_order_id        TEXT,
  kashier_transaction_id  TEXT,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exam_id)
);

-- 4. Certification exam attempts
CREATE TABLE IF NOT EXISTS user_certification_attempts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id          UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  purchase_id      UUID REFERENCES user_certification_purchases(id) ON DELETE SET NULL,
  answers          JSONB,
  score            DECIMAL(5,2),
  passed           BOOLEAN DEFAULT false,
  attempt_number   INTEGER NOT NULL DEFAULT 1,
  started_at       TIMESTAMPTZ DEFAULT now(),
  completed_at     TIMESTAMPTZ,
  time_spent_seconds INTEGER
);

-- 5. Issued certificates
CREATE TABLE IF NOT EXISTS certificates (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_id            UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  attempt_id         UUID REFERENCES user_certification_attempts(id) ON DELETE SET NULL,
  certificate_number TEXT UNIQUE DEFAULT 'CERT-' || upper(substr(gen_random_uuid()::text, 1, 8)),
  score              DECIMAL(5,2),
  issued_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exam_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cert_exams_plan_id ON certification_exams(plan_id);
CREATE INDEX IF NOT EXISTS idx_cert_questions_exam_id ON certification_exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_cert_purchases_user_id ON user_certification_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_cert_purchases_exam_id ON user_certification_purchases(exam_id);
CREATE INDEX IF NOT EXISTS idx_cert_purchases_session_id ON user_certification_purchases(kashier_session_id);
CREATE INDEX IF NOT EXISTS idx_cert_attempts_user_exam ON user_certification_attempts(user_id, exam_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user_id ON certificates(user_id);

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE certification_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certification_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_certification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- certification_exams: public read (active only), service role write
CREATE POLICY "cert_exams_public_read" ON certification_exams
  FOR SELECT USING (is_active = true);

CREATE POLICY "cert_exams_service_write" ON certification_exams
  FOR ALL USING (auth.role() = 'service_role');

-- certification_exam_questions: authenticated read (if they own a paid purchase), service role write
CREATE POLICY "cert_questions_read_if_paid" ON certification_exam_questions
  FOR SELECT USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM user_certification_purchases p
      WHERE p.exam_id = certification_exam_questions.exam_id
        AND p.user_id = auth.uid()
        AND p.status = 'paid'
    )
  );

CREATE POLICY "cert_questions_service_write" ON certification_exam_questions
  FOR ALL USING (auth.role() = 'service_role');

-- user_certification_purchases: users own their rows
CREATE POLICY "cert_purchases_own_read" ON user_certification_purchases
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "cert_purchases_own_insert" ON user_certification_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cert_purchases_service_update" ON user_certification_purchases
  FOR UPDATE USING (auth.role() = 'service_role');

-- user_certification_attempts: users own their rows
CREATE POLICY "cert_attempts_own" ON user_certification_attempts
  FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');

-- certificates: users can read their own
CREATE POLICY "certificates_own_read" ON certificates
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

CREATE POLICY "certificates_service_write" ON certificates
  FOR ALL USING (auth.role() = 'service_role');
