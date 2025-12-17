-- =====================================================
-- ADD MISSING COLUMNS TO admin_credentials TABLE
-- Run this if you get errors about missing columns
-- =====================================================

-- Add failed_login_attempts column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_credentials' 
    AND column_name = 'failed_login_attempts'
  ) THEN
    ALTER TABLE public.admin_credentials 
    ADD COLUMN failed_login_attempts integer DEFAULT 0;
  END IF;
END $$;

-- Add locked_until column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'admin_credentials' 
    AND column_name = 'locked_until'
  ) THEN
    ALTER TABLE public.admin_credentials 
    ADD COLUMN locked_until timestamp with time zone;
  END IF;
END $$;

-- Verify columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'admin_credentials'
ORDER BY ordinal_position;

