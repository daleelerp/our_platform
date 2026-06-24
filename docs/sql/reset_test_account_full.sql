-- =============================================================================
-- Full reset: subscriptions, enrollments, certifications, usage, payments,
-- feedback, and learning progress — for a single test account.
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres / service role).
--
-- Before running:
--   1. Replace target_email below if testing a different account.
--   2. Optionally run STEP 0 (preview only) to see the target user id.
--
-- This does NOT delete auth.users or user_profiles — onboarding answers
-- (full_name, country, industry, experience_level, onboarding_completed, etc.)
-- are left untouched, so the account looks like a freshly onboarded user who
-- never picked a plan or started a path.
--
-- Every DELETE is guarded with to_regclass(...), so statements for tables that
-- don't exist in this project are silently skipped instead of erroring.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0 (optional): Preview target user id
-- -----------------------------------------------------------------------------
/*
SELECT id, email, created_at
FROM auth.users
WHERE email = 'daleel.erp.site@gmail.com';
*/

-- -----------------------------------------------------------------------------
-- STEP 1: Run the block below as a single statement.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid;
  target_email text := 'daleel.erp.site@gmail.com';
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for email: %', target_email;
  END IF;

  RAISE NOTICE 'Resetting learning & billing state for user % (%)', uid, target_email;

  -- Certification system (delete children before parents to satisfy FKs).
  -- Two cert schema variants exist across migrations; guards make this safe
  -- regardless of which one is actually deployed.
  IF to_regclass('public.certificates') IS NOT NULL THEN
    DELETE FROM certificates WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_certification_attempts') IS NOT NULL THEN
    DELETE FROM user_certification_attempts WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_certification_purchases') IS NOT NULL THEN
    DELETE FROM user_certification_purchases WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_certifications') IS NOT NULL THEN
    DELETE FROM user_certifications WHERE user_id = uid;
  END IF;
  IF to_regclass('public.certification_purchases') IS NOT NULL THEN
    DELETE FROM certification_purchases WHERE user_id = uid;
  END IF;

  -- Student feedback (tied to plan purchases)
  IF to_regclass('public.student_feedback_reviews') IS NOT NULL THEN
    DELETE FROM student_feedback_reviews WHERE user_id = uid;
  END IF;
  IF to_regclass('public.student_feedback_requests') IS NOT NULL THEN
    DELETE FROM student_feedback_requests WHERE user_id = uid;
  END IF;

  -- Payments & discounts (must run before deleting user_subscriptions)
  IF to_regclass('public.payment_transactions') IS NOT NULL THEN
    DELETE FROM payment_transactions WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_discount_usage') IS NOT NULL THEN
    DELETE FROM user_discount_usage
    WHERE user_id = uid
       OR subscription_id IN (SELECT id FROM user_subscriptions WHERE user_id = uid);
  END IF;
  IF to_regclass('public.referral_tracking') IS NOT NULL THEN
    DELETE FROM referral_tracking
    WHERE subscription_id IN (SELECT id FROM user_subscriptions WHERE user_id = uid);
  END IF;

  -- Team plan membership (only this user's membership row, not shared teams)
  IF to_regclass('public.team_members') IS NOT NULL THEN
    DELETE FROM team_members WHERE user_id = uid;
  END IF;

  -- Progress & sessions (tables may vary by deployment)
  IF to_regclass('public.user_video_progress') IS NOT NULL THEN
    DELETE FROM user_video_progress WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_quiz_attempts') IS NOT NULL THEN
    DELETE FROM user_quiz_attempts WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_milestone_progress') IS NOT NULL THEN
    DELETE FROM user_milestone_progress WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_resource_interactions') IS NOT NULL THEN
    DELETE FROM user_resource_interactions WHERE user_id = uid;
  END IF;
  IF to_regclass('public.external_test_results') IS NOT NULL THEN
    DELETE FROM external_test_results WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_learning_analytics') IS NOT NULL THEN
    DELETE FROM user_learning_analytics WHERE user_id = uid;
  END IF;
  IF to_regclass('public.ai_progress_reports') IS NOT NULL THEN
    DELETE FROM ai_progress_reports WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_activity_logs') IS NOT NULL THEN
    DELETE FROM user_activity_logs WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_sessions') IS NOT NULL THEN
    DELETE FROM user_sessions WHERE user_id = uid;
  END IF;

  -- Paths
  IF to_regclass('public.path_enrollments') IS NOT NULL THEN
    DELETE FROM path_enrollments WHERE user_id = uid;
  END IF;
  IF to_regclass('public.path_requests') IS NOT NULL THEN
    DELETE FROM path_requests WHERE user_id = uid;
  END IF;

  -- Subscriptions & limits
  IF to_regclass('public.subscription_usage') IS NOT NULL THEN
    DELETE FROM subscription_usage WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_subscriptions') IS NOT NULL THEN
    DELETE FROM user_subscriptions WHERE user_id = uid;
  END IF;

  -- Path finder / preferences
  IF to_regclass('public.user_path_interactions') IS NOT NULL THEN
    DELETE FROM user_path_interactions WHERE user_id = uid;
  END IF;
  IF to_regclass('public.user_path_preferences') IS NOT NULL THEN
    DELETE FROM user_path_preferences WHERE user_id = uid;
  END IF;

  RAISE NOTICE 'Done. % (%) now looks like a freshly onboarded user — profile and onboarding answers were left untouched.', target_email, uid;
END $$;

-- -----------------------------------------------------------------------------
-- STEP 2 (optional): Attach free plan once if none exists (multiple subs allowed)
-- -----------------------------------------------------------------------------
/*
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'daleel.erp.site@gmail.com' LIMIT 1;
  IF uid IS NULL THEN RETURN; END IF;
  INSERT INTO user_subscriptions (user_id, plan_id, status, billing_cycle)
  SELECT uid, sp.id, 'active', 'monthly'
  FROM subscription_plans sp
  WHERE sp.name = 'free'
    AND NOT EXISTS (
      SELECT 1 FROM user_subscriptions us WHERE us.user_id = uid AND us.plan_id = sp.id
    )
  LIMIT 1;
END $$;
*/
