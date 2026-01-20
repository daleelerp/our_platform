-- =====================================================
-- PLAN RENAMING FOR PROOF OF CONCEPT
-- =====================================================
-- Use these SQL commands to rename plans to align with 
-- your marketing messaging and proof of concept strategy

-- =====================================================
-- Option 1: SKILL-BASED NAMING
-- =====================================================
-- This naming emphasizes learning progression
-- Beginner → Professional → Enterprise Growth

UPDATE subscription_plans 
SET 
    display_name_en = 'Skill Starter',
    display_name_ar = 'بداية المهارات'
WHERE name = 'free';

UPDATE subscription_plans 
SET 
    display_name_en = 'Professional Mastery',
    display_name_ar = 'إتقان احترافي'
WHERE name = 'premium';

UPDATE subscription_plans 
SET 
    display_name_en = 'Enterprise Training',
    display_name_ar = 'تدريب مؤسسي'
WHERE name = 'team';

-- =====================================================
-- Option 2: PROFESSION-BASED NAMING  
-- =====================================================
-- This naming focuses on career impact
-- Junior → Expert → Corporate

-- To use this, replace the UPDATE statements above with:

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Junior Learner',
--     display_name_ar = 'متعلم جونيور'
-- WHERE name = 'free';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Certified Expert',
--     display_name_ar = 'خبير معتمد'
-- WHERE name = 'premium';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Corporate Solutions',
--     display_name_ar = 'حلول مؤسسية'
-- WHERE name = 'team';

-- =====================================================
-- Option 3: JOURNEY-BASED NAMING
-- =====================================================
-- This naming focuses on the learning journey
-- Explorer → Achiever → Visionary

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Explorer Access',
--     display_name_ar = 'وصول المستكشف'
-- WHERE name = 'free';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Achievement Bundle',
--     display_name_ar = 'حزمة الإنجاز'
-- WHERE name = 'premium';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Visionary Plus',
--     display_name_ar = 'رؤية بلس'
-- WHERE name = 'team';

-- =====================================================
-- Option 4: TIME-BASED NAMING
-- =====================================================
-- This naming focuses on commitment and access time
-- Trial → Unlimited → Corporate

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Limited Trial',
--     display_name_ar = 'تجربة محدودة'
-- WHERE name = 'free';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Unlimited Access',
--     display_name_ar = 'وصول غير محدود'
-- WHERE name = 'premium';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Corporate Packages',
--     display_name_ar = 'حزم مؤسسية'
-- WHERE name = 'team';

-- =====================================================
-- Verify the changes
-- =====================================================

SELECT 
    id,
    name,
    display_name_en,
    display_name_ar,
    price_monthly_egp,
    price_yearly_egp,
    price_one_time_egp,
    is_active
FROM subscription_plans
ORDER BY sort_order;

-- =====================================================
-- REVERT TO ORIGINAL (if needed)
-- =====================================================

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Explorer',
--     display_name_ar = 'مستكشف'
-- WHERE name = 'free';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Professional',
--     display_name_ar = 'محترف'
-- WHERE name = 'premium';

-- UPDATE subscription_plans 
-- SET 
--     display_name_en = 'Enterprise',
--     display_name_ar = 'مؤسسة'
-- WHERE name = 'team';
