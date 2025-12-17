-- =====================================================
-- FIX PATH_ENROLLMENTS TABLE
-- Add missing columns and fix structure
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add current_milestone_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'path_enrollments' 
        AND column_name = 'current_milestone_id'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD COLUMN current_milestone_id UUID REFERENCES path_milestones(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added current_milestone_id column';
    END IF;

    -- Add current_milestone_number
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'path_enrollments' 
        AND column_name = 'current_milestone_number'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD COLUMN current_milestone_number INTEGER DEFAULT 1;
        RAISE NOTICE 'Added current_milestone_number column';
    END IF;

    -- Add enrolled_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'path_enrollments' 
        AND column_name = 'enrolled_at'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD COLUMN enrolled_at TIMESTAMPTZ DEFAULT NOW();
        RAISE NOTICE 'Added enrolled_at column';
    END IF;

    -- Add notes
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'path_enrollments' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD COLUMN notes TEXT;
        RAISE NOTICE 'Added notes column';
    END IF;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'path_enrollments_user_path_unique'
    ) THEN
        ALTER TABLE path_enrollments 
        ADD CONSTRAINT path_enrollments_user_path_unique 
        UNIQUE(user_id, learning_path_id);
        RAISE NOTICE 'Added unique constraint';
    END IF;

    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS idx_path_enrollments_user_id 
    ON path_enrollments(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_path_enrollments_learning_path_id 
    ON path_enrollments(learning_path_id);
    
    CREATE INDEX IF NOT EXISTS idx_path_enrollments_status 
    ON path_enrollments(status);
    
    CREATE INDEX IF NOT EXISTS idx_path_enrollments_last_accessed_at 
    ON path_enrollments(last_accessed_at);

    RAISE NOTICE 'Migration completed successfully';
END $$;

