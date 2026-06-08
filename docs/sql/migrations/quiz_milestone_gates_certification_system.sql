-- ============================================================
-- Migration: Quiz Milestone Gates & Certification System
-- Date: 2026-06-08
-- ============================================================

-- 1. Add path-level quiz support (path final quizzes)
ALTER TABLE quizzes
ADD COLUMN IF NOT EXISTS path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_quizzes_path_id ON quizzes(path_id);

-- Allow quiz to belong to either a milestone OR a path (not both necessarily)
-- milestone_id remains for milestone-level quizzes, path_id for path-level final quizzes

-- 2. Certification Exams (one per ERP system — the top-level "plan")
CREATE TABLE IF NOT EXISTS certification_exams (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  erp_system_id           UUID REFERENCES erp_systems(id) ON DELETE CASCADE,
  quiz_id                 UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  title                   VARCHAR(500) NOT NULL,
  title_ar                VARCHAR(500),
  description             TEXT,
  description_ar          TEXT,
  price_egp               DECIMAL(10,2) NOT NULL DEFAULT 0,
  passing_score           DECIMAL(5,2) NOT NULL DEFAULT 70.0,
  time_limit_minutes      INTEGER DEFAULT 120,
  max_attempts            INTEGER DEFAULT 3,
  validity_years          INTEGER DEFAULT 2,
  certificate_template_url TEXT,
  is_active               BOOLEAN DEFAULT TRUE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certification_exams_erp_system ON certification_exams(erp_system_id);
CREATE INDEX IF NOT EXISTS idx_certification_exams_is_active ON certification_exams(is_active);

-- 3. Certification Purchases (payment record granting exam access)
CREATE TABLE IF NOT EXISTS certification_purchases (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_exam_id    UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  payment_transaction_id   UUID REFERENCES payment_transactions(id),
  status                   VARCHAR(20) DEFAULT 'pending'
                             CHECK (status IN ('pending','paid','failed','refunded')),
  attempts_used            INTEGER DEFAULT 0,
  attempts_allowed         INTEGER DEFAULT 3,
  purchased_at             TIMESTAMPTZ,
  expires_at               TIMESTAMPTZ,  -- purchase valid for N months after payment
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, certification_exam_id)
);

CREATE INDEX IF NOT EXISTS idx_cert_purchases_user ON certification_purchases(user_id);

-- 4. User Certifications (issued after passing the exam)
CREATE TABLE IF NOT EXISTS user_certifications (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  certification_exam_id    UUID NOT NULL REFERENCES certification_exams(id) ON DELETE CASCADE,
  quiz_attempt_id          UUID REFERENCES user_quiz_attempts(id),
  payment_transaction_id   UUID REFERENCES payment_transactions(id),
  score                    DECIMAL(5,2) NOT NULL,
  is_passed                BOOLEAN DEFAULT FALSE,
  certificate_number       VARCHAR(100) UNIQUE DEFAULT 'CERT-' || upper(substring(gen_random_uuid()::text, 1, 8)),
  certificate_url          TEXT,
  issued_at                TIMESTAMPTZ DEFAULT NOW(),
  expires_at               TIMESTAMPTZ,
  is_valid                 BOOLEAN DEFAULT TRUE,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_certifications_user ON user_certifications(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_certifications_passed
  ON user_certifications(user_id, certification_exam_id)
  WHERE is_passed = TRUE;

-- ============================================================
-- RLS Policies
-- ============================================================

-- certification_exams: anyone can read active ones
ALTER TABLE certification_exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certification_exams_public_read" ON certification_exams;
CREATE POLICY "certification_exams_public_read" ON certification_exams
  FOR SELECT USING (is_active = TRUE);

-- certification_purchases: users manage their own
ALTER TABLE certification_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certification_purchases_own_select" ON certification_purchases;
CREATE POLICY "certification_purchases_own_select" ON certification_purchases
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "certification_purchases_own_insert" ON certification_purchases;
CREATE POLICY "certification_purchases_own_insert" ON certification_purchases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "certification_purchases_own_update" ON certification_purchases;
CREATE POLICY "certification_purchases_own_update" ON certification_purchases
  FOR UPDATE USING (auth.uid() = user_id);

-- user_certifications: users view/insert their own
ALTER TABLE user_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_certifications_own_select" ON user_certifications;
CREATE POLICY "user_certifications_own_select" ON user_certifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_certifications_own_insert" ON user_certifications;
CREATE POLICY "user_certifications_own_insert" ON user_certifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Extend payment_transactions.type to include 'certification'
-- (type is VARCHAR so no enum change needed — just document it)
-- Allowed values: 'subscription', 'renewal', 'upgrade', 'refund', 'certification'
-- ============================================================

-- ============================================================
-- Helper: check if user has purchased a certification exam
-- ============================================================
CREATE OR REPLACE FUNCTION has_cert_exam_access(
  p_user_id UUID,
  p_exam_id UUID
) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM certification_purchases
    WHERE user_id = p_user_id
      AND certification_exam_id = p_exam_id
      AND status = 'paid'
      AND (expires_at IS NULL OR expires_at > NOW())
      AND attempts_used < attempts_allowed
  );
$$;
