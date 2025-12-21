-- =====================================================
-- ADD SALARY RANGES AND JOB ROLES FEATURES TO SUBSCRIPTION SYSTEM
-- These features enable access to the salary ranges and job roles pages
-- =====================================================

-- Add salary_ranges feature to subscription_features table
INSERT INTO subscription_features (key, name_ar, name_en, description_ar, description_en, icon, category, sort_order)
VALUES (
  'salary_ranges',
  'نطاقات الرواتب الكاملة',
  'Full Salary Ranges',
  'وصول كامل لجميع نطاقات الرواتب حسب الدور الوظيفي والمنطقة ومستوى الخبرة',
  'Full access to all salary ranges by job role, region, and experience level',
  '💰',
  'career',
  25
)
ON CONFLICT (key) DO UPDATE
SET 
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Add job_roles feature to subscription_features table
INSERT INTO subscription_features (key, name_ar, name_en, description_ar, description_en, icon, category, sort_order)
VALUES (
  'job_roles',
  'الأدوار الوظيفية الكاملة',
  'Full Job Roles',
  'وصول كامل لجميع الأدوار الوظيفية في مجال ERP مع تفاصيل كاملة عن كل دور',
  'Full access to all ERP job roles with complete details about each role',
  '💼',
  'career',
  26
)
ON CONFLICT (key) DO UPDATE
SET 
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order;

-- Add salary_ranges feature to premium plan
UPDATE subscription_plans
SET features = features || '["salary_ranges"]'::JSONB
WHERE name = 'premium'
AND NOT (features @> '["salary_ranges"]'::JSONB);

-- Add job_roles feature to premium plan
UPDATE subscription_plans
SET features = features || '["job_roles"]'::JSONB
WHERE name = 'premium'
AND NOT (features @> '["job_roles"]'::JSONB);

-- Add salary_ranges feature to team plan
UPDATE subscription_plans
SET features = features || '["salary_ranges"]'::JSONB
WHERE name = 'team'
AND NOT (features @> '["salary_ranges"]'::JSONB);

-- Add job_roles feature to team plan
UPDATE subscription_plans
SET features = features || '["job_roles"]'::JSONB
WHERE name = 'team'
AND NOT (features @> '["job_roles"]'::JSONB);

-- Add comments
COMMENT ON TABLE subscription_features IS 'Subscription features that can be included in plans. salary_ranges and job_roles features provide full access to career resources pages with all data.';

