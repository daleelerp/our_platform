-- =====================================================
-- SIMPLE INSERT FOR ORACLE LEARNING PATHS
-- Run this if the main oracle_paths_data.sql didn't work
-- =====================================================

-- First, let's check if we have an Oracle module, if not create one
DO $$
DECLARE
    oracle_system_id UUID;
    fin_module_id UUID;
BEGIN
    -- Get Oracle system ID
    SELECT id INTO oracle_system_id FROM erp_systems WHERE name = 'Oracle Cloud ERP' LIMIT 1;
    
    -- If no Oracle system exists, we can't proceed
    IF oracle_system_id IS NULL THEN
        RAISE NOTICE 'Oracle Cloud ERP system not found. Please ensure erp_systems table has Oracle data.';
        RETURN;
    END IF;
    
    -- Check if FIN module exists
    SELECT id INTO fin_module_id FROM erp_modules WHERE code = 'FIN' AND erp_system_id = oracle_system_id LIMIT 1;
    
    -- If no FIN module, create it
    IF fin_module_id IS NULL THEN
        INSERT INTO erp_modules (erp_system_id, name, name_ar, code, description, description_ar, is_core_module, typical_roles)
        VALUES (
            oracle_system_id,
            'Oracle Financials Cloud',
            'أوراكل المالية السحابية',
            'FIN',
            'Complete financial management including GL, AP, AR, and reporting',
            'إدارة مالية شاملة تتضمن دفتر الأستاذ والحسابات الدائنة والمدينة',
            TRUE,
            '["Financial Analyst", "GL Accountant", "Finance Manager", "Financial Controller"]'
        )
        RETURNING id INTO fin_module_id;
        
        RAISE NOTICE 'Created FIN module with ID: %', fin_module_id;
    END IF;
    
    RAISE NOTICE 'Using FIN module ID: %', fin_module_id;
END $$;

-- Now insert the learning paths directly
-- Path 1: Foundation for Business
INSERT INTO learning_paths (
    erp_module_id, 
    title, 
    title_ar, 
    slug, 
    description, 
    description_ar, 
    target_audience, 
    estimated_duration_hours, 
    difficulty_level, 
    prerequisites, 
    learning_outcomes, 
    career_outcomes, 
    is_published
)
SELECT 
    em.id,
    'Oracle Financials Foundation for Business Professionals',
    'أساسيات أوراكل المالية لمحترفي الأعمال',
    'oracle-financials-foundation-business',
    'Start your journey into Oracle Cloud Financials. This path is designed for finance professionals who want to understand how Oracle Cloud ERP works and prepare for entry-level Oracle finance roles.',
    'ابدأ رحلتك في أوراكل المالية السحابية. هذا المسار مصمم لمحترفي المالية الذين يريدون فهم كيفية عمل نظام أوراكل السحابي والاستعداد لأدوار أوراكل المالية المبتدئة.',
    'beginners',
    80,
    'beginner',
    '["Basic accounting knowledge", "Computer literacy"]',
    '["Navigate Oracle Cloud Financials", "Understand GL, AP, AR fundamentals", "Create journal entries", "Run financial reports"]',
    '["Junior Financial Analyst", "Oracle Finance End User", "AP/AR Clerk"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
ON CONFLICT (slug) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    description_ar = EXCLUDED.description_ar;

-- Path 2: Functional Consultant Track
INSERT INTO learning_paths (
    erp_module_id, 
    title, 
    title_ar, 
    slug, 
    description, 
    description_ar, 
    target_audience, 
    estimated_duration_hours, 
    difficulty_level, 
    prerequisites, 
    learning_outcomes, 
    career_outcomes, 
    is_published
)
SELECT 
    em.id,
    'Oracle Financials Functional Consultant Track',
    'مسار استشاري أوراكل المالية الوظيفي',
    'oracle-financials-functional-consultant',
    'Become an Oracle Cloud Financials implementation consultant. This comprehensive path covers everything you need to configure Oracle Financials, gather requirements, and lead implementations.',
    'كن استشاري تطبيق أوراكل المالية السحابية. يغطي هذا المسار الشامل كل ما تحتاجه لتكوين أوراكل المالية وجمع المتطلبات وقيادة التطبيقات.',
    'experienced professionals',
    200,
    'advanced',
    '["2+ years finance experience", "Oracle Financials basics"]',
    '["Configure Oracle Financials modules", "Lead requirements workshops", "Design solutions", "Lead UAT"]',
    '["Oracle Financials Consultant", "Finance Implementation Lead", "Senior Finance Consultant"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
ON CONFLICT (slug) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    description_ar = EXCLUDED.description_ar;

-- Path 3: Technical Foundations
INSERT INTO learning_paths (
    erp_module_id, 
    title, 
    title_ar, 
    slug, 
    description, 
    description_ar, 
    target_audience, 
    estimated_duration_hours, 
    difficulty_level, 
    prerequisites, 
    learning_outcomes, 
    career_outcomes, 
    is_published
)
SELECT 
    em.id,
    'Oracle Cloud Technical Foundations',
    'أساسيات أوراكل السحابية التقنية',
    'oracle-cloud-technical-foundations',
    'Build your technical foundation in Oracle Cloud. Learn the architecture, security model, reporting tools, and integration basics.',
    'ابنِ أساسك التقني في أوراكل السحابية. تعلم الهندسة المعمارية ونموذج الأمان وأدوات التقارير وأساسيات التكامل.',
    'career-switchers',
    100,
    'intermediate',
    '["Basic IT knowledge", "SQL fundamentals"]',
    '["Understand Oracle Cloud architecture", "Configure security", "Build OTBI reports", "Work with REST APIs"]',
    '["Oracle Cloud Support Analyst", "Junior Technical Consultant", "Oracle Reporting Analyst"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
ON CONFLICT (slug) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    description_ar = EXCLUDED.description_ar;

-- Path 4: Integration & Development
INSERT INTO learning_paths (
    erp_module_id, 
    title, 
    title_ar, 
    slug, 
    description, 
    description_ar, 
    target_audience, 
    estimated_duration_hours, 
    difficulty_level, 
    prerequisites, 
    learning_outcomes, 
    career_outcomes, 
    is_published
)
SELECT 
    em.id,
    'Oracle Integration & Development Specialist',
    'أخصائي تكامل وتطوير أوراكل',
    'oracle-integration-development',
    'Master Oracle Cloud integrations and technical development. Deep dive into OIC, REST APIs, FBDI, BIP reports, and custom extensions.',
    'أتقن تكاملات أوراكل السحابية والتطوير التقني. تعمق في OIC وواجهات REST وFBDI وتقارير BIP والإضافات المخصصة.',
    'technical professionals',
    180,
    'advanced',
    '["Oracle Cloud Technical Foundations", "Strong SQL skills", "API experience"]',
    '["Design integration architectures", "Build OIC integrations", "Develop BIP reports", "Create FBDI templates"]',
    '["Oracle Integration Developer", "Oracle Technical Consultant", "Integration Architect"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
ON CONFLICT (slug) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    description_ar = EXCLUDED.description_ar;

-- Verify the data
SELECT 
    title,
    title_ar,
    difficulty_level,
    is_published
FROM learning_paths
WHERE is_published = true
ORDER BY difficulty_level;

