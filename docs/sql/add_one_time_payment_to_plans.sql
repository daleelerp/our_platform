-- =====================================================
-- ADD ONE-TIME PAYMENT SUPPORT TO SUBSCRIPTION PLANS
-- =====================================================

-- Add one-time payment price field
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS price_one_time_egp DECIMAL(10,2) DEFAULT 0;

-- Add payment type field to distinguish between recurring and one-time
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'recurring'; -- 'recurring' or 'one_time'

-- Add comment
COMMENT ON COLUMN subscription_plans.price_one_time_egp IS 'One-time payment price in EGP (for lifetime/permanent plans)';
COMMENT ON COLUMN subscription_plans.payment_type IS 'Payment type: recurring (monthly/yearly) or one_time (lifetime purchase)';



















