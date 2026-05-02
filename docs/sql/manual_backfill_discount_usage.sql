-- Manual fix: discount was used in production but current_uses stayed 0 (before webhook fix).
-- Run in Supabase SQL Editor. Review results before COMMIT if you wrap in a transaction.

-- ---------------------------------------------------------------------------
-- Option A — Fast: only bump the admin counter (Uses column shows 1 / 100)
-- Does NOT add user_discount_usage (same user could apply the code again if max per user relies on that table)
-- ---------------------------------------------------------------------------
UPDATE subscription_discounts
SET
  current_uses = COALESCE(current_uses, 0) + 1,
  updated_at = NOW()
WHERE upper(trim(code)) = 'SAP40'
  AND is_active = true;

-- Verify:
-- SELECT code, current_uses, max_uses FROM subscription_discounts WHERE upper(trim(code)) = 'SAP40';


-- ---------------------------------------------------------------------------
-- Option B — Complete: counter + per-user row (if migration function exists)
-- Fill the three UUIDs, run once.
-- ---------------------------------------------------------------------------
/*
SELECT record_discount_usage_after_payment(
  'PASTE_USER_UUID'::uuid,
  'PASTE_SUBSCRIPTION_UUID'::uuid,
  'PASTE_DISCOUNT_UUID'::uuid
);
*/

-- IDs:
-- SELECT id FROM subscription_discounts WHERE upper(trim(code)) = 'SAP40';
-- SELECT id, user_id, status FROM user_subscriptions WHERE status = 'active' ORDER BY updated_at DESC LIMIT 10;
