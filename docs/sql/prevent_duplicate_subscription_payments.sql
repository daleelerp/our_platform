-- Prevent duplicate payment/subscription rows caused by retries or webhook re-delivery.
-- Safe to run multiple times.

-- 1) Keep only one pending checkout row per user+plan (cancel older duplicates).
WITH ranked_pending AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY user_id, plan_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.user_subscriptions
  WHERE status = 'pending'
)
UPDATE public.user_subscriptions us
SET
  status = 'cancelled',
  cancelled_at = COALESCE(cancelled_at, NOW()),
  updated_at = NOW()
FROM ranked_pending rp
WHERE us.id = rp.id
  AND rp.rn > 1;

-- 2) Remove duplicate payment transaction rows by provider transaction id.
WITH ranked_payments AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY provider_transaction_id
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM public.payment_transactions
  WHERE provider_transaction_id IS NOT NULL
)
DELETE FROM public.payment_transactions pt
USING ranked_payments rp
WHERE pt.id = rp.id
  AND rp.rn > 1;

-- 3) Enforce one pending checkout per user+plan.
CREATE UNIQUE INDEX IF NOT EXISTS ux_user_subscriptions_one_pending_per_plan
  ON public.user_subscriptions (user_id, plan_id)
  WHERE status = 'pending';

-- 4) Enforce idempotency for payment webhooks/retries.
CREATE UNIQUE INDEX IF NOT EXISTS ux_payment_transactions_provider_txn
  ON public.payment_transactions (provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
