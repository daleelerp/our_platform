-- =====================================================
-- ADD BASIC FREE SUBSCRIPTION PLAN
-- Makes basic plans free, higher plans require subscription
-- =====================================================

-- Add Basic Plan - Free tier between Explorer and Professional
INSERT INTO subscription_plans (
    name, name_ar, name_en,
    display_name_ar, display_name_en,
    description_ar, description_en,
    price_monthly_egp, price_yearly_egp,
    features, limitations,
    is_active, is_popular, sort_order
) VALUES (
    'basic', 'أساسي', 'Basic',
    'أساسي', 'Basic',
    'خطة أساسية مجانية مع ميزات إضافية. مثالية للمتعلمين الجادين.',
    'Free basic plan with additional features. Perfect for serious learners.',
    0, 0,  -- Free plan
    '["unlimited_paths", "basic_resources", "progress_tracking", "job_overview", "community_read", "learning_events", "standard_support", "monthly_hours_20"]'::JSONB,
    '{"max_paths": -1, "resources_per_milestone": 5, "monthly_hours": 20, "ai_requests": 5, "downloads": 0}'::JSONB,
    TRUE, FALSE, 2  -- Between free (1) and premium (3, will be updated to 3)
) ON CONFLICT (name) DO UPDATE SET
    price_monthly_egp = 0,
    price_yearly_egp = 0,
    sort_order = 2;

-- Update sort_order for premium plan (move it to 3)
UPDATE subscription_plans 
SET sort_order = 3 
WHERE name = 'premium';

-- Update sort_order for team plan (move it to 4)
UPDATE subscription_plans 
SET sort_order = 4 
WHERE name = 'team';

-- Note: Content tiers (free, basic, premium, enterprise) are separate from subscription plans
-- Content tiers are based on user budget, not subscription status
-- This ensures basic content tier is accessible without subscription

