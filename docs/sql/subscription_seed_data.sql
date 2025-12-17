-- =====================================================
-- DALEEL SUBSCRIPTION SEED DATA
-- Egypt Market - EGP Pricing
-- =====================================================

-- =====================================================
-- SUBSCRIPTION FEATURES
-- =====================================================

INSERT INTO subscription_features (key, name_ar, name_en, description_ar, description_en, icon, category, sort_order) VALUES
-- Learning Features
('single_path', 'مسار تعليمي واحد', 'Single Learning Path', 'الوصول لمسار تعليمي واحد في نفس الوقت', 'Access one learning path at a time', '📚', 'learning', 1),
('unlimited_paths', 'مسارات غير محدودة', 'Unlimited Paths', 'الوصول لجميع المسارات التعليمية', 'Access all learning paths simultaneously', '🎓', 'learning', 2),
('basic_resources', 'موارد أساسية', 'Basic Resources', 'أول 5 موارد في كل مرحلة', 'First 5 resources per milestone', '📖', 'learning', 3),
('all_resources', 'جميع الموارد', 'All Resources', 'جميع الموارد في كل مرحلة', 'All resources in every milestone unlocked', '📚', 'learning', 4),
('offline_download', 'تحميل للعمل بدون انترنت', 'Offline Downloads', 'حمّل الموارد للدراسة بدون انترنت', 'Download resources for offline study', '📥', 'learning', 5),
('progress_tracking', 'تتبع التقدم الأساسي', 'Basic Progress Tracking', 'تتبع تقدمك في المسار', 'Track your progress through paths', '📊', 'learning', 6),
('advanced_progress', 'تتبع التقدم المتقدم', 'Advanced Progress', 'تحليلات مفصلة وإحصائيات التعلم', 'Detailed analytics and learning stats', '📈', 'learning', 7),
('skill_tests', 'اختبارات المهارات', 'Skill Tests', 'اختبر معرفتك مع اختبارات تفاعلية', 'Test your knowledge with interactive quizzes', '📝', 'learning', 8),

-- AI Features
('ai_personalization', 'تخصيص بالذكاء الاصطناعي', 'AI Personalization', 'مسارات مخصصة حسب أسلوب تعلمك', 'Paths customized to your learning style', '🤖', 'ai', 10),
('ai_chat', 'مساعد الذكاء الاصطناعي', 'AI Chat Assistant', 'دردش مع دليل للمساعدة في رحلتك', 'Chat with Daleel for guidance', '💬', 'ai', 11),
('ai_recommendations', 'توصيات ذكية', 'Smart Recommendations', 'اقتراحات موارد مخصصة لك', 'Personalized resource suggestions', '✨', 'ai', 12),

-- Career Features
('job_overview', 'نظرة عامة على سوق العمل', 'Job Market Overview', 'معلومات عامة عن الوظائف المتاحة', 'General job market information', '💼', 'career', 20),
('detailed_salaries', 'بيانات الرواتب التفصيلية', 'Detailed Salary Data', 'رواتب مفصلة حسب الشركة والخبرة', 'Detailed salaries by company and experience', '💰', 'career', 21),
('company_profiles', 'ملفات الشركات', 'Company Profiles', 'معلومات عن الشركات وأنماط التوظيف', 'Company info and hiring patterns', '🏢', 'career', 22),
('interview_guides', 'أدلة المقابلات', 'Interview Guides', 'استعد للمقابلات مع أدلة متخصصة', 'Prepare for interviews with specialized guides', '🎯', 'career', 23),
('career_insights', 'رؤى مهنية أسبوعية', 'Weekly Career Insights', 'تحديثات أسبوعية عن سوق العمل', 'Weekly job market updates via email', '📧', 'career', 24),

-- Community Features
('community_read', 'قراءة المنتدى', 'Community Read Access', 'اقرأ مناقشات المجتمع', 'Read community discussions', '👀', 'community', 30),
('community_full', 'مشاركة كاملة في المنتدى', 'Full Community Access', 'شارك في المناقشات واطرح الأسئلة', 'Participate in discussions and ask questions', '💬', 'community', 31),
('learning_events', 'فعاليات التعلم', 'Learning Events', 'انضم لفعاليات التعلم الجماعي', 'Join community learning events', '🎪', 'community', 32),

-- Support Features
('standard_support', 'دعم عادي', 'Standard Support', 'دعم عبر البريد الإلكتروني', 'Email support', '📧', 'support', 40),
('priority_support', 'دعم أولوية', 'Priority Support', 'دعم سريع ومخصص', 'Fast and dedicated support', '⚡', 'support', 41),
('dedicated_manager', 'مدير نجاح مخصص', 'Dedicated Success Manager', 'مدير مخصص لفريقك', 'Dedicated manager for your team', '👨‍💼', 'support', 42),

-- Team Features
('team_dashboard', 'لوحة تحكم الفريق', 'Team Dashboard', 'تتبع تقدم فريقك', 'Track your team progress', '📊', 'team', 50),
('custom_paths', 'مسارات مخصصة', 'Custom Paths', 'أنشئ مسارات مخصصة لفريقك', 'Create custom paths for your team', '🛠️', 'team', 51),
('bulk_management', 'إدارة جماعية', 'Bulk User Management', 'أضف وأدر المستخدمين بسهولة', 'Easily add and manage users', '👥', 'team', 52),
('manager_reports', 'تقارير للمدراء', 'Manager Reports', 'تقارير شهرية عن أداء الفريق', 'Monthly team performance reports', '📋', 'team', 53),
('invoice_billing', 'فوترة بالفواتير', 'Invoice Billing', 'ادفع بالفواتير بدلاً من البطاقة', 'Pay by invoice instead of card', '🧾', 'team', 54),

-- Other
('no_ads', 'بدون إعلانات', 'No Ads', 'تجربة خالية من الإعلانات', 'Ad-free experience', '🚫', 'other', 60),
('early_access', 'وصول مبكر', 'Early Access', 'وصول مبكر للمسارات الجديدة', 'Early access to new paths', '🚀', 'other', 61),
('monthly_hours_10', '10 ساعات شهرياً', '10 Hours Monthly', 'حد أقصى 10 ساعات تعلم شهرياً', 'Maximum 10 learning hours per month', '⏰', 'other', 62),
('unlimited_hours', 'ساعات غير محدودة', 'Unlimited Hours', 'تعلم بدون حدود زمنية', 'Learn without time limits', '♾️', 'other', 63);

-- =====================================================
-- SUBSCRIPTION PLANS
-- =====================================================

-- Free Plan - Explorer (مستكشف)
INSERT INTO subscription_plans (
    name, name_ar, name_en,
    display_name_ar, display_name_en,
    description_ar, description_en,
    price_monthly_egp, price_yearly_egp,
    features, limitations,
    is_active, is_popular, sort_order
) VALUES (
    'free', 'مجاني', 'Free',
    'مستكشف', 'Explorer',
    'ابدأ رحلتك في عالم ERP مجاناً. مثالي للمستكشفين الجدد.',
    'Start your ERP journey for free. Perfect for new explorers.',
    0, 0,
    '["single_path", "basic_resources", "progress_tracking", "job_overview", "community_read", "learning_events", "standard_support", "monthly_hours_10"]'::JSONB,
    '{"max_paths": 1, "resources_per_milestone": 5, "monthly_hours": 10, "ai_requests": 0, "downloads": 0}'::JSONB,
    TRUE, FALSE, 1
);

-- Premium Plan - Professional (محترف) - One-Time Payment
INSERT INTO subscription_plans (
    name, name_ar, name_en,
    display_name_ar, display_name_en,
    description_ar, description_en,
    price_monthly_egp, price_yearly_egp,
    price_one_time_egp, payment_type,
    features, limitations,
    is_active, is_popular, sort_order
) VALUES (
    'premium', 'بريميوم', 'Premium',
    'محترف', 'Professional',
    'استثمر في مستقبلك المهني. كل ما تحتاجه للتميز في عالم ERP.',
    'Invest in your career. Everything you need to excel in ERP.',
    0, 0,
    1799, 'one_time',
    '["unlimited_paths", "all_resources", "advanced_progress", "skill_tests", "offline_download", "ai_personalization", "ai_chat", "ai_recommendations", "detailed_salaries", "company_profiles", "interview_guides", "career_insights", "community_full", "learning_events", "priority_support", "no_ads", "early_access", "unlimited_hours"]'::JSONB,
    '{"max_paths": -1, "resources_per_milestone": -1, "monthly_hours": -1, "ai_requests": -1, "downloads": -1}'::JSONB,
    TRUE, TRUE, 2
);

-- Team Plan - Enterprise (مؤسسة)
INSERT INTO subscription_plans (
    name, name_ar, name_en,
    display_name_ar, display_name_en,
    description_ar, description_en,
    price_monthly_egp, price_yearly_egp,
    price_per_user_egp, min_users,
    features, limitations,
    is_active, is_popular, sort_order
) VALUES (
    'team', 'فريق', 'Team',
    'مؤسسة', 'Enterprise',
    'الحل الأمثل للشركات. درّب فريقك بكفاءة وتتبع تقدمهم.',
    'The ultimate solution for companies. Train your team efficiently.',
    NULL, NULL,
    149, 5,
    '["unlimited_paths", "all_resources", "advanced_progress", "skill_tests", "offline_download", "ai_personalization", "ai_chat", "ai_recommendations", "detailed_salaries", "company_profiles", "interview_guides", "career_insights", "community_full", "learning_events", "dedicated_manager", "no_ads", "early_access", "unlimited_hours", "team_dashboard", "custom_paths", "bulk_management", "manager_reports", "invoice_billing"]'::JSONB,
    '{"max_paths": -1, "resources_per_milestone": -1, "monthly_hours": -1, "ai_requests": -1, "downloads": -1}'::JSONB,
    TRUE, FALSE, 3
);

-- =====================================================
-- LAUNCH DISCOUNTS
-- =====================================================

-- Founders Club - Beta Launch
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles,
    valid_until, max_uses,
    requires_first_subscription
) VALUES (
    'FOUNDERS2024',
    'نادي المؤسسين',
    'Founders Club',
    'fixed', 99,  -- Fixed price of 99 EGP instead of 179
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['monthly'],
    '2024-12-31 23:59:59+02',
    1000,
    TRUE
);

-- Student Discount
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles,
    max_uses_per_user
) VALUES (
    'STUDENT50',
    'خصم الطلاب',
    'Student Discount',
    'percentage', 50,
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['monthly', 'yearly'],
    1
);

-- Ramadan Special
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles,
    valid_from, valid_until,
    is_active
) VALUES (
    'RAMADAN2025',
    'عرض رمضان',
    'Ramadan Special',
    'percentage', 40,
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['yearly'],
    '2025-02-28 00:00:00+02',
    '2025-03-31 23:59:59+02',
    FALSE  -- Activate when Ramadan starts
);

-- First Month Trial
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles,
    requires_first_subscription
) VALUES (
    'TRIAL1EGP',
    'تجربة بجنيه واحد',
    'One Pound Trial',
    'fixed', 1,
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['monthly'],
    TRUE
);

-- Milestone Completion Reward
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles
) VALUES (
    'MILESTONE50',
    'مكافأة إتمام المرحلة',
    'Milestone Completion Reward',
    'percentage', 50,
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['monthly']
);

-- 30-Day Streak Reward
INSERT INTO subscription_discounts (
    code, name_ar, name_en,
    type, value,
    applicable_plans, applicable_cycles
) VALUES (
    'STREAK30',
    'مكافأة 30 يوم متواصل',
    '30-Day Streak Reward',
    'trial_extension', 30,  -- 30 days free
    (SELECT ARRAY[id] FROM subscription_plans WHERE name = 'premium'),
    ARRAY['monthly', 'yearly']
);

