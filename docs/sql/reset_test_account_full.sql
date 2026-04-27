-- =============================================================================
-- Full reset: subscriptions, enrollments, usage, payments, learning progress
-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (postgres / service role).
--
-- Before running:
--   1. Replace YOUR_TEST_EMAIL below with the account you use for QA.
--   2. Optionally run STEP 0 (preview only) to see rows that will be affected.
--
-- This does NOT delete auth.users or user_profiles — only app state tied to
-- plans, paths, progress, and billing history for that user.
--
-- If a statement fails because a table does not exist in your project, remove
-- or comment out that DELETE and run again.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 0 (optional): Preview target user id
-- -----------------------------------------------------------------------------
/*
SELECT id, email, created_at
FROM auth.users
WHERE email = 'YOUR_TEST_EMAIL@example.com';
*/

-- -----------------------------------------------------------------------------
-- STEP 1: Replace email, then run the block below as a single statement.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  uid uuid;
  target_email text := 'themagdy.site@gmail.com';
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = target_email LIMIT 1;
  IF uid IS NULL THEN
    RAISE EXCEPTION 'No auth.users row for email: %', target_email;
  END IF;

  RAISE NOTICE 'Resetting learning & billing state for user % (%)', uid, target_email;

  -- Payments & discounts (must run before deleting user_subscriptions)
  DELETE FROM payment_transactions WHERE user_id = uid;

  DELETE FROM user_discount_usage
  WHERE user_id = uid
     OR subscription_id IN (SELECT id FROM user_subscriptions WHERE user_id = uid);

  DELETE FROM referral_tracking
  WHERE subscription_id IN (SELECT id FROM user_subscriptions WHERE user_id = uid);

  -- Progress & sessions (tables may vary by deployment)
  DELETE FROM user_video_progress WHERE user_id = uid;
  DELETE FROM user_quiz_attempts WHERE user_id = uid;
  DELETE FROM user_milestone_progress WHERE user_id = uid;
  DELETE FROM user_resource_interactions WHERE user_id = uid;
  DELETE FROM external_test_results WHERE user_id = uid;
  DELETE FROM user_learning_analytics WHERE user_id = uid;
  DELETE FROM ai_progress_reports WHERE user_id = uid;
  DELETE FROM user_activity_logs WHERE user_id = uid;
  DELETE FROM user_sessions WHERE user_id = uid;

  -- Paths
  DELETE FROM path_enrollments WHERE user_id = uid;
  DELETE FROM path_requests WHERE user_id = uid;

  -- Subscriptions & limits
  DELETE FROM subscription_usage WHERE user_id = uid;
  DELETE FROM user_subscriptions WHERE user_id = uid;

  -- Path finder / preferences
  DELETE FROM user_path_interactions WHERE user_id = uid;
  DELETE FROM user_path_preferences WHERE user_id = uid;

  RAISE NOTICE 'Done. User can re-test checkout and enrollments from a clean slate.';
END $$;

-- -----------------------------------------------------------------------------
-- STEP 2 (optional): Attach free plan once if none exists (multiple subs allowed)
-- -----------------------------------------------------------------------------
/*
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'YOUR_TEST_EMAIL@example.com' LIMIT 1;
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
