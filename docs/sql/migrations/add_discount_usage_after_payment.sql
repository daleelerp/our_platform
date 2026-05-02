-- Stores which promo was locked in at checkout so webhook/verify can count usage after payment succeeds.
ALTER TABLE user_subscriptions
ADD COLUMN IF NOT EXISTS applied_discount_id UUID REFERENCES subscription_discounts(id);

COMMENT ON COLUMN user_subscriptions.applied_discount_id IS
  'Promo discount chosen at checkout; usage counted after payment succeeds (webhook or verify).';

-- Idempotent: duplicate webhooks only increment once (INSERT ... ON CONFLICT DO NOTHING).
CREATE OR REPLACE FUNCTION record_discount_usage_after_payment(
  p_user_id UUID,
  p_subscription_id UUID,
  p_discount_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_count int;
BEGIN
  INSERT INTO user_discount_usage (user_id, discount_id, subscription_id)
  VALUES (p_user_id, p_discount_id, p_subscription_id)
  ON CONFLICT (user_id, discount_id) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  IF inserted_count > 0 THEN
    UPDATE subscription_discounts
    SET current_uses = COALESCE(current_uses, 0) + 1,
        updated_at = NOW()
    WHERE id = p_discount_id;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION record_discount_usage_after_payment(UUID, UUID, UUID) TO service_role;
