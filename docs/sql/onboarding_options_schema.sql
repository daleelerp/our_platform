-- =============================================
-- DALEEL ONBOARDING OPTIONS SCHEMA
-- Run this in Supabase SQL Editor
-- =============================================

-- Table: experience_levels
CREATE TABLE experience_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO experience_levels (value, label, label_ar, description, description_ar, icon, display_order) VALUES
('beginner', 'Beginner', 'مبتدئ', 'New to ERP systems', 'جديد على أنظمة ERP', '🌱', 1),
('intermediate', 'Intermediate', 'متوسط', '1-3 years experience', 'خبرة 1-3 سنوات', '📈', 2),
('advanced', 'Advanced', 'متقدم', '3+ years, seeking mastery', 'أكثر من 3 سنوات، يسعى للإتقان', '🎯', 3),
('expert', 'Expert', 'خبير', '5+ years, looking to specialize', 'أكثر من 5 سنوات، يبحث عن التخصص', '👑', 4);

-- Table: industries
CREATE TABLE industries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO industries (value, label, label_ar, icon, display_order) VALUES
('oil_gas', 'Oil & Gas', 'النفط والغاز', '🛢️', 1),
('finance', 'Finance & Banking', 'المالية والبنوك', '🏦', 2),
('government', 'Government', 'الحكومة', '🏛️', 3),
('telecom', 'Telecommunications', 'الاتصالات', '📡', 4),
('retail', 'Retail', 'التجزئة', '🛒', 5),
('manufacturing', 'Manufacturing', 'التصنيع', '🏭', 6),
('healthcare', 'Healthcare', 'الرعاية الصحية', '🏥', 7),
('technology', 'Technology', 'التكنولوجيا', '💻', 8),
('consulting', 'Consulting', 'الاستشارات', '📊', 9),
('education', 'Education', 'التعليم', '🎓', 10),
('logistics', 'Logistics & Supply Chain', 'اللوجستيات وسلسلة التوريد', '🚚', 11),
('real_estate', 'Real Estate', 'العقارات', '🏢', 12),
('hospitality', 'Hospitality & Tourism', 'الضيافة والسياحة', '🏨', 13),
('other', 'Other', 'أخرى', '📋', 99);

-- Table: countries
CREATE TABLE countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(5) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  flag VARCHAR(10),
  region VARCHAR(50) DEFAULT 'MENA',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO countries (code, name, name_ar, flag, display_order) VALUES
('SA', 'Saudi Arabia', 'المملكة العربية السعودية', '🇸🇦', 1),
('AE', 'UAE', 'الإمارات العربية المتحدة', '🇦🇪', 2),
('EG', 'Egypt', 'مصر', '🇪🇬', 3),
('JO', 'Jordan', 'الأردن', '🇯🇴', 4),
('KW', 'Kuwait', 'الكويت', '🇰🇼', 5),
('QA', 'Qatar', 'قطر', '🇶🇦', 6),
('BH', 'Bahrain', 'البحرين', '🇧🇭', 7),
('OM', 'Oman', 'عُمان', '🇴🇲', 8),
('IQ', 'Iraq', 'العراق', '🇮🇶', 9),
('LB', 'Lebanon', 'لبنان', '🇱🇧', 10),
('MA', 'Morocco', 'المغرب', '🇲🇦', 11),
('TN', 'Tunisia', 'تونس', '🇹🇳', 12),
('DZ', 'Algeria', 'الجزائر', '🇩🇿', 13),
('LY', 'Libya', 'ليبيا', '🇱🇾', 14),
('SD', 'Sudan', 'السودان', '🇸🇩', 15),
('YE', 'Yemen', 'اليمن', '🇾🇪', 16),
('SY', 'Syria', 'سوريا', '🇸🇾', 17),
('PS', 'Palestine', 'فلسطين', '🇵🇸', 18),
('other', 'Other', 'أخرى', '🌍', 99);

-- Table: learning_goals
CREATE TABLE learning_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO learning_goals (value, label, label_ar, description, description_ar, icon, display_order) VALUES
('career_switch', 'Switch to ERP career', 'الانتقال لمجال ERP', 'Transition from another field to ERP', 'الانتقال من مجال آخر إلى ERP', '🔄', 1),
('certification', 'Get certified', 'الحصول على شهادة', 'Prepare for official certification exams', 'التحضير لامتحانات الشهادات الرسمية', '📜', 2),
('skill_upgrade', 'Upgrade current skills', 'تطوير المهارات الحالية', 'Enhance existing ERP knowledge', 'تعزيز معرفة ERP الحالية', '📈', 3),
('consulting', 'Consulting career', 'مهنة الاستشارات', 'Become an ERP consultant', 'أن تصبح مستشار ERP', '💼', 4),
('implementation', 'Lead implementations', 'قيادة التطبيقات', 'Lead ERP implementation projects', 'قيادة مشاريع تطبيق ERP', '🚀', 5),
('freelance', 'Freelance work', 'العمل الحر', 'Work as an independent ERP specialist', 'العمل كمتخصص ERP مستقل', '🌐', 6);

-- Table: certifications (for interest tracking)
CREATE TABLE certification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  erp_system_id UUID REFERENCES erp_systems(id),
  is_hot BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO certification_types (value, label, label_ar, is_hot, display_order) VALUES
('oracle_financials', 'Oracle Financials Cloud', 'أوراكل المالية السحابية', TRUE, 1),
('oracle_scm', 'Oracle SCM Cloud', 'أوراكل سلسلة التوريد', FALSE, 2),
('oracle_hcm', 'Oracle HCM Cloud', 'أوراكل رأس المال البشري', FALSE, 3),
('oracle_epm', 'Oracle EPM Cloud', 'أوراكل إدارة الأداء', FALSE, 4),
('sap_fico', 'SAP FICO', 'ساب المالية والتحكم', TRUE, 5),
('sap_mm', 'SAP MM', 'ساب إدارة المواد', FALSE, 6),
('sap_sd', 'SAP SD', 'ساب المبيعات والتوزيع', FALSE, 7),
('sap_hcm', 'SAP HCM', 'ساب رأس المال البشري', FALSE, 8),
('dynamics_finance', 'Dynamics 365 Finance', 'داينمكس 365 المالية', FALSE, 9),
('not_interested', 'Not interested in certification', 'غير مهتم بالشهادات', FALSE, 99);

-- Table: learning_styles
CREATE TABLE learning_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  icon VARCHAR(10),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO learning_styles (value, label, label_ar, description, description_ar, icon, display_order) VALUES
('video', 'Video tutorials', 'دروس فيديو', 'Watch and learn', 'شاهد وتعلم', '🎬', 1),
('reading', 'Documentation & Articles', 'المستندات والمقالات', 'Read and study', 'اقرأ وادرس', '📖', 2),
('hands_on', 'Hands-on practice', 'التطبيق العملي', 'Learn by doing', 'تعلم بالممارسة', '⚡', 3),
('mixed', 'Mixed approach', 'نهج مختلط', 'All of the above', 'كل ما سبق', '🎯', 4);

-- Table: career_timelines
CREATE TABLE career_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO career_timelines (value, label, label_ar, description, description_ar, display_order) VALUES
('asap', 'ASAP', 'في أقرب وقت', 'Actively job hunting', 'أبحث عن عمل بنشاط', 1),
('3_months', '3 months', '3 أشهر', 'Planning a change soon', 'أخطط للتغيير قريباً', 2),
('6_months', '6 months', '6 أشهر', 'Preparing for future', 'أستعد للمستقبل', 3),
('1_year', '1 year', 'سنة واحدة', 'Long-term planning', 'تخطيط طويل المدى', 4),
('exploring', 'Just exploring', 'استكشاف فقط', 'No rush, learning for interest', 'لا استعجال، أتعلم للاهتمام', 5);

-- Table: budget_ranges
CREATE TABLE budget_ranges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  icon VARCHAR(10),
  min_amount DECIMAL(10,2),
  max_amount DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO budget_ranges (value, label, label_ar, icon, min_amount, max_amount, display_order) VALUES
('free', 'Free resources only', 'موارد مجانية فقط', '🆓', 0, 0, 1),
('low', 'Up to $50/month', 'حتى $50/شهر', '💵', 0, 50, 2),
('medium', '$50-150/month', '$50-150/شهر', '💰', 50, 150, 3),
('high', '$150+/month', 'أكثر من $150/شهر', '💎', 150, NULL, 4);

-- Table: referral_sources
CREATE TABLE referral_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value VARCHAR(50) UNIQUE NOT NULL,
  label VARCHAR(100) NOT NULL,
  label_ar VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO referral_sources (value, label, label_ar, display_order) VALUES
('google', 'Google Search', 'بحث جوجل', 1),
('linkedin', 'LinkedIn', 'لينكد إن', 2),
('twitter', 'Twitter/X', 'تويتر/إكس', 3),
('friend', 'Friend or Colleague', 'صديق أو زميل', 4),
('youtube', 'YouTube', 'يوتيوب', 5),
('podcast', 'Podcast', 'بودكاست', 6),
('blog', 'Blog or Article', 'مدونة أو مقال', 7),
('event', 'Conference or Event', 'مؤتمر أو فعالية', 8),
('other', 'Other', 'أخرى', 99);

-- Table: waitlist (for early access signups)
CREATE TABLE waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  country VARCHAR(5),
  interested_erp VARCHAR(50),
  interest_track VARCHAR(30),
  custom_interest VARCHAR(255),
  referral_source VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'invited', 'converted'
  invited_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_status ON waitlist(status);

-- Enable RLS on all tables
ALTER TABLE experience_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE industries ENABLE ROW LEVEL SECURITY;
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE certification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Public read access for lookup tables
CREATE POLICY "Public read access" ON experience_levels FOR SELECT USING (true);
CREATE POLICY "Public read access" ON industries FOR SELECT USING (true);
CREATE POLICY "Public read access" ON countries FOR SELECT USING (true);
CREATE POLICY "Public read access" ON learning_goals FOR SELECT USING (true);
CREATE POLICY "Public read access" ON certification_types FOR SELECT USING (true);
CREATE POLICY "Public read access" ON learning_styles FOR SELECT USING (true);
CREATE POLICY "Public read access" ON career_timelines FOR SELECT USING (true);
CREATE POLICY "Public read access" ON budget_ranges FOR SELECT USING (true);
CREATE POLICY "Public read access" ON referral_sources FOR SELECT USING (true);

-- Waitlist: anyone can insert, only admins can read
CREATE POLICY "Anyone can join waitlist" ON waitlist FOR INSERT WITH CHECK (true);

