-- =====================================================
-- ADD MISSING COLUMN: last_accessed_at
-- Migration script to add last_accessed_at to path_enrollments
-- =====================================================

-- Add the missing column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'path_enrollments' 
        AND column_name = 'last_accessed_at'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD COLUMN last_accessed_at TIMESTAMPTZ;
        
        -- Create index if it doesn't exist
        CREATE INDEX IF NOT EXISTS idx_path_enrollments_last_accessed_at 
        ON path_enrollments(last_accessed_at);
        
        RAISE NOTICE 'Column last_accessed_at added to path_enrollments';
    ELSE
        RAISE NOTICE 'Column last_accessed_at already exists';
    END IF;
END $$;

