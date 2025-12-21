-- =====================================================
-- ADD ERP PROVIDER IDS TO SUBSCRIPTION PLANS
-- Allows plans to be directly associated with ERP providers
-- =====================================================

-- Add erp_provider_ids column to store array of provider UUIDs
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS erp_provider_ids JSONB DEFAULT '[]'::JSONB;

-- Add index for performance when filtering by provider
CREATE INDEX IF NOT EXISTS idx_subscription_plans_erp_provider_ids 
ON subscription_plans USING GIN (erp_provider_ids);

-- Add comment
COMMENT ON COLUMN subscription_plans.erp_provider_ids IS 'Array of ERP provider IDs that this plan is associated with. Empty array means plan is available for all providers. Used for filtering plans on pricing page.';

