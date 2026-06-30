-- =============================================================================
-- Make a test account pass the certification exam itself and get a certificate
-- issued, without going through the UI exam flow.
-- =============================================================================
-- Run in Supabase Dashboard -> SQL Editor (postgres / service role).
--
-- This mirrors exactly what api/certification/submit/route.ts does on a passing
-- submission:
--   1. Ensures a 'paid' user_certification_purchases row exists (FK + access).
--   2. Inserts a passing user_certification_attempts row (score=100, passed=true).
--   3. Inserts the resulting certificates row.
--
-- Run docs/sql/grant_test_account_cert_ready.sql FIRST if this account hasn't
-- completed all videos + checkpoints yet -- that script makes the account
-- eligible to open the exam; this one simulates actually passing it.
--
-- Idempotent: if a certificate already exists for this user+exam, it does
-- nothing (certificates has a UNIQUE(user_id, exam_id) constraint, same as
-- the submit route's "Already certified" check).
-- =============================================================================

DO $$
DECLARE
  target_email TEXT := 'daleel.erp.site@gmail.com';
  target_plan_name TEXT := 'Dynamics 365 Technical Consultant Path (Complete)';
  v_uid UUID;
  v_pid UUID;
  v_exam_id UUID;
  v_purchase_id UUID;
  v_attempt_id UUID;
  v_next_attempt INT;
BEGIN
  -- Resolve user
  SELECT id INTO v_uid FROM auth.users WHERE email = target_email;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'No user found with email %', target_email;
  END IF;

  -- Resolve plan
  SELECT id INTO v_pid FROM subscription_plans WHERE display_name_en = target_plan_name;
  IF v_pid IS NULL THEN
    SELECT id INTO v_pid FROM subscription_plans WHERE display_name_en ILIKE '%' || target_plan_name || '%';
  END IF;
  IF v_pid IS NULL THEN
    RAISE EXCEPTION 'No plan found matching %', target_plan_name;
  END IF;

  -- Resolve the plan's certification exam
  SELECT id INTO v_exam_id FROM certification_exams WHERE plan_id = v_pid AND is_active = true;
  IF v_exam_id IS NULL THEN
    RAISE EXCEPTION 'No active certification_exams row for plan %', v_pid;
  END IF;

  -- Already certified? Nothing to do.
  IF EXISTS (SELECT 1 FROM certificates WHERE user_id = v_uid AND exam_id = v_exam_id) THEN
    RAISE NOTICE 'User % already has a certificate for exam % — skipping.', target_email, v_exam_id;
    RETURN;
  END IF;

  -- Ensure a paid purchase record exists (FK target for the attempt + matches
  -- the free completion-gated access model)
  SELECT id INTO v_purchase_id
  FROM user_certification_purchases WHERE user_id = v_uid AND exam_id = v_exam_id;

  IF v_purchase_id IS NULL THEN
    INSERT INTO user_certification_purchases (user_id, exam_id, amount_paid_egp, status)
    VALUES (v_uid, v_exam_id, 0, 'paid')
    RETURNING id INTO v_purchase_id;
  END IF;

  SELECT COALESCE(MAX(attempt_number), 0) + 1 INTO v_next_attempt
  FROM user_certification_attempts WHERE user_id = v_uid AND exam_id = v_exam_id;

  INSERT INTO user_certification_attempts (
    user_id, exam_id, purchase_id, attempt_number, score, passed,
    answers, completed_at
  ) VALUES (
    v_uid, v_exam_id, v_purchase_id, v_next_attempt, 100, true,
    '[]'::jsonb, NOW()
  )
  RETURNING id INTO v_attempt_id;

  INSERT INTO certificates (user_id, exam_id, score)
  VALUES (v_uid, v_exam_id, 100);

  RAISE NOTICE 'Certificate issued to % for exam % (attempt #%).', target_email, v_exam_id, v_next_attempt;
END $$;
