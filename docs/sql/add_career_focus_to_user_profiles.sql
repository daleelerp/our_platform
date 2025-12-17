-- =====================================================
-- ADD CAREER_FOCUS COLUMN TO USER_PROFILES
-- =====================================================

-- Add career_focus column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS career_focus VARCHAR(50);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_career_focus 
ON user_profiles(career_focus);

-- Add comment
COMMENT ON COLUMN user_profiles.career_focus IS 'Career focus: technical or business_functional';

