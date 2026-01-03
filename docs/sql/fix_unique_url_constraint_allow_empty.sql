-- =====================================================
-- Fix: Allow multiple resources with empty URL
-- =====================================================
-- 
-- Issue: The UNIQUE(url) constraint prevents multiple articles with empty URLs.
-- When adding articles without URLs to different milestones, it violates the constraint.
--
-- Solution: Replace the simple UNIQUE constraint with a partial unique index
-- that only enforces uniqueness for non-empty URLs.
--
-- This allows:
-- - Multiple resources with empty URL ("" or NULL)
-- - Only one resource per non-empty URL (prevents duplicates)
-- =====================================================

-- Step 1: Drop the existing unique constraint
ALTER TABLE learning_resources DROP CONSTRAINT IF EXISTS learning_resources_url_key;

-- Step 2: Create a partial unique index that only applies to non-empty URLs
-- This allows multiple resources with empty URLs, but ensures each non-empty URL is unique
CREATE UNIQUE INDEX learning_resources_url_key 
ON learning_resources(url) 
WHERE url IS NOT NULL AND url != '';

-- Note: If you want to allow NULL values as well, you can use:
-- CREATE UNIQUE INDEX learning_resources_url_key 
-- ON learning_resources(url) 
-- WHERE url IS NOT NULL AND url != '' AND url IS NOT NULL;

-- This migration allows:
-- - Multiple articles with empty URL ("") in different milestones
-- - Only one resource per non-empty URL (prevents duplicate URLs)
-- - Same resource can be linked to multiple milestones via milestone_resources table

