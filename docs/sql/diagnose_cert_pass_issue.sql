-- =============================================================================
-- Diagnostic: why isn't daleel.erp.site@gmail.com showing as certified on the
-- dashboard after running grant_test_account_cert_ready.sql and
-- grant_test_account_cert_pass.sql?
-- =============================================================================
-- Run each SELECT below and check the output. The dashboard's "Get Certified"
-- card (DashboardContent.tsx) only flips to "Certified!" when a row exists in
-- `certificates` for (user_id, exam_id) where exam_id comes from
-- certification_exams.plan_id = the plan_id on the user's ACTIVE subscription.
-- =============================================================================

-- 1) Resolve the user
SELECT id AS user_id, email FROM auth.users WHERE email = 'daleel.erp.site@gmail.com';

-- 2) All plans whose name matches (catches duplicate/stale plan rows)
SELECT id AS plan_id, display_name_en, is_active
FROM subscription_plans
WHERE display_name_en ILIKE '%Dynamics 365 Technical Consultant Path%';

-- 3) Which plan_id is this user's ACTUAL active subscription pointing at?
-- (this is the plan_id the dashboard uses to look up the cert exam)
SELECT us.id AS subscription_id, us.plan_id, us.status, sp.display_name_en
FROM user_subscriptions us
JOIN subscription_plans sp ON sp.id = us.plan_id
WHERE us.user_id = (SELECT id FROM auth.users WHERE email = 'daleel.erp.site@gmail.com')
ORDER BY us.created_at DESC;

-- 4) certification_exams rows for any of the matching plans above
SELECT id AS exam_id, plan_id, title, is_active
FROM certification_exams
WHERE plan_id IN (
  SELECT id FROM subscription_plans
  WHERE display_name_en ILIKE '%Dynamics 365 Technical Consultant Path%'
);

-- 5) Does a certificate already exist for this user + any of those exams?
SELECT c.id, c.user_id, c.exam_id, c.certificate_number, c.score, c.issued_at
FROM certificates c
WHERE c.user_id = (SELECT id FROM auth.users WHERE email = 'daleel.erp.site@gmail.com')
  AND c.exam_id IN (
    SELECT id FROM certification_exams
    WHERE plan_id IN (
      SELECT id FROM subscription_plans
      WHERE display_name_en ILIKE '%Dynamics 365 Technical Consultant Path%'
    )
  );

-- 6) Any certification attempts recorded at all (passed or not)?
SELECT a.id, a.exam_id, a.attempt_number, a.score, a.passed, a.completed_at
FROM user_certification_attempts a
WHERE a.user_id = (SELECT id FROM auth.users WHERE email = 'daleel.erp.site@gmail.com')
ORDER BY a.completed_at DESC NULLS LAST;

-- 7) Purchase record (should exist with status='paid' after the pass script)
SELECT * FROM user_certification_purchases
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'daleel.erp.site@gmail.com');
