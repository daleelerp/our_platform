-- Remove user_subscriptions rows for "Oracle ERP Technical Foundation" (test cleanup).
-- Run in Supabase Dashboard → SQL Editor.
--
-- STEP 1: Find the plan id and any matching subscriptions (inspect before delete)
SELECT sp.id AS plan_id,
       sp.name,
       sp.display_name_en,
       us.id AS subscription_id,
       us.user_id,
       us.status,
       us.created_at
FROM subscription_plans sp
LEFT JOIN user_subscriptions us ON us.plan_id = sp.id
WHERE sp.display_name_en ILIKE '%Oracle ERP Technical Foundation%'
   OR sp.display_name_en ILIKE '%Technical Foundation%'
   OR sp.name ILIKE '%technical_foundation%';

-- STEP 2: Delete only YOUR subscriptions for that plan (replace USER_UUID)
-- Get your user id from: Supabase → Authentication → Users, or from public.user_profiles
/*
DELETE FROM user_subscriptions
WHERE user_id = 'USER_UUID_HERE'
  AND plan_id IN (
    SELECT id
    FROM subscription_plans
    WHERE display_name_en ILIKE '%Oracle ERP Technical Foundation%'
       OR (display_name_en ILIKE '%Technical Foundation%' AND display_name_en ILIKE '%ERP%')
  );
*/

-- STEP 3 (optional): If related discount usage rows reference these subscriptions, delete them first if FK blocks delete:
/*
DELETE FROM user_discount_usage
WHERE subscription_id IN (
  SELECT us.id
  FROM user_subscriptions us
  JOIN subscription_plans sp ON sp.id = us.plan_id
  WHERE us.user_id = 'USER_UUID_HERE'
    AND (
      sp.display_name_en ILIKE '%Oracle ERP Technical Foundation%'
      OR (sp.display_name_en ILIKE '%Technical Foundation%' AND sp.display_name_en ILIKE '%ERP%')
    )
);

DELETE FROM user_subscriptions
WHERE user_id = 'USER_UUID_HERE'
  AND plan_id IN (
    SELECT id FROM subscription_plans
    WHERE display_name_en ILIKE '%Oracle ERP Technical Foundation%'
       OR (display_name_en ILIKE '%Technical Foundation%' AND display_name_en ILIKE '%ERP%')
  );
*/

-- -----------------------------------------------------------------------------
-- Oracle Fusion Technical Consultant – Complete Path
-- Plan id: 79ca5d66-3021-42f0-bb3e-f21ef70ac969
--
-- Pending rows still grant path access by design until payment completes or you delete the rows.
--
-- Option A — delete by email + plan id (recommended). Uncomment then run alone:
/*
DELETE FROM user_subscriptions us
USING subscription_plans sp
WHERE us.plan_id = sp.id
  AND us.user_id = (SELECT id FROM auth.users WHERE email = 'themagdy.site@gmail.com')
  AND sp.id = '79ca5d66-3021-42f0-bb3e-f21ef70ac969';
*/

-- Option B — if Option A fails on FK: delete dependents first, then subscriptions.
/*
DELETE FROM user_discount_usage
WHERE subscription_id IN (
  SELECT id FROM user_subscriptions
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'themagdy.site@gmail.com')
    AND plan_id = '79ca5d66-3021-42f0-bb3e-f21ef70ac969'
);

DELETE FROM payment_transactions
WHERE subscription_id IN (
  SELECT id FROM user_subscriptions
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'themagdy.site@gmail.com')
    AND plan_id = '79ca5d66-3021-42f0-bb3e-f21ef70ac969'
);

DELETE FROM user_subscriptions
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'themagdy.site@gmail.com')
  AND plan_id = '79ca5d66-3021-42f0-bb3e-f21ef70ac969';
*/
