-- =====================================================
-- ORACLE CLOUD ERP LEARNING PATHS DATA
-- Functional (Business) & Technical Tracks
-- =====================================================

-- Get Oracle ERP System ID for reference
-- We'll use a variable approach for clarity

-- =====================================================
-- PART 1: SKILLS MASTER DATA
-- =====================================================

-- Functional Skills
INSERT INTO skills (name, name_ar, description, description_ar, skill_category, display_order) VALUES
-- Core Financial Skills
('General Ledger Fundamentals', 'أساسيات دفتر الأستاذ العام', 'Understanding chart of accounts, ledgers, and GL structure', 'فهم شجرة الحسابات والدفاتر وهيكل دفتر الأستاذ', 'functional', 1),
('Journal Entry Processing', 'معالجة القيود اليومية', 'Creating, reviewing, and posting journal entries', 'إنشاء ومراجعة وترحيل القيود اليومية', 'functional', 2),
('Period Close Process', 'عملية إقفال الفترة', 'Month-end and year-end closing procedures', 'إجراءات الإقفال الشهري والسنوي', 'functional', 3),
('Financial Reporting', 'التقارير المالية', 'Creating and analyzing financial statements', 'إنشاء وتحليل القوائم المالية', 'functional', 4),
('Accounts Payable', 'الحسابات الدائنة', 'Invoice processing, payments, and vendor management', 'معالجة الفواتير والمدفوعات وإدارة الموردين', 'functional', 5),
('Accounts Receivable', 'الحسابات المدينة', 'Customer invoicing, receipts, and collections', 'فوترة العملاء والإيصالات والتحصيلات', 'functional', 6),
('Fixed Assets', 'الأصول الثابتة', 'Asset lifecycle management and depreciation', 'إدارة دورة حياة الأصول والإهلاك', 'functional', 7),
('Cash Management', 'إدارة النقد', 'Bank reconciliation and cash positioning', 'تسوية البنوك وإدارة السيولة', 'functional', 8),
('Intercompany Accounting', 'المحاسبة بين الشركات', 'Managing transactions between legal entities', 'إدارة المعاملات بين الكيانات القانونية', 'functional', 9),
('Budgeting & Forecasting', 'الموازنات والتنبؤ', 'Budget creation, monitoring, and variance analysis', 'إنشاء الموازنات ومراقبتها وتحليل الانحرافات', 'functional', 10),

-- Business Analysis Skills
('Business Process Analysis', 'تحليل العمليات التجارية', 'Analyzing and documenting business processes', 'تحليل وتوثيق العمليات التجارية', 'business', 11),
('Requirements Gathering', 'جمع المتطلبات', 'Eliciting and documenting business requirements', 'استخلاص وتوثيق متطلبات العمل', 'business', 12),
('Gap Analysis', 'تحليل الفجوات', 'Identifying gaps between current and desired state', 'تحديد الفجوات بين الوضع الحالي والمطلوب', 'business', 13),
('Solution Design', 'تصميم الحلول', 'Designing solutions to meet business needs', 'تصميم حلول لتلبية احتياجات العمل', 'business', 14),
('User Acceptance Testing', 'اختبار قبول المستخدم', 'Planning and executing UAT', 'تخطيط وتنفيذ اختبار قبول المستخدم', 'business', 15),
('Change Management', 'إدارة التغيير', 'Managing organizational change during implementations', 'إدارة التغيير المؤسسي أثناء التطبيقات', 'business', 16),
('Training Delivery', 'تقديم التدريب', 'Creating and delivering end-user training', 'إنشاء وتقديم تدريب المستخدم النهائي', 'business', 17),

-- Technical Skills
('Oracle Cloud Navigation', 'التنقل في أوراكل السحابية', 'Navigating Oracle Cloud applications interface', 'التنقل في واجهة تطبيقات أوراكل السحابية', 'technical', 20),
('Oracle Cloud Security', 'أمان أوراكل السحابية', 'User roles, data security, and access controls', 'أدوار المستخدمين وأمان البيانات وضوابط الوصول', 'technical', 21),
('OTBI Reporting', 'تقارير OTBI', 'Oracle Transactional Business Intelligence reporting', 'تقارير ذكاء الأعمال للمعاملات من أوراكل', 'technical', 22),
('Financial Reporting Studio', 'استوديو التقارير المالية', 'Creating financial reports using FR Studio', 'إنشاء التقارير المالية باستخدام استوديو التقارير', 'technical', 23),
('Oracle Integration Cloud', 'سحابة التكامل من أوراكل', 'Building integrations with OIC', 'بناء التكاملات مع OIC', 'technical', 24),
('FBDI Data Loading', 'تحميل بيانات FBDI', 'File-Based Data Import for mass data uploads', 'استيراد البيانات المستند إلى الملفات للتحميل الجماعي', 'technical', 25),
('REST APIs', 'واجهات REST', 'Working with Oracle Cloud REST APIs', 'العمل مع واجهات REST في أوراكل السحابية', 'technical', 26),
('Workflow Configuration', 'تكوين سير العمل', 'Setting up approval workflows and BPM', 'إعداد سير عمل الموافقات وإدارة العمليات', 'technical', 27),
('Flexfields Configuration', 'تكوين الحقول المرنة', 'Configuring descriptive and key flexfields', 'تكوين الحقول المرنة الوصفية والمفتاحية', 'technical', 28),
('Subledger Accounting', 'محاسبة دفتر الأستاذ الفرعي', 'SLA rules and accounting method configuration', 'قواعد SLA وتكوين طرق المحاسبة', 'technical', 29),

-- Soft Skills
('Stakeholder Communication', 'التواصل مع أصحاب المصلحة', 'Effective communication with various stakeholders', 'التواصل الفعال مع مختلف أصحاب المصلحة', 'soft', 30),
('Problem Solving', 'حل المشكلات', 'Analytical thinking and problem resolution', 'التفكير التحليلي وحل المشكلات', 'soft', 31),
('Project Management', 'إدارة المشاريع', 'Managing implementation projects and timelines', 'إدارة مشاريع التطبيق والجداول الزمنية', 'soft', 32),
('Documentation', 'التوثيق', 'Creating clear technical and functional documentation', 'إنشاء توثيق تقني ووظيفي واضح', 'soft', 33),
('Presentation Skills', 'مهارات العرض', 'Presenting solutions and conducting demos', 'عرض الحلول وإجراء العروض التوضيحية', 'soft', 34);

-- =====================================================
-- PART 2: JOB ROLES
-- =====================================================

INSERT INTO job_roles (title, title_ar, description, description_ar, role_category, min_years_experience, max_years_experience, typical_years_to_role, daily_activities, daily_activities_ar) VALUES
-- Functional Roles
('Oracle Financials Functional Consultant', 'استشاري وظيفي أوراكل المالية', 
 'Implements and configures Oracle Cloud Financials to meet business requirements. Works directly with finance teams to understand needs and design solutions.',
 'يقوم بتطبيق وتكوين أوراكل المالية السحابية لتلبية متطلبات العمل. يعمل مباشرة مع فرق المالية لفهم الاحتياجات وتصميم الحلول.',
 'functional', 2, 8, 3,
 '["Gather requirements from finance teams", "Configure Oracle Cloud modules", "Design and document solutions", "Conduct user training", "Support UAT and go-live", "Troubleshoot functional issues"]',
 '["جمع المتطلبات من فرق المالية", "تكوين وحدات أوراكل السحابية", "تصميم وتوثيق الحلول", "إجراء تدريب المستخدمين", "دعم UAT والإطلاق", "استكشاف المشكلات الوظيفية وإصلاحها"]'),

('Junior Financial Analyst (Oracle)', 'محلل مالي مبتدئ (أوراكل)',
 'Entry-level role supporting finance operations using Oracle Cloud. Handles day-to-day transactions and basic reporting.',
 'دور مبتدئ لدعم العمليات المالية باستخدام أوراكل السحابية. يتعامل مع المعاملات اليومية والتقارير الأساسية.',
 'functional', 0, 2, 1,
 '["Process journal entries", "Run standard reports", "Assist with month-end close", "Reconcile accounts", "Support senior analysts", "Document processes"]',
 '["معالجة القيود اليومية", "تشغيل التقارير القياسية", "المساعدة في إقفال نهاية الشهر", "تسوية الحسابات", "دعم المحللين الأقدم", "توثيق العمليات"]'),

('Senior Oracle Finance Consultant', 'استشاري أوراكل المالية أول',
 'Leads Oracle Financials implementations, mentors junior consultants, and handles complex configurations.',
 'يقود تطبيقات أوراكل المالية، ويوجه الاستشاريين المبتدئين، ويتعامل مع التكوينات المعقدة.',
 'functional', 5, 12, 6,
 '["Lead implementation workstreams", "Design complex solutions", "Mentor junior team members", "Client relationship management", "Estimate effort and timelines", "Quality review deliverables"]',
 '["قيادة مسارات عمل التطبيق", "تصميم حلول معقدة", "توجيه أعضاء الفريق المبتدئين", "إدارة علاقات العملاء", "تقدير الجهد والجداول الزمنية", "مراجعة جودة المخرجات"]'),

('Oracle Finance Solution Architect', 'مهندس حلول أوراكل المالية',
 'Designs end-to-end Oracle Cloud solutions, leads technical direction, and ensures alignment with enterprise architecture.',
 'يصمم حلول أوراكل السحابية الشاملة، ويقود التوجه التقني، ويضمن التوافق مع هندسة المؤسسة.',
 'consulting', 8, 15, 10,
 '["Design enterprise solutions", "Lead architecture decisions", "Evaluate new Oracle features", "Guide implementation teams", "Present to C-level executives", "Define integration strategy"]',
 '["تصميم حلول المؤسسة", "قيادة قرارات الهندسة", "تقييم ميزات أوراكل الجديدة", "توجيه فرق التطبيق", "العرض للمديرين التنفيذيين", "تحديد استراتيجية التكامل"]'),

-- Technical Roles
('Oracle Cloud Technical Consultant', 'استشاري تقني أوراكل السحابية',
 'Focuses on technical aspects: integrations, data migration, custom reports, and extensions.',
 'يركز على الجوانب التقنية: التكاملات، ترحيل البيانات، التقارير المخصصة، والإضافات.',
 'technical', 2, 8, 3,
 '["Build integrations using OIC", "Develop custom reports", "Perform data migrations", "Configure security", "Troubleshoot technical issues", "Optimize performance"]',
 '["بناء التكاملات باستخدام OIC", "تطوير تقارير مخصصة", "تنفيذ ترحيل البيانات", "تكوين الأمان", "استكشاف المشكلات التقنية", "تحسين الأداء"]'),

('Oracle Integration Developer', 'مطور تكامل أوراكل',
 'Specializes in building integrations between Oracle Cloud and other systems using OIC, REST APIs, and FBDI.',
 'متخصص في بناء التكاملات بين أوراكل السحابية والأنظمة الأخرى باستخدام OIC وREST APIs وFBDI.',
 'technical', 1, 5, 2,
 '["Design integration flows", "Develop OIC integrations", "Work with REST APIs", "Handle error scenarios", "Monitor integration health", "Document technical specs"]',
 '["تصميم تدفقات التكامل", "تطوير تكاملات OIC", "العمل مع واجهات REST", "معالجة سيناريوهات الأخطاء", "مراقبة صحة التكامل", "توثيق المواصفات التقنية"]'),

('Oracle Reporting Specialist', 'أخصائي تقارير أوراكل',
 'Creates and maintains reports using OTBI, BIP, and Financial Reporting Studio.',
 'ينشئ ويحافظ على التقارير باستخدام OTBI وBIP واستوديو التقارير المالية.',
 'technical', 1, 5, 2,
 '["Build OTBI analyses", "Create BIP reports", "Develop FR Studio reports", "Optimize report performance", "Train users on reporting", "Maintain report catalog"]',
 '["بناء تحليلات OTBI", "إنشاء تقارير BIP", "تطوير تقارير استوديو FR", "تحسين أداء التقارير", "تدريب المستخدمين على التقارير", "صيانة كتالوج التقارير"]');

-- =====================================================
-- PART 3: JOB MARKET DATA (MENA Region)
-- =====================================================

-- Get role IDs (we'll reference by title in a real scenario)
-- For now, inserting with sample data

INSERT INTO job_market_data (country, region, salary_min, salary_max, salary_currency, open_positions_count, positions_growth_6m, remote_percentage, contract_percentage, top_hiring_companies, common_requirements, required_certifications, data_source, sample_size, data_date, confidence_score) VALUES
-- Saudi Arabia
('SA', 'GCC', 180000, 420000, 'SAR', 245, 15.5, 10, 25, 
 '["Aramco", "SABIC", "STC", "Deloitte", "EY", "PwC", "Accenture", "IBM"]',
 '["3+ years Oracle Cloud experience", "Strong GL/AP/AR knowledge", "Arabic and English fluency", "Saudi work permit or transferable iqama"]',
 '["Oracle Cloud Financials 2024 Certified"]',
 'LinkedIn Jobs + Bayt.com', 150, '2024-11-01', 0.85),

-- UAE
('AE', 'GCC', 25000, 55000, 'AED', 180, 12.3, 15, 30,
 '["Emirates NBD", "ADNOC", "Etisalat", "Majid Al Futtaim", "Deloitte", "KPMG"]',
 '["2+ years Oracle Cloud experience", "Implementation experience preferred", "English required, Arabic preferred"]',
 '["Oracle Cloud Financials Certified"]',
 'LinkedIn Jobs + GulfTalent', 120, '2024-11-01', 0.82),

-- Egypt
('EG', 'North Africa', 400000, 1200000, 'EGP', 95, 20.1, 25, 20,
 '["Vodafone Egypt", "Orange", "CIB", "Deloitte", "EY", "Raya"]',
 '["2+ years ERP experience", "Oracle Cloud preferred", "Good English communication"]',
 '["Oracle certification preferred"]',
 'LinkedIn Jobs + Wuzzuf', 80, '2024-11-01', 0.78),

-- Jordan
('JO', 'Levant', 18000, 48000, 'JOD', 35, 8.5, 20, 35,
 '["Arab Bank", "Zain", "Orange", "Deloitte Amman"]',
 '["Oracle experience required", "Consulting background preferred"]',
 '[]',
 'LinkedIn Jobs', 40, '2024-11-01', 0.70),

-- Kuwait
('KW', 'GCC', 1500, 4000, 'KWD', 45, 10.2, 5, 40,
 '["KPC", "NBK", "Zain", "Agility"]',
 '["Oracle Cloud experience", "GCC experience preferred"]',
 '["Oracle certification required for senior roles"]',
 'LinkedIn Jobs + Bayt.com', 35, '2024-11-01', 0.75);

-- =====================================================
-- PART 4: LEARNING PATHS - FUNCTIONAL TRACK
-- =====================================================

-- First, ensure we have the Oracle Financials module
-- (This should already exist from previous schema)

-- Path 1: Oracle Financials Foundation (Beginner - Business Track)
INSERT INTO learning_paths (erp_module_id, title, title_ar, slug, description, description_ar, target_audience, estimated_duration_hours, difficulty_level, prerequisites, learning_outcomes, career_outcomes, is_published)
SELECT 
    em.id,
    'Oracle Financials Foundation for Business Professionals',
    'أساسيات أوراكل المالية لمحترفي الأعمال',
    'oracle-financials-foundation-business',
    'Start your journey into Oracle Cloud Financials. This path is designed for finance professionals who want to understand how Oracle Cloud ERP works and prepare for entry-level Oracle finance roles. No prior Oracle experience required.',
    'ابدأ رحلتك في أوراكل المالية السحابية. هذا المسار مصمم لمحترفي المالية الذين يريدون فهم كيفية عمل نظام أوراكل السحابي والاستعداد لأدوار أوراكل المالية المبتدئة. لا يتطلب خبرة سابقة في أوراكل.',
    'beginners',
    80,
    'beginner',
    '["Basic accounting knowledge", "Computer literacy", "English proficiency (intermediate)"]',
    '["Navigate Oracle Cloud Financials confidently", "Understand GL, AP, AR fundamentals", "Create and post journal entries", "Run standard financial reports", "Perform basic month-end tasks", "Understand Oracle Cloud security basics"]',
    '["Junior Financial Analyst", "Oracle Finance End User", "Finance Operations Associate", "AP/AR Clerk"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
LIMIT 1;

-- Path 2: Oracle Financials Functional Consultant Track
INSERT INTO learning_paths (erp_module_id, title, title_ar, slug, description, description_ar, target_audience, estimated_duration_hours, difficulty_level, prerequisites, learning_outcomes, career_outcomes, is_published)
SELECT 
    em.id,
    'Oracle Financials Functional Consultant Track',
    'مسار استشاري أوراكل المالية الوظيفي',
    'oracle-financials-functional-consultant',
    'Become an Oracle Cloud Financials implementation consultant. This comprehensive path covers everything you need to configure Oracle Financials, gather requirements, design solutions, and lead implementations. Ideal for experienced finance professionals transitioning to consulting.',
    'كن استشاري تطبيق أوراكل المالية السحابية. يغطي هذا المسار الشامل كل ما تحتاجه لتكوين أوراكل المالية، وجمع المتطلبات، وتصميم الحلول، وقيادة التطبيقات. مثالي لمحترفي المالية ذوي الخبرة الذين ينتقلون إلى الاستشارات.',
    'experienced professionals',
    200,
    'advanced',
    '["2+ years finance experience", "Oracle Financials basics (or complete Foundation path)", "Strong analytical skills", "English fluency"]',
    '["Configure all Oracle Financials modules", "Lead requirements gathering workshops", "Design end-to-end finance solutions", "Perform gap analysis", "Create functional specifications", "Lead UAT and training", "Troubleshoot complex issues"]',
    '["Oracle Financials Functional Consultant", "Finance Implementation Lead", "Oracle Finance Business Analyst", "Senior Finance Consultant"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
LIMIT 1;

-- =====================================================
-- PART 5: LEARNING PATHS - TECHNICAL TRACK
-- =====================================================

-- Path 3: Oracle Cloud Technical Foundations
INSERT INTO learning_paths (erp_module_id, title, title_ar, slug, description, description_ar, target_audience, estimated_duration_hours, difficulty_level, prerequisites, learning_outcomes, career_outcomes, is_published)
SELECT 
    em.id,
    'Oracle Cloud Technical Foundations',
    'أساسيات أوراكل السحابية التقنية',
    'oracle-cloud-technical-foundations',
    'Build your technical foundation in Oracle Cloud. Learn the architecture, security model, reporting tools, and integration basics. Perfect for IT professionals or developers wanting to specialize in Oracle Cloud.',
    'ابنِ أساسك التقني في أوراكل السحابية. تعلم الهندسة المعمارية، ونموذج الأمان، وأدوات التقارير، وأساسيات التكامل. مثالي لمحترفي تكنولوجيا المعلومات أو المطورين الراغبين في التخصص في أوراكل السحابية.',
    'career-switchers',
    100,
    'intermediate',
    '["Basic IT knowledge", "SQL fundamentals", "Understanding of APIs (helpful)", "English proficiency"]',
    '["Understand Oracle Cloud architecture", "Configure user security and roles", "Build OTBI reports", "Work with REST APIs", "Perform FBDI data loads", "Troubleshoot technical issues"]',
    '["Oracle Cloud Support Analyst", "Junior Technical Consultant", "Oracle Reporting Analyst", "Integration Support Specialist"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
LIMIT 1;

-- Path 4: Oracle Integration & Development Track
INSERT INTO learning_paths (erp_module_id, title, title_ar, slug, description, description_ar, target_audience, estimated_duration_hours, difficulty_level, prerequisites, learning_outcomes, career_outcomes, is_published)
SELECT 
    em.id,
    'Oracle Integration & Development Specialist',
    'أخصائي تكامل وتطوير أوراكل',
    'oracle-integration-development',
    'Master Oracle Cloud integrations and technical development. Deep dive into OIC, REST APIs, FBDI, BIP reports, and custom extensions. For technical professionals who want to become Oracle Cloud integration experts.',
    'أتقن تكاملات أوراكل السحابية والتطوير التقني. تعمق في OIC وREST APIs وFBDI وتقارير BIP والإضافات المخصصة. للمحترفين التقنيين الذين يريدون أن يصبحوا خبراء تكامل أوراكل السحابية.',
    'technical professionals',
    180,
    'advanced',
    '["Oracle Cloud Technical Foundations (or equivalent)", "Strong SQL skills", "API development experience", "Programming background (any language)"]',
    '["Design complex integration architectures", "Build OIC integrations end-to-end", "Develop custom BIP reports", "Create FBDI templates for any module", "Implement error handling and monitoring", "Optimize integration performance"]',
    '["Oracle Integration Developer", "Oracle Cloud Technical Consultant", "Integration Architect", "Oracle Technical Lead"]',
    true
FROM erp_modules em
WHERE em.code = 'FIN'
LIMIT 1;

-- =====================================================
-- PART 6: PATH MILESTONES - Foundation Path
-- =====================================================

-- Get the Foundation path ID
-- Milestone 1: Getting Started
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'Introduction to Oracle Cloud ERP',
    'مقدمة في أوراكل السحابية ERP',
    'Understand what Oracle Cloud ERP is, its modules, and how it fits in the enterprise software landscape.',
    'افهم ما هو نظام أوراكل السحابي ERP، ووحداته، وكيف يتناسب مع مشهد برامج المؤسسات.',
    1,
    8,
    '["Understand Oracle Cloud ERP architecture", "Know the main modules and their purposes", "Navigate the Oracle Cloud interface", "Understand Oracle release cycles"]',
    '["فهم هندسة أوراكل السحابية ERP", "معرفة الوحدات الرئيسية وأغراضها", "التنقل في واجهة أوراكل السحابية", "فهم دورات إصدار أوراكل"]',
    'quiz',
    'Complete a quiz on Oracle Cloud fundamentals',
    'أكمل اختباراً عن أساسيات أوراكل السحابية',
    '["Oracle Cloud Navigation"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Milestone 2: General Ledger Basics
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'General Ledger Fundamentals',
    'أساسيات دفتر الأستاذ العام',
    'Master the core of Oracle Financials - the General Ledger. Learn chart of accounts, ledgers, and basic GL operations.',
    'أتقن جوهر أوراكل المالية - دفتر الأستاذ العام. تعلم شجرة الحسابات، والدفاتر، وعمليات GL الأساسية.',
    2,
    16,
    '["Understand chart of accounts structure", "Know the difference between primary and secondary ledgers", "Create and post journal entries", "Understand accounting periods", "Run GL reports"]',
    '["فهم هيكل شجرة الحسابات", "معرفة الفرق بين الدفاتر الأساسية والثانوية", "إنشاء وترحيل القيود اليومية", "فهم الفترات المحاسبية", "تشغيل تقارير GL"]',
    'project',
    'Create journal entries for a sample business scenario',
    'أنشئ قيود يومية لسيناريو عمل نموذجي',
    '["General Ledger Fundamentals", "Journal Entry Processing"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Milestone 3: Accounts Payable
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'Accounts Payable Essentials',
    'أساسيات الحسابات الدائنة',
    'Learn end-to-end AP processes: supplier management, invoice processing, and payments.',
    'تعلم عمليات AP من البداية للنهاية: إدارة الموردين، ومعالجة الفواتير، والمدفوعات.',
    3,
    14,
    '["Create and manage suppliers", "Process invoices (standard, PO-matched)", "Handle invoice holds and releases", "Create payment batches", "Understand AP to GL integration"]',
    '["إنشاء وإدارة الموردين", "معالجة الفواتير (قياسية، مطابقة لأمر الشراء)", "التعامل مع تعليق وإصدار الفواتير", "إنشاء دفعات المدفوعات", "فهم تكامل AP مع GL"]',
    'project',
    'Process a complete AP cycle from invoice to payment',
    'عالج دورة AP كاملة من الفاتورة إلى الدفع',
    '["Accounts Payable"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Milestone 4: Accounts Receivable
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'Accounts Receivable Essentials',
    'أساسيات الحسابات المدينة',
    'Master customer invoicing, receipts, and collections management.',
    'أتقن فوترة العملاء، والإيصالات، وإدارة التحصيلات.',
    4,
    14,
    '["Create and manage customers", "Generate customer invoices", "Apply receipts and credits", "Handle disputes and adjustments", "Run AR aging reports"]',
    '["إنشاء وإدارة العملاء", "إنشاء فواتير العملاء", "تطبيق الإيصالات والائتمانات", "التعامل مع النزاعات والتعديلات", "تشغيل تقارير أعمار AR"]',
    'project',
    'Complete an AR cycle from invoice to receipt',
    'أكمل دورة AR من الفاتورة إلى الإيصال',
    '["Accounts Receivable"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Milestone 5: Financial Reporting
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'Financial Reporting Basics',
    'أساسيات التقارير المالية',
    'Learn to run and understand standard Oracle financial reports.',
    'تعلم تشغيل وفهم التقارير المالية القياسية في أوراكل.',
    5,
    12,
    '["Run standard GL reports", "Understand trial balance and financial statements", "Use Smart View for Excel reporting", "Schedule and distribute reports", "Basic OTBI navigation"]',
    '["تشغيل تقارير GL القياسية", "فهم ميزان المراجعة والقوائم المالية", "استخدام Smart View لتقارير Excel", "جدولة وتوزيع التقارير", "التنقل الأساسي في OTBI"]',
    'project',
    'Generate a complete set of financial statements',
    'أنشئ مجموعة كاملة من القوائم المالية',
    '["Financial Reporting", "OTBI Reporting"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- Milestone 6: Period Close
INSERT INTO path_milestones (learning_path_id, title, title_ar, description, description_ar, milestone_number, estimated_hours, learning_objectives, learning_objectives_ar, checkpoint_type, checkpoint_description, checkpoint_description_ar, job_skills_unlocked)
SELECT 
    lp.id,
    'Month-End Close Process',
    'عملية إقفال نهاية الشهر',
    'Understand and execute the period close process in Oracle Financials.',
    'افهم ونفذ عملية إقفال الفترة في أوراكل المالية.',
    6,
    16,
    '["Understand the close calendar", "Execute subledger close steps", "Run revaluation and translation", "Create accruals and adjustments", "Close and open periods", "Generate period-end reports"]',
    '["فهم تقويم الإقفال", "تنفيذ خطوات إقفال دفتر الأستاذ الفرعي", "تشغيل إعادة التقييم والترجمة", "إنشاء المستحقات والتعديلات", "إقفال وفتح الفترات", "إنشاء تقارير نهاية الفترة"]',
    'certification',
    'Successfully close a sample period with all steps documented',
    'أقفل فترة نموذجية بنجاح مع توثيق جميع الخطوات',
    '["Period Close Process"]'
FROM learning_paths lp
WHERE lp.slug = 'oracle-financials-foundation-business';

-- =====================================================
-- PART 7: SAMPLE LEARNING RESOURCES
-- =====================================================

INSERT INTO learning_resources (title, title_ar, description, description_ar, url, resource_type, language, difficulty_level, estimated_duration_minutes, is_free, author_name, is_verified, is_active) VALUES
-- Oracle Official
('Oracle Cloud Financials: Getting Started', 'أوراكل المالية السحابية: البداية', 
 'Official Oracle University introduction to Oracle Cloud Financials',
 'مقدمة جامعة أوراكل الرسمية لأوراكل المالية السحابية',
 'https://education.oracle.com/oracle-financials-cloud',
 'course', 'en', 'beginner', 480, false, 'Oracle University', true, true),

('Oracle Financials Cloud Documentation', 'وثائق أوراكل المالية السحابية',
 'Complete official documentation for Oracle Financials Cloud',
 'الوثائق الرسمية الكاملة لأوراكل المالية السحابية',
 'https://docs.oracle.com/en/cloud/saas/financials/',
 'documentation', 'en', 'intermediate', 0, true, 'Oracle', true, true),

-- YouTube Resources
('Oracle Cloud Financials Complete Tutorial', 'دورة أوراكل المالية السحابية الكاملة',
 'Comprehensive video tutorial covering Oracle Financials basics',
 'فيديو تعليمي شامل يغطي أساسيات أوراكل المالية',
 'https://www.youtube.com/watch?v=example1',
 'video', 'en', 'beginner', 180, true, 'Oracle Learning', false, true),

('شرح أوراكل المالية بالعربي', 'Oracle Financials Arabic Tutorial',
 'Arabic tutorial for Oracle Cloud Financials',
 'شرح عربي لأوراكل المالية السحابية',
 'https://www.youtube.com/watch?v=example2',
 'video', 'ar', 'beginner', 120, true, 'Tech Arabic', false, true),

('Journal Entries in Oracle Cloud - Step by Step', 'القيود اليومية في أوراكل السحابية - خطوة بخطوة',
 'Detailed walkthrough of creating journal entries',
 'شرح تفصيلي لإنشاء القيود اليومية',
 'https://www.youtube.com/watch?v=example3',
 'video', 'en', 'beginner', 25, true, 'ERP Guide', false, true),

-- Udemy Courses
('Oracle Cloud Financials Bootcamp', 'معسكر أوراكل المالية السحابية',
 'Complete bootcamp covering all Oracle Financials modules',
 'معسكر تدريبي شامل يغطي جميع وحدات أوراكل المالية',
 'https://www.udemy.com/course/oracle-financials-bootcamp/',
 'course', 'en', 'intermediate', 1200, false, 'ERP Academy', false, true),

-- Technical Resources
('Oracle Integration Cloud Complete Guide', 'دليل سحابة التكامل من أوراكل الكامل',
 'Learn OIC from basics to advanced integrations',
 'تعلم OIC من الأساسيات إلى التكاملات المتقدمة',
 'https://www.udemy.com/course/oracle-integration-cloud/',
 'course', 'en', 'intermediate', 900, false, 'Cloud Expert', false, true),

('OTBI Reporting Tutorial', 'دورة تقارير OTBI',
 'Master OTBI reporting in Oracle Cloud',
 'أتقن تقارير OTBI في أوراكل السحابية',
 'https://www.youtube.com/watch?v=example4',
 'video', 'en', 'intermediate', 90, true, 'Reporting Pro', false, true),

('REST API Integration with Oracle Cloud', 'تكامل REST API مع أوراكل السحابية',
 'Technical guide to Oracle Cloud REST APIs',
 'دليل تقني لواجهات REST في أوراكل السحابية',
 'https://medium.com/@author/oracle-rest-api',
 'article', 'en', 'advanced', 30, true, 'Tech Writer', false, true),

('FBDI Data Loading Best Practices', 'أفضل ممارسات تحميل بيانات FBDI',
 'Complete guide to FBDI templates and data loading',
 'دليل شامل لقوالب FBDI وتحميل البيانات',
 'https://docs.oracle.com/en/cloud/saas/financials/fbdi/',
 'documentation', 'en', 'intermediate', 60, true, 'Oracle', true, true);

-- =====================================================
-- PART 8: LINK RESOURCES TO MILESTONES
-- =====================================================

-- This would normally be done with proper IDs after resources and milestones are created
-- Here's the pattern for linking:

-- INSERT INTO milestone_resources (milestone_id, resource_id, resource_order, is_primary, is_required, selection_reason, selection_reason_ar)
-- SELECT 
--     pm.id,
--     lr.id,
--     1,
--     true,
--     true,
--     'Official Oracle documentation provides the most accurate and up-to-date information',
--     'توفر وثائق أوراكل الرسمية المعلومات الأكثر دقة وحداثة'
-- FROM path_milestones pm, learning_resources lr
-- WHERE pm.title = 'Introduction to Oracle Cloud ERP'
-- AND lr.title = 'Oracle Cloud Financials: Getting Started';

-- =====================================================
-- PART 9: PATH-JOB ROLE LINKS
-- =====================================================

-- Link Foundation path to entry-level roles
INSERT INTO path_job_roles (learning_path_id, job_role_id, readiness_level, additional_requirements)
SELECT 
    lp.id,
    jr.id,
    'entry_ready',
    'Hands-on practice with Oracle Cloud environment recommended'
FROM learning_paths lp, job_roles jr
WHERE lp.slug = 'oracle-financials-foundation-business'
AND jr.title = 'Junior Financial Analyst (Oracle)';

-- Link Consultant path to consultant roles
INSERT INTO path_job_roles (learning_path_id, job_role_id, readiness_level, additional_requirements)
SELECT 
    lp.id,
    jr.id,
    'interview_ready',
    'Oracle Cloud Financials certification highly recommended'
FROM learning_paths lp, job_roles jr
WHERE lp.slug = 'oracle-financials-functional-consultant'
AND jr.title = 'Oracle Financials Functional Consultant';

-- Link Technical path to technical roles
INSERT INTO path_job_roles (learning_path_id, job_role_id, readiness_level, additional_requirements)
SELECT 
    lp.id,
    jr.id,
    'entry_ready',
    'Build portfolio of sample integrations'
FROM learning_paths lp, job_roles jr
WHERE lp.slug = 'oracle-cloud-technical-foundations'
AND jr.title = 'Oracle Integration Developer';

