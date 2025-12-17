-- =====================================================
-- ADD STUDENT_STATUS COLUMN TO USER_PROFILES
-- =====================================================

-- Add student_status column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS student_status VARCHAR(50);

-- Add foreign key constraint (optional, for referential integrity)
-- ALTER TABLE user_profiles
-- ADD CONSTRAINT fk_user_profiles_student_status 
-- FOREIGN KEY (student_status) 
-- REFERENCES student_status(value);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_student_status 
ON user_profiles(student_status);

-- Add comment
COMMENT ON COLUMN user_profiles.student_status IS 'Current student status or employment situation';

