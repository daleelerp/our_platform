-- =====================================================
-- STUDENT STATUS SCHEMA
-- Table for student status/current situation options
-- =====================================================

-- Table: student_status
-- Purpose: Store student status options for onboarding
CREATE TABLE IF NOT EXISTS student_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    value VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(100) NOT NULL,
    label_ar VARCHAR(100),
    icon VARCHAR(10),
    display_order INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert student status options
INSERT INTO student_status (value, label, label_ar, icon, display_order) VALUES
('undergraduate', 'Undergraduate Student', 'طالب بكالوريوس', '🎓', 1),
('graduate', 'Graduate Student', 'طالب دراسات عليا', '👨‍🎓', 2),
('recent_graduate', 'Recent Graduate (0-1 year)', 'خريج حديث (0-1 سنة)', '🎉', 3),
('early_career', 'Early Career (1-3 years)', 'مبتدئ في المهنة (1-3 سنوات)', '💼', 4),
('career_changer', 'Career Changer', 'تغيير مسار مهني', '🔄', 5),
('unemployed', 'Currently Looking for Work', 'أبحث عن عمل حالياً', '🔍', 6),
('employed', 'Currently Employed', 'موظف حالياً', '💻', 7)
ON CONFLICT (value) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_student_status_display_order ON student_status(display_order);
CREATE INDEX IF NOT EXISTS idx_student_status_is_active ON student_status(is_active);

-- Enable RLS
ALTER TABLE student_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Everyone can read active student status options
CREATE POLICY "Anyone can read active student status"
    ON student_status
    FOR SELECT
    USING (is_active = true);

-- Grant permissions
GRANT SELECT ON student_status TO authenticated;
GRANT SELECT ON student_status TO anon;

