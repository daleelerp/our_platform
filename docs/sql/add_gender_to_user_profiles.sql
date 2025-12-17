-- =====================================================
-- ADD GENDER COLUMN TO USER_PROFILES
-- =====================================================

-- Add gender column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS gender VARCHAR(10);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_gender 
ON user_profiles(gender);

-- Add comment
COMMENT ON COLUMN user_profiles.gender IS 'User gender: male, female, or other';

